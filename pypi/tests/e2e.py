"""End-to-end check against a live endpoint:  python tests/e2e.py [endpoint]
(also honours SCENTO_TEST_ENDPOINT; default is production)."""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ENDPOINT = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("SCENTO_TEST_ENDPOINT")) or "https://www.scento.com/mcp"
# SCENTO_TEST_CMD lets the same test run against an installed console script
CMD = os.environ.get("SCENTO_TEST_CMD", "").split() or [sys.executable, "-m", "scento_perfume_compendium"]
ENV = dict(os.environ, PYTHONPATH=os.path.join(HERE, "..", "src"))


def session(args, messages, raw_lines=()):
    lines = [json.dumps(m) for m in messages] + list(raw_lines)
    res = subprocess.run(CMD + args, input="\n".join(lines) + "\n", capture_output=True, text=True, env=ENV, timeout=120)
    return [json.loads(l) for l in res.stdout.splitlines() if l.strip()], res.stderr


init = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "e2e", "version": "0"}}}
replies, err = session(["--endpoint", ENDPOINT], [
    init,
    {"jsonrpc": "2.0", "method": "notifications/initialized"},
    {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
    {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "perfume-portrait", "arguments": {"perfume": "Tom Ford Oud Wood"}}},
])
by_id = {r["id"]: r for r in replies}
assert len(replies) == 3, "expected 3 replies (notification silent), got %d; stderr: %s" % (len(replies), err)
assert by_id[1]["result"]["serverInfo"]["name"] == "scento-perfume-compendium"
assert len(by_id[2]["result"]["tools"]) == 12, "tools/list must return 12 tools"
call = by_id[3]["result"]
assert call["content"] and not call.get("isError"), "tools/call failed"
print("ok  initialize=%s  tools=%d  call=%s..." % (by_id[1]["result"]["protocolVersion"], len(by_id[2]["result"]["tools"]), str(call["content"][0].get("text", ""))[:80]))

bad, _ = session(["--endpoint", "http://127.0.0.1:1/mcp"], [{"jsonrpc": "2.0", "id": 9, "method": "tools/list"}, {"jsonrpc": "2.0", "method": "x"}], raw_lines=["not json"])
assert next(r for r in bad if r["id"] == 9)["error"]["code"] == -32603
assert any(r["error"]["code"] == -32700 for r in bad), "bad JSON line must yield a parse error"
print("ok  unreachable endpoint -> JSON-RPC error; bad line -> parse error; notification silent")
