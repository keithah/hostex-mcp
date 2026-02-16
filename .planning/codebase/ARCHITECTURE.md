# Architecture

**Analysis Date:** 2026-02-16

## Pattern Overview

**Overall:** Model Context Protocol (MCP) Server - Single-Entry Point Tool Gateway Pattern

**Key Characteristics:**
- Single monolithic source file (`src/index.ts`) exporting server factory function
- Tool-centric architecture: 25+ MCP tools for Hostex API operations
- Multi-transport support via Smithery SDK (stdio and shttp)
- Configuration-driven initialization with schema validation
- Direct client library integration pattern (hostex-ts)

## Layers

**Configuration & Initialization:**
- Purpose: Parse and validate runtime configuration using Zod schemas
- Location: `src/index.ts` (lines 13-32)
- Contains: Config schema definition, Hostex client instantiation
- Depends on: `zod`, `hostex-ts` package
- Used by: Server factory function

**Transport Abstraction:**
- Purpose: Provide multi-transport protocol support (stdio for local clients, shttp for remote clients)
- Location: `.smithery/` build output directories
- Contains: Compiled bundles for stdio and shttp transports
- Depends on: `@smithery/sdk`, `@smithery/cli` (build time)
- Used by: MCP client applications

**Tool Registration Layer:**
- Purpose: Register all MCP tools and their handlers
- Location: `src/index.ts` (lines 34-367)
- Contains: 25+ tool definitions with parameter schemas and async handlers
- Depends on: `@modelcontextprotocol/sdk`, `zod`, `hostex-ts`
- Used by: MCP server execution engine

**API Client Layer:**
- Purpose: Encapsulate Hostex REST API communication
- Location: External package `hostex-ts`
- Contains: HostexClient class with methods for each API resource
- Depends on: HTTP client, Hostex API v3.0.0
- Used by: Tool handlers

## Data Flow

**Tool Execution Flow:**

1. MCP client connects to server via stdio or shttp transport
2. Client sends tool invocation request with parameters
3. Server receives request and dispatches to registered tool handler
4. Tool handler validates parameters using Zod schema
5. Handler calls corresponding `hostexClient` method with validated params
6. HostexClient makes HTTP request to Hostex API
7. Response returned from Hostex API
8. Handler extracts `.data` from response (or returns response directly)
9. Server returns result to MCP client

**Example (list_properties):**
```
Client Request → MCP Server → Tool Handler (hostex_list_properties)
→ Parameter Validation (Zod) → hostexClient.listProperties()
→ Hostex HTTP API → Response → Extract/Format Data → Return to Client
```

**State Management:**
- No persistent state: Server is stateless between tool invocations
- Configuration state: Hostex API token provided at initialization and reused for all requests
- HTTP state: Each tool invocation creates independent HTTP request to Hostex API

## Key Abstractions

**MCP Tool:**
- Purpose: Represent a discrete action (list, create, update, delete, cancel, send, etc.) available to MCP clients
- Examples: `hostex_list_properties`, `hostex_create_reservation`, `hostex_send_message`
- Pattern: Each tool is defined via `server.tool()` with name, description, parameter schema, and async handler

**HostexClient (from hostex-ts):**
- Purpose: Abstract Hostex API HTTP calls into TypeScript methods
- Examples: `listProperties()`, `createReservation()`, `getConversation()`, `updateAvailabilities()`
- Pattern: One method per Hostex API endpoint, handles request/response serialization

**Parameter Schema (Zod):**
- Purpose: Define and validate tool parameters before passing to handlers
- Examples: `z.string()`, `z.number()`, `z.enum()`, `z.array()`, `z.record()`
- Pattern: Zod schemas automatically document parameters and provide runtime validation

## Entry Points

**Server Factory Function:**
- Location: `src/index.ts` (default export, lines 17-371)
- Triggers: Called by Smithery CLI at runtime (for both stdio and shttp builds)
- Responsibilities:
  - Accept configuration object with `accessToken`
  - Create and configure MCP server instance
  - Initialize Hostex API client
  - Register all 25+ tool handlers
  - Return configured server

**Compiled Binaries:**
- **stdio**: `.smithery/stdio/index.cjs` - Executable CLI entry point, used with Claude Desktop
- **shttp**: `.smithery/shttp/index.cjs` - HTTP server, used with remote MCP clients and Smithery hosting

## Error Handling

**Strategy:** Delegated to external libraries with pass-through

**Patterns:**
- Zod validation errors: Caught by MCP SDK, returns validation error to client
- Hostex API errors: Propagated from `hostex-ts` client through tool handler to MCP SDK
- HTTP transport errors: Handled by MCP SDK (stdio/shttp transport layer)
- No custom error handling: All errors bubble up to client

## Cross-Cutting Concerns

**Logging:** None implemented - Smithery SDK and client libraries handle logging independently

**Validation:** Zod schemas validate all tool parameters at execution time before API calls

**Authentication:** API token stored in configuration, passed to HostexClient at initialization, used for all subsequent Hostex API requests
