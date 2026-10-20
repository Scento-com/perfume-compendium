#!/bin/sh
# Ask for the portrait of one perfume.
curl -s https://www.scento.com/mcp -H content-type:application/json -H accept:application/json,text/event-stream \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"perfume-portrait","arguments":{"perfume":"Tom Ford Oud Wood"}}}'
