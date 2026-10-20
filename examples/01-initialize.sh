#!/bin/sh
# Open a session with the Scento Perfume Compendium.
curl -s https://www.scento.com/mcp -H content-type:application/json -H accept:application/json,text/event-stream \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"example","version":"1.0.0"}}}'
