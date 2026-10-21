"""Stdio-to-remote bridge for the Scento Perfume API MCP server.

Reads one JSON-RPC message per line on stdin, forwards it to the remote
streamable-HTTP endpoint and prints each reply as one line on stdout.
"""

import argparse
import json
import os
import re
import sys
import threading
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from . import __version__

DEFAULT_ENDPOINT = "https://www.scento.com/mcp"
REQUEST_TIMEOUT = 60

_out_lock = threading.Lock()
_state = {"protocol": None, "session": None}


def _send(obj):
    line = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    with _out_lock:
        sys.stdout.write(line + "\n")
        sys.stdout.flush()


def _failure(msg_id, code, message):
    _send({"jsonrpc": "2.0", "id": msg_id, "error": {"code": code, "message": message}})


def _warn(text):
    sys.stderr.write("scento-perfume-api: %s\n" % text)
    sys.stderr.flush()


def _request_id(msg):
    """Return (is_request, id) for a decoded message."""
    if isinstance(msg, dict) and "id" in msg and "method" in msg:
        return True, msg["id"]
    return False, None


def _events(text):
    """Server-sent-event body -> list of JSON payload strings."""
    payloads = []
    for block in re.split(r"\r?\n\r?\n", text):
        data = [
            line[5:][1:] if line[5:6] == " " else line[5:]
            for line in re.split(r"\r?\n", block)
            if line.startswith("data:")
        ]
        if data:
            payloads.append("\n".join(data))
    return payloads


def _note_initialize(msg, reply):
    if (
        isinstance(msg, dict)
        and msg.get("method") == "initialize"
        and isinstance(reply, dict)
        and isinstance(reply.get("result"), dict)
        and reply["result"].get("protocolVersion")
    ):
        _state["protocol"] = reply["result"]["protocolVersion"]


def forward(endpoint, line):
    try:
        msg = json.loads(line)
    except ValueError:
        _failure(None, -32700, "Parse error: input line is not valid JSON")
        return
    is_request, msg_id = _request_id(msg)

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "User-Agent": "scento-perfume-api/%s (python)" % __version__,
    }
    if isinstance(msg, dict) and msg.get("method") == "initialize":
        version = (msg.get("params") or {}).get("protocolVersion")
    else:
        version = _state["protocol"]
    if version:
        headers["MCP-Protocol-Version"] = version
    if _state["session"]:
        headers["Mcp-Session-Id"] = _state["session"]

    req = urllib.request.Request(endpoint, data=line.encode("utf-8"), headers=headers, method="POST")
    status, ctype, body = None, "", ""
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as res:
            status = res.status
            ctype = (res.headers.get("Content-Type") or "").lower()
            sid = res.headers.get("Mcp-Session-Id")
            if sid:
                _state["session"] = sid
            body = res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace").strip()[:300]
        message = "Remote server answered HTTP %s%s" % (err.code, ": " + detail if detail else "")
        if is_request:
            _failure(msg_id, -32603, message)
        else:
            _warn(message)
        return
    except Exception as err:  # network, DNS, timeout
        why = getattr(err, "reason", None) or err
        message = "Could not reach %s: %s" % (endpoint, why)
        if is_request:
            _failure(msg_id, -32603, message)
        else:
            _warn(message)
        return

    if status == 202 or not body.strip():
        return  # notification / response accepted, nothing to print

    payloads = _events(body) if "text/event-stream" in ctype else [body.strip()]
    for raw in payloads:
        try:
            reply = json.loads(raw)
        except ValueError:
            if is_request:
                _failure(msg_id, -32603, "Remote server returned a reply that is not valid JSON")
            continue
        for item in reply if isinstance(reply, list) else [reply]:
            _note_initialize(msg, item)
        _send(reply)


def _close_session(endpoint):
    if not _state["session"]:
        return
    req = urllib.request.Request(
        endpoint, headers={"Mcp-Session-Id": _state["session"]}, method="DELETE"
    )
    try:
        urllib.request.urlopen(req, timeout=5).close()
    except Exception:
        pass


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="scento-perfume-api",
        description="Local stdio bridge to the Scento Perfume API MCP server. More: https://www.scento.com/developers",
    )
    parser.add_argument(
        "--endpoint",
        default=os.environ.get("SCENTO_PERFUME_API_ENDPOINT") or os.environ.get("SCENTO_COMPENDIUM_ENDPOINT") or DEFAULT_ENDPOINT,
        help="remote MCP endpoint (default: %s)" % DEFAULT_ENDPOINT,
    )
    parser.add_argument("-v", "--version", action="version", version=__version__)
    args = parser.parse_args(argv)

    if not re.match(r"^https?://", args.endpoint):
        parser.error('invalid endpoint "%s"' % args.endpoint)

    with ThreadPoolExecutor(max_workers=8) as pool:
        for raw in sys.stdin:
            raw = raw.strip()
            if raw:
                pool.submit(_guarded, args.endpoint, raw)
    _close_session(args.endpoint)


def _guarded(endpoint, line):
    try:
        forward(endpoint, line)
    except Exception as err:  # never let a worker die silently
        _warn(str(err))


if __name__ == "__main__":
    main()
