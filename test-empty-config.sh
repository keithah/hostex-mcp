#!/bin/bash

# Kill existing servers
lsof -ti:3002 | xargs kill -9 2>/dev/null
sleep 1

# Start server with empty config on port 3002
PORT=3002 node .smithery/shttp/index.cjs &
SERVER_PID=$!

echo "Server started with PID $SERVER_PID"
sleep 3

# Test with empty config (Smithery scanning)
echo "Testing with empty config..."
curl -X POST "http://localhost:3002/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
  }'

echo ""
echo "Killing server..."
kill $SERVER_PID 2>/dev/null
