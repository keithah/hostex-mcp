#!/usr/bin/env node
import createServer from './src/index.ts';

const config = {
  accessToken: "74zZpdZLuW3FrjGY9VTkXSignV3PyuJlVOguz0HHTsIyrsdvfmXeTdUq8qBtwPNo",
  email: "keith@hadm.net",
  password: "prWgWzA_8REQ"
};

console.log('Testing MCP server initialization...');
console.log('Config:', { ...config, password: '***', accessToken: config.accessToken.substring(0, 10) + '...' });

try {
  const server = await createServer({ config });
  console.log('✓ Server created successfully');
  console.log('Server object type:', typeof server);
  console.log('Server keys:', Object.keys(server));
  process.exit(0);
} catch (error) {
  console.error('✗ Error creating server:', error);
  process.exit(1);
}
