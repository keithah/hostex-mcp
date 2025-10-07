#!/bin/bash

CONFIG='{"accessToken":"74zZpdZLuW3FrjGY9VTkXSignV3PyuJlVOguz0HHTsIyrsdvfmXeTdUq8qBtwPNo","email":"keith@hadm.net","password":"prWgWzA_8REQ"}'
CONFIG_B64=$(echo -n "$CONFIG" | base64)
echo "Config base64: $CONFIG_B64"

curl -X POST "http://localhost:3000/mcp?config=$CONFIG_B64" \
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
