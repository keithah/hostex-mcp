#!/usr/bin/env node

// Test the built MCP server
process.env.accessToken = "74zZpdZLuW3FrjGY9VTkXSignV3PyuJlVOguz0HHTsIyrsdvfmXeTdUq8qBtwPNo";
process.env.email = "keith@hadm.net";
process.env.password = "prWgWzA_8REQ";

console.log('Testing built MCP server...');
console.log('Environment variables set');

// Import the built server
import('./.smithery/shttp/index.cjs')
  .then(() => {
    console.log('✓ Server module loaded successfully');
  })
  .catch(error => {
    console.error('✗ Error loading server:', error);
    process.exit(1);
  });
