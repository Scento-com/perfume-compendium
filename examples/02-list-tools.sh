#!/bin/sh
# List the twelve tools.
curl -s https://www.scento.com/mcp -H content-type:application/json -H accept:application/json,text/event-stream \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
