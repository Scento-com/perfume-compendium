'use strict';
// End-to-end check against a live endpoint:  node test/e2e.js [endpoint]
// (also honours SCENTO_TEST_ENDPOINT; default is production)
const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert');

const bin = process.env.SCENTO_TEST_BIN || path.join(__dirname, '..', 'bin', 'scento-perfume-api.js');
const endpoint = process.argv[2] || process.env.SCENTO_TEST_ENDPOINT || 'https://www.scento.com/mcp';

function session(args, lines, rawLines = []) {
  return new Promise((resolve, reject) => {
    const cmd = bin.endsWith('.js') ? ['node', [bin, ...args]] : [bin, args];
    const child = spawn(cmd[0], cmd[1], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', () => resolve({ replies: out.split('\n').filter(Boolean).map((l) => JSON.parse(l)), err }));
    child.stdin.end(lines.map((l) => JSON.stringify(l)).concat(rawLines).join('\n') + '\n');
  });
}

(async () => {
  const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '0' } } };
  const { replies, err } = await session(['--endpoint', endpoint], [
    init,
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'perfume-portrait', arguments: { perfume: 'Tom Ford Oud Wood' } } },
  ]);
  const byId = Object.fromEntries(replies.map((r) => [r.id, r]));
  assert.strictEqual(replies.length, 3, `expected 3 replies (notification silent), got ${replies.length}; stderr: ${err}`);
  assert.strictEqual(byId[1].result.serverInfo.name, 'scento-perfume-api');
  assert.strictEqual(byId[2].result.tools.length, 12, 'tools/list must return 12 tools');
  const call = byId[3].result;
  assert.ok(call && Array.isArray(call.content) && call.content.length > 0, 'tools/call returned content');
  assert.ok(!call.isError, 'tools/call did not report an error');
  console.log(`ok  initialize=${byId[1].result.protocolVersion}  tools=${byId[2].result.tools.length}  call=${JSON.stringify(call.content[0].text || call.content[0]).slice(0, 80)}...`);

  const bad = await session(['--endpoint', 'http://127.0.0.1:1/mcp'], [{ jsonrpc: '2.0', id: 9, method: 'tools/list' }, { jsonrpc: '2.0', method: 'x' }], ['not json']);
  assert.strictEqual(bad.replies.find((r) => r.id === 9).error.code, -32603);
  assert.ok(bad.replies.some((r) => r.error && r.error.code === -32700), 'bad JSON line must yield a parse error');
  console.log('ok  unreachable endpoint -> JSON-RPC error; bad line -> parse error; notification silent');
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
