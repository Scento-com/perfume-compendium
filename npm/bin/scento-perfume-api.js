#!/usr/bin/env node
'use strict';

// Stdio-to-remote bridge for the Scento Perfume API MCP server.
// Reads one JSON-RPC message per line on stdin, forwards it to the remote
// streamable-HTTP endpoint and prints each reply as one line on stdout.

const readline = require('node:readline');
const pkg = require('../package.json');

const DEFAULT_ENDPOINT = 'https://www.scento.com/mcp';
const DEFAULT_PROTOCOL = '2025-06-18';
const REQUEST_TIMEOUT_MS = 60000;

function parseArgs(argv) {
  const out = { endpoint: process.env.SCENTO_PERFUME_API_ENDPOINT || process.env.SCENTO_COMPENDIUM_ENDPOINT || DEFAULT_ENDPOINT };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--endpoint') out.endpoint = argv[++i];
    else if (a.startsWith('--endpoint=')) out.endpoint = a.slice('--endpoint='.length);
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--version' || a === '-v') out.version = true;
    else {
      process.stderr.write(`scento-perfume-api: unknown option ${a}\n`);
      process.exit(2);
    }
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));

if (opts.help) {
  process.stdout.write(
    `scento-perfume-api ${pkg.version}\n` +
      'Local stdio bridge to the Scento Perfume API MCP server.\n\n' +
      'Usage: npx -y scento-perfume-api [--endpoint <url>]\n\n' +
      `  --endpoint <url>  remote MCP endpoint (default ${DEFAULT_ENDPOINT})\n` +
      '  -v, --version     print the version\n' +
      '  -h, --help        print this help\n\n' +
      'More: https://www.scento.com/developers\n'
  );
  process.exit(0);
}
if (opts.version) {
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

let endpoint;
try {
  endpoint = new URL(opts.endpoint).toString();
} catch {
  process.stderr.write(`scento-perfume-api: invalid endpoint "${opts.endpoint}"\n`);
  process.exit(2);
}

let protocolVersion = null; // learned from the initialize reply
let sessionId = null; // only set if the server hands one out
const inflight = new Set();

function send(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function failure(id, code, message) {
  send({ jsonrpc: '2.0', id: id === undefined ? null : id, error: { code, message } });
}

function requestId(msg) {
  return msg && typeof msg === 'object' && !Array.isArray(msg) && 'id' in msg && msg.method ? msg.id : undefined;
}

function noteInitialize(msg, reply) {
  if (msg && msg.method === 'initialize' && reply && reply.result && reply.result.protocolVersion) {
    protocolVersion = reply.result.protocolVersion;
  }
}

// Server-sent-event body -> array of JSON payloads (one per `data:` event).
function readEvents(text) {
  const payloads = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).replace(/^ /, ''))
      .join('\n');
    if (data) payloads.push(data);
  }
  return payloads;
}

async function forward(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    failure(null, -32700, 'Parse error: input line is not valid JSON');
    return;
  }
  const id = requestId(msg);
  const isInit = msg && msg.method === 'initialize';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': `scento-perfume-api/${pkg.version} (node)`,
  };
  const version = isInit ? msg.params && msg.params.protocolVersion : protocolVersion;
  if (version) headers['MCP-Protocol-Version'] = version;
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  let res;
  let body;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: line,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    body = await res.text();
  } catch (err) {
    const why = err && err.name === 'TimeoutError' ? 'request timed out' : (err && err.message) || String(err);
    if (id !== undefined) failure(id, -32603, `Could not reach ${endpoint}: ${why}`);
    else process.stderr.write(`scento-perfume-api: ${why}\n`);
    return;
  }

  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;

  if (res.status === 202 || (res.ok && body.trim() === '')) return; // notification / response accepted

  if (!res.ok) {
    const detail = body.trim().slice(0, 300);
    const message = `Remote server answered HTTP ${res.status}${detail ? `: ${detail}` : ''}`;
    if (id !== undefined) failure(id, -32603, message);
    else process.stderr.write(`scento-perfume-api: ${message}\n`);
    return;
  }

  const type = (res.headers.get('content-type') || '').toLowerCase();
  const payloads = type.includes('text/event-stream') ? readEvents(body) : [body.trim()];
  for (const raw of payloads) {
    let reply;
    try {
      reply = JSON.parse(raw);
    } catch {
      if (id !== undefined) failure(id, -32603, 'Remote server returned a reply that is not valid JSON');
      continue;
    }
    for (const r of Array.isArray(reply) ? reply : [reply]) noteInitialize(msg, r);
    send(reply);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  const job = forward(line).catch((err) => {
    process.stderr.write(`scento-perfume-api: ${(err && err.message) || err}\n`);
  });
  inflight.add(job);
  job.finally(() => inflight.delete(job));
});
rl.on('close', async () => {
  await Promise.all([...inflight]);
  if (sessionId) {
    try {
      await fetch(endpoint, { method: 'DELETE', headers: { 'Mcp-Session-Id': sessionId }, signal: AbortSignal.timeout(5000) });
    } catch {
      /* best effort */
    }
  }
  process.exit(0);
});
