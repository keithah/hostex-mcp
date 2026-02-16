# Technology Stack

**Analysis Date:** 2026-02-16

## Languages

**Primary:**
- TypeScript 5.7.2 - All source code and server implementation

**Secondary:**
- JavaScript (CommonJS) - Built output for distribution (`.smithery/stdio/index.cjs`, `.smithery/shttp/index.cjs`)
- Shell - Build scripts and CLI shebang

## Runtime

**Environment:**
- Node.js >= 18 (current development: v24.8.0)

**Package Manager:**
- npm 11.6.0
- Lockfile: `package-lock.json` (v3, present)

## Frameworks

**Core:**
- @modelcontextprotocol/sdk 1.0.4 - MCP server protocol implementation
- @smithery/sdk 1.6.6 - Multi-transport support (stdio and streamable HTTP)

**Build/Dev:**
- @smithery/cli 1.4.2 - MCP build tooling and dev server
- TypeScript 5.7.2 - Type checking and transpilation

## Key Dependencies

**Critical:**
- hostex-ts 0.1.1 - TypeScript client library for Hostex API v3.0.0 (property management API access)
- zod 3.25.76 - Schema validation and type inference for tool parameters and configuration

**Infrastructure:**
- @types/node 22.10.2 - TypeScript type definitions for Node.js runtime APIs

## Configuration

**Environment:**
- Configured via Zod schema (`configSchema`) in `src/index.ts`
- Single required environment variable: `HOSTEX_ACCESS_TOKEN` (Hostex API access token)
- Passed through MCP configuration at runtime

**Build:**
- `tsconfig.json` - TypeScript compiler configuration
  - Target: ES2022
  - Module: Node16 (with moduleResolution: Node16)
  - Strict mode enabled
  - Output directory: `./build`
  - Source directory: `./src`

**Build Output:**
- `package.json` specifies bin entry: `.smithery/stdio/index.cjs` with shebang
- Two transport builds: stdio (default, used for CLI) and shttp (HTTP streaming)

## Platform Requirements

**Development:**
- Node.js >= 18
- npm (v6+ supported)
- TypeScript 5.7.2
- Source maps and strict TypeScript checking enabled

**Production:**
- Node.js >= 18
- Deployable as:
  - stdio transport: CLI tool (`npx hostex-mcp`)
  - shttp transport: HTTP server (via Smithery hosted at `https://server.smithery.ai/@keithah/hostex-mcp/mcp`)
  - Standalone npm package installation

## Build & Distribution

**Scripts:**
- `build`: Builds stdio transport (default)
- `build:stdio`: Builds CommonJS for stdio transport with shebang
- `build:shttp`: Builds CommonJS for streamable HTTP transport
- `build:all`: Builds both transports
- `prepare`: npm hook that builds stdio transport before package operations
- `dev`: Starts Smithery dev server for local testing
- `watch`: TypeScript watch mode for development

**Distribution:**
- Published as npm package `hostex-mcp`
- Also distributed as Smithery MCPB (MCP Bundle) packages
- Supports multiple installation methods (npx, MCPB, manual config)

---

*Stack analysis: 2026-02-16*
