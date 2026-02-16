# Codebase Structure

**Analysis Date:** 2026-02-16

## Directory Layout

```
hostex-mcp/
├── src/                           # TypeScript source code
│   └── index.ts                   # Main MCP server factory (only source file)
├── .smithery/                     # Built artifacts and transport-specific bundles
│   ├── stdio/                     # stdio transport bundle (CLI/Claude Desktop)
│   │   └── index.cjs              # Compiled executable for local clients
│   └── shttp/                     # shttp transport bundle (HTTP/remote clients)
│       └── index.cjs              # Compiled HTTP server
├── .planning/                     # Planning and documentation
│   └── codebase/                  # Codebase analysis documents
├── .github/                       # GitHub configuration
│   └── workflows/                 # CI/CD workflows
├── package.json                   # Project manifest and dependencies
├── package-lock.json              # Locked dependency versions
├── tsconfig.json                  # TypeScript compiler configuration
├── smithery.yaml                  # Smithery runtime configuration
├── README.md                      # Project documentation
└── LICENSE                        # MIT license
```

## Directory Purposes

**src/**
- Purpose: Single-file TypeScript source implementing the MCP server
- Contains: Zod schema definitions, tool registrations, server factory
- Key files: `src/index.ts`

**.smithery/stdio/**
- Purpose: Pre-built CommonJS bundle for stdio transport
- Contains: Compiled and minified MCP server executable
- Generated: Yes (via `npm run build:stdio`)
- Committed: Yes
- Invoked: `hostex-mcp` CLI command or `.smithery/stdio/index.cjs` directly

**.smithery/shttp/**
- Purpose: Pre-built CommonJS bundle for streamable HTTP transport
- Contains: Compiled and minified MCP server as HTTP service
- Generated: Yes (via `npm run build:shttp`)
- Committed: Yes
- Invoked: Smithery hosted platform or custom deployment

**.planning/codebase/**
- Purpose: Codebase analysis documents (architecture, conventions, etc.)
- Contains: Markdown analysis files for GSD command system
- Generated: No (manually created by analysis tools)
- Committed: Yes

**.github/workflows/**
- Purpose: CI/CD automation
- Contains: Release workflow, dependency check workflow
- Key files: Automatic hostex-ts update checks and MCPB builds

## Key File Locations

**Entry Points:**
- `src/index.ts`: TypeScript source - exported as default ES module server factory
- `.smithery/stdio/index.cjs`: Compiled stdio executable with shebang for direct execution
- `.smithery/shttp/index.cjs`: Compiled shttp HTTP server executable

**Configuration:**
- `package.json`: Dependencies, build scripts, project metadata
- `tsconfig.json`: TypeScript compiler options (ES2022 target, strict mode)
- `smithery.yaml`: Smithery CLI configuration (runtime: typescript)
- `README.md`: Installation and usage documentation

**Deployment:**
- `.smithery/stdio/index.cjs`: Distributed as `hostex-mcp` npm package bin entry
- `.smithery/shttp/index.cjs`: Used by Smithery hosted deployment at `server.smithery.ai`

## Naming Conventions

**Files:**
- `index.ts`: Standard Node.js entry point convention
- `index.cjs`: CommonJS compiled output, mirrors source structure
- `*.md`: Documentation files

**Directories:**
- `src/`: Source code (TypeScript convention)
- `.smithery/`: Hidden directory (convention for generated/build artifacts)
- `.planning/codebase/`: Analysis documentation location

## Where to Add New Code

**New Feature (Tool):**
- Primary code: `src/index.ts` - Add new `server.tool()` call
- Schema: Define Zod schema inline within tool call (lines 34-367)
- Handler: Implement async handler calling `hostexClient.methodName()`
- Example: See `hostex_list_properties` tool (lines 35-47) for pattern

**New Utility Function:**
- Shared helpers: `src/index.ts` - Tools are co-located with factory
- Consider extracting to separate module only if: Tool definitions exceed 500 lines OR helper logic is reusable across multiple handlers

**Changes to Configuration:**
- Schema: Update `configSchema` in `src/index.ts` (lines 13-15)
- Initialization: Update server factory function parameters (lines 17-32)

**Build Artifacts:**
- DO NOT edit `.smithery/*/index.cjs` directly
- DO NOT commit uncompiled changes
- Run `npm run build:stdio` or `npm run build:shttp` to regenerate from `src/index.ts`

## Special Directories

**node_modules/**
- Purpose: npm dependency installation
- Generated: Yes (npm install)
- Committed: No (.gitignore)

**.git/**
- Purpose: Git repository metadata
- Generated: Yes (git init)
- Committed: N/A

**.github/workflows/**
- Purpose: GitHub Actions CI/CD automation
- Key workflow: Auto-update hostex-ts dependency and rebuild

## Key Dependencies

**Runtime (must-have):**
- `@modelcontextprotocol/sdk` (^1.0.4): MCP protocol implementation
- `@smithery/sdk` (^1.6.6): Multi-transport support
- `hostex-ts` (^0.1.1): Hostex API client
- `zod` (^3.25.76): Parameter schema validation

**Build-time (development):**
- `@smithery/cli` (^1.4.2): Build tool for creating transport-specific bundles
- `typescript` (^5.7.2): TypeScript compiler
- `@types/node` (^22.10.2): Node.js type definitions

## Build Pipeline

**Development:**
```bash
npm run dev              # Start Smithery dev server (hot reload)
npm run watch           # Watch TypeScript compilation
```

**Build (required before publishing):**
```bash
npm run build:stdio     # Build stdio transport bundle → .smithery/stdio/index.cjs
npm run build:shttp     # Build shttp transport bundle → .smithery/shttp/index.cjs
npm run build:all       # Build both transports
```

**Prepare for distribution:**
```bash
npm run prepare          # Automatically called by npm install/publish
                         # Builds stdio transport
                         # Adds shebang to make executable
```

The compiled `.smithery/` bundles are the only files distributed in the npm package (see `files` in package.json).

## TypeScript Configuration

**Source:**
- `rootDir`: `./src` - Only source directory
- `outDir`: `./build` - Not used (Smithery handles compilation)

**Compile target:**
- `target`: ES2022 (modern Node.js)
- `module`: Node16 (ESM with CommonJS interop)
- `strict`: true (strict type checking enabled)

**Strict settings:**
- Force consistent casing in file names
- Require explicit any types
- Skip library type checking
