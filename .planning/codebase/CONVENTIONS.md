# Coding Conventions

**Analysis Date:** 2026-02-16

## Naming Patterns

**Files:**
- Single file approach: `index.ts` - Single entry point for entire MCP server
- Extension: TypeScript files use `.ts` extension

**Functions:**
- Descriptive camelCase: `createServer`, `listProperties`, `updateAvailabilities`
- Tool handlers use consistent verb-noun pattern: `list*`, `get*`, `create*`, `update*`, `delete*`
- Configuration: `configSchema` (PascalCase for schema exports)

**Variables:**
- camelCase for local variables: `server`, `hostexClient`, `result`, `offset`, `limit`
- Environment/config variables extracted via config parameter destructuring

**Types:**
- Imported from `zod` library using z namespace: `z.object()`, `z.string()`, `z.number()`
- Type inference via `z.infer<typeof configSchema>` pattern
- Enum values use snake_case: `'wait_accept'`, `'wait_pay'`, `'accepted'`

## Code Style

**Formatting:**
- No explicit formatter config present (no .prettierrc, biome.json, or eslint.config.js)
- Code uses consistent indentation (2 spaces)
- Lines generally under 100 characters

**Linting:**
- No explicit linter configuration in project root
- TypeScript compiler configured with strict mode enabled (tsconfig.json: `"strict": true`)
- Compiler options enforce: `forceConsistentCasingInFileNames`, `esModuleInterop`

## Import Organization

**Order:**
1. External SDK imports: `@modelcontextprotocol/sdk`
2. Library imports: `zod`
3. Custom client libraries: `hostex-ts`

**Path Aliases:**
- None detected - uses direct imports only
- All imports use ES module syntax: `import { } from 'package'`

**Example from `src/index.ts`:**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HostexClient } from 'hostex-ts';
```

## Error Handling

**Patterns:**
- Direct async/await usage without explicit error wrapping
- Tool handlers use `async` functions returning results directly
- No try/catch blocks in visible code - delegates to MCP framework error handling
- `as any` type casting used for parameter flexibility: `params as any`, `data as any`

**Example from tool handlers:**
```typescript
async (params) => {
  const result = await hostexClient.listReservations(params as any);
  return result.data;
}
```

## Logging

**Framework:** Not detected - no logging library imported

**Patterns:**
- No explicit logging in source code
- Console-based error output expected to come from MCP framework
- Silent on success pattern

## Comments

**When to Comment:**
- File-level documentation with JSDoc style header comment
- Inline comments for tool registration blocks explaining functionality
- Comments precede tool registration blocks describing tool purpose

**JSDoc/TSDoc:**
- File-level JSDoc present: `/** Hostex MCP Server ... */`
- Tool descriptions provided inline via second parameter to `server.tool()` method
- Parameter descriptions provided via zod schema `.describe()` method

**Example:**
```typescript
/**
 * Hostex MCP Server
 * Model Context Protocol server for Hostex property management API
 * Supports both stdio and streamable HTTP transports via Smithery
 */
```

## Function Design

**Size:**
- Tool handler functions are small (single line to few lines)
- Single responsibility: extract params, call API, return result
- No complex business logic in handlers

**Parameters:**
- Destructuring pattern for named parameters: `{ offset, limit, id }`
- Optional parameters via zod: `.optional().describe(...)`
- Type validation handled by zod schemas at registration time

**Return Values:**
- API response data extraction: `result.data` (most tools)
- Direct result return: `return result` (some mutation operations)
- Consistent pattern based on API response structure

## Module Design

**Exports:**
- Default export: server factory function `createServer()`
- Named export: `configSchema` for configuration validation
- Server factory pattern: function receives config, returns initialized server

**Example:**
```typescript
export const configSchema = z.object({
  accessToken: z.string().describe("Your Hostex API access token"),
});

export default function createServer({
  config
}: {
  config: z.infer<typeof configSchema>
}) {
  // Initialize and configure server
  return server.server;
}
```

**Barrel Files:** Not used - single monolithic file approach

## TypeScript Configuration

**Target:** ES2022
**Module System:** Node16 with ES module resolution
**Strict Mode:** Enabled - all checks enforced
**Declaration:** Enabled - generates `.d.ts` files

## API Integration Patterns

**Tool Registration:**
- Consistent method: `server.tool(name, description, parameters, handler)`
- Parameters defined as zod schema object
- Each tool is separate, not grouped

**Zod Schema Pattern:**
```typescript
{
  property_name: z.type().optional().describe("Description"),
  required_prop: z.type().describe("Description")
}
```

## Configuration Pattern

**Environment Variables:**
- Passed via config object to factory function
- Validated by zod schema before use
- Schema includes `.describe()` for documentation

---

*Convention analysis: 2026-02-16*
