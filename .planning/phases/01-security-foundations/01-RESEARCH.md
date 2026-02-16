# Phase 1: Security Foundations & Critical Fixes - Research

**Researched:** 2026-02-16
**Domain:** MCP server security, dependency management, error handling, structured logging
**Confidence:** HIGH

## Summary

Phase 1 addresses critical security vulnerabilities and establishes foundational error handling for the hostex-mcp server. The research confirms that upgrading from MCP SDK 1.0.4 to 1.27.0 resolves three high-severity vulnerabilities (DNS rebinding, ReDoS, and cross-client data leakage). Zod v4 migration introduces breaking changes but is required as a peer dependency for SDK 1.27.0. The current codebase has 22 tool handlers with no error handling, creating crash risk. Structured logging must route exclusively to stderr to prevent stdout contamination (Error -32000).

**Primary recommendation:** Upgrade dependencies first (SDK + Zod), then implement error handling wrappers for all tools, followed by structured logging to stderr and enhanced input validation with Zod schemas.

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.27.0 | MCP protocol implementation | Official TypeScript SDK, fixes 3 high-severity CVEs |
| zod | 4.x | Schema validation | Required peer dependency for SDK 1.27.0, industry standard |
| pino | ^9.x | Structured logging | 5x faster than Winston, minimal overhead, JSON output |
| @smithery/sdk | ^1.6.6 | Transport abstraction | Current version, supports stdio/HTTP transports |

### Vulnerability Resolutions

**Current vulnerabilities (npm audit findings):**
- @modelcontextprotocol/sdk 1.0.4 has 3 HIGH severity issues:
  - GHSA-w48q-cv73-mx4w: DNS rebinding protection not enabled by default (<1.24.0)
  - GHSA-8r9q-7v3j-jr4g: ReDoS vulnerability in UriTemplate regex (<1.25.2)
  - GHSA-345p-7cg4-v4c7: Cross-client data leak via shared instances (1.10.0-1.25.3, fixed in 1.26.0)
- body-parser 2.2.0: GHSA-wqch-xfxh-vrr4 DoS via URL encoding (MODERATE, transitive via Express)
- lodash 4.17.21: CVE-2025-13465 prototype pollution in _.unset/_.omit (MODERATE, transitive via @smithery/cli)
- qs 6.14.0: CVE-2025-15284 arrayLimit bypass DoS via bracket notation (HIGH, transitive via Express)

**Resolution strategy:**
1. SDK update to 1.27.0 resolves all 3 MCP SDK vulnerabilities
2. body-parser/qs are transitive dependencies - will resolve when Express updates (no direct action needed)
3. lodash is transitive via @smithery/cli - monitor for @smithery/cli update

**Installation:**
```bash
# Update core dependencies
npm install @modelcontextprotocol/sdk@^1.27.0 zod@^4.0.0 pino@^9.0.0

# Verify vulnerabilities resolved
npm audit
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── index.ts              # Main server factory
├── tools/                # Tool implementations (future organization)
│   ├── properties.ts
│   ├── reservations.ts
│   └── conversations.ts
├── lib/                  # Shared utilities
│   ├── error-handler.ts  # Tool error wrapper
│   ├── logger.ts         # Pino logger instance
│   └── validation.ts     # Zod schema helpers
└── types/                # TypeScript type definitions
```

### Pattern 1: Tool Error Wrapper

**What:** Higher-order function that wraps async tool handlers with try-catch and returns standardized error responses

**When to use:** All 22 tool handlers must be wrapped to prevent server crashes

**Example:**
```typescript
// Source: https://mcpcat.io/guides/error-handling-custom-mcp-servers/
import { logger } from './lib/logger.js';

export function withErrorHandling<TArgs, TResult>(
  toolName: string,
  handler: (args: TArgs) => Promise<TResult>
) {
  return async (args: TArgs) => {
    const startTime = Date.now();

    try {
      logger.info({ tool: toolName, args }, 'Tool invoked');

      const result = await handler(args);

      logger.info({
        tool: toolName,
        duration: Date.now() - startTime
      }, 'Tool completed');

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: false
      };
    } catch (error) {
      logger.error({
        tool: toolName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime
      }, 'Tool failed');

      // Return user-friendly error message to LLM
      const errorMessage = error instanceof Error
        ? `Failed to ${toolName}: ${error.message}. Please check your parameters and try again.`
        : `An unexpected error occurred in ${toolName}.`;

      return {
        content: [{ type: "text", text: errorMessage }],
        isError: true
      };
    }
  };
}

// Usage
server.tool(
  "hostex_list_properties",
  "List properties from your Hostex account",
  schema,
  withErrorHandling("hostex_list_properties", async ({ offset, limit, id }) => {
    const result = await hostexClient.listProperties({ offset, limit, id });
    return result.data;
  })
);
```

### Pattern 2: Structured Logging to stderr

**What:** Configure Pino to write JSON logs exclusively to stderr, never stdout

**When to use:** All logging must go to stderr to prevent MCP protocol corruption

**Example:**
```typescript
// lib/logger.ts
// Source: https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Pino writes to process.stdout by default, redirect to stderr
  transport: {
    target: 'pino/file',
    options: { destination: 2 } // 2 = stderr file descriptor
  },
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    serverName: 'hostex-mcp',
    pid: process.pid
  }
});

// Alternative direct approach (no transport)
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { serverName: 'hostex-mcp' }
}, pino.destination(2)); // Write directly to stderr
```

### Pattern 3: Configuration Validation at Startup

**What:** Validate config schema synchronously at startup, fail-fast with descriptive errors

**When to use:** Before initializing any clients or registering tools

**Example:**
```typescript
// Source: https://www.stainless.com/mcp/error-handling-and-debugging-mcp-servers
import { z } from "zod";

// Zod v4: Error customization uses unified 'error' parameter
export const configSchema = z.object({
  accessToken: z.string()
    .min(1, { error: "Hostex API access token is required" })
    .describe("Your Hostex API access token"),
});

export default function createServer({
  config
}: {
  config: z.infer<typeof configSchema>
}) {
  // Validate configuration immediately
  try {
    configSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Configuration validation failed: ${errorMessage}`);
    }
    throw error;
  }

  // Config is valid, proceed with server initialization
  const server = new McpServer({
    name: "hostex-mcp",
    version: "0.3.0"
  });

  // ... rest of server setup
}
```

### Pattern 4: Enhanced Input Validation

**What:** Add constraints to Zod schemas (max limits, regex patterns, date ranges)

**When to use:** All tool input parameters should enforce realistic constraints

**Example:**
```typescript
// Source: https://zod.dev/api
import { z } from "zod";

// Zod v4: Date validation uses z.iso.date() for YYYY-MM-DD format
const listPropertiesSchema = {
  offset: z.number()
    .int({ error: "Offset must be an integer" })
    .min(0, { error: "Offset cannot be negative" })
    .optional()
    .describe("Starting point for results (default: 0)"),

  limit: z.number()
    .int({ error: "Limit must be an integer" })
    .min(1, { error: "Limit must be at least 1" })
    .max(100, { error: "Limit cannot exceed 100 (API maximum)" })
    .optional()
    .describe("Maximum results to return, max 100 (default: 20)"),

  id: z.number()
    .int({ error: "Property ID must be an integer" })
    .positive({ error: "Property ID must be positive" })
    .optional()
    .describe("Filter by specific property ID"),
};

const listReservationsSchema = {
  reservation_code: z.string()
    .regex(/^[A-Z0-9-]+$/, { error: "Invalid reservation code format" })
    .optional(),

  property_id: z.number().int().positive().optional(),

  status: z.enum(['wait_accept', 'wait_pay', 'accepted', 'cancelled', 'denied', 'timeout'])
    .optional(),

  // Zod v4: z.iso.date() validates YYYY-MM-DD format
  start_check_in_date: z.iso.date()
    .optional()
    .describe("Check-in start date (YYYY-MM-DD)"),

  end_check_in_date: z.iso.date()
    .optional()
    .describe("Check-in end date (YYYY-MM-DD)"),

  // Add custom validation for date range logic
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional(),
};
```

### Anti-Patterns to Avoid

- **Throwing exceptions from tool handlers:** Causes server crashes. Always catch and return `{ isError: true }` instead
- **Logging to stdout with console.log():** Corrupts MCP JSON-RPC protocol, causes Error -32000. Use logger to stderr
- **Sharing server instances across connections:** SDK 1.26.0+ fixes this, but pattern remains anti-pattern
- **Validation after API calls:** Validate input parameters before calling Hostex API to provide clear error messages
- **Generic error messages:** "Error occurred" doesn't help LLM recover. Provide actionable guidance: "Property ID must be a positive integer. Please provide a valid ID."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured logging | Custom log formatter with timestamps/levels | Pino | JSON formatting, log levels, performance optimization, stderr routing, 5x faster than alternatives |
| Schema validation | Manual type checking with if/else | Zod | Type inference, composable schemas, error messages, runtime + compile-time safety |
| Error categorization | Custom error classes hierarchy | Tool wrapper + isError flag | MCP protocol expects isError flag, LLM needs errors in context window not thrown |
| Date validation | Regex + manual Date parsing | z.iso.date() in Zod v4 | Handles YYYY-MM-DD format, validates realistic dates, provides clear error messages |
| Configuration management | Manual env variable parsing | Zod config schema | Validation at startup, type safety, fail-fast on misconfiguration |

**Key insight:** MCP servers have unique constraints (stdout is sacred, errors are LLM context) that make custom solutions worse than ecosystem libraries. Pino's stderr routing and Zod's validation messages are purpose-built for these patterns.

## Common Pitfalls

### Pitfall 1: Stdout Contamination Causing Error -32000

**What goes wrong:** Using `console.log()` or writing debug output to stdout breaks MCP's stdio transport, resulting in "Error -32000: Connection closed" or "parse error" messages from clients

**Why it happens:** MCP's stdio transport uses stdout exclusively for JSON-RPC messages. Any non-protocol output corrupts the message stream. `console.log()` writes to stdout by default

**How to avoid:**
- Configure Pino to write to stderr (file descriptor 2)
- Replace all `console.log()` calls with `logger.info()`
- Use `console.error()` for any remaining console output (it writes to stderr)
- Never use `process.stdout.write()` for anything except MCP protocol messages

**Warning signs:**
- Client reports "Connection closed" immediately after tool invocation
- Error -32000 appears in client logs
- Server appears to work but client can't parse responses

### Pitfall 2: Unhandled Promise Rejections Crashing Server

**What goes wrong:** Async tool handlers that throw errors crash the entire MCP server process, disconnecting all active clients

**Why it happens:** Node.js terminates process on unhandled promise rejections by default. The current 22 tool handlers have no try-catch blocks

**How to avoid:**
- Wrap ALL tool handlers with `withErrorHandling()` wrapper
- Never throw from async handlers, always return `{ isError: true }`
- Add process-level handler as safety net: `process.on('unhandledRejection', logger.error)`

**Warning signs:**
- Server process exits unexpectedly
- Logs show "UnhandledPromiseRejectionWarning"
- Client sees connection drop mid-operation

### Pitfall 3: Zod v3 to v4 Breaking Changes in String Validators

**What goes wrong:** Code using `z.string().email()`, `z.string().uuid()`, or `z.string().date()` breaks after upgrading to Zod v4

**Why it happens:** Zod v4 moved string format validators from methods to top-level functions: `z.email()`, `z.uuid()`, `z.iso.date()`

**How to avoid:**
- Use codemod: `npx zod-v3-to-v4` for automated migration
- Update manually: `z.string().date()` → `z.iso.date()`
- Review optional field behavior: defaults now apply inside `.optional()` in v4

**Warning signs:**
- TypeScript errors: "Property 'date' does not exist on type 'ZodString'"
- Runtime errors: "z.string(...).date is not a function"
- Unexpected default values appearing in optional fields

### Pitfall 4: Transitive Dependency Vulnerabilities

**What goes wrong:** npm audit shows vulnerabilities in lodash and qs despite not being direct dependencies

**Why it happens:** @smithery/cli depends on lodash 4.17.21 (has CVE-2025-13465), Express depends on qs 6.14.0 and body-parser 2.2.0

**How to avoid:**
- Don't add npm overrides/resolutions - transitive deps are toolkit responsibility
- Monitor @smithery/cli for updates that resolve lodash vulnerability
- Express 5.1.0's body-parser/qs issues are MODERATE severity, non-blocking
- Document transitive vulns in verification plan, track for future updates

**Warning signs:**
- npm audit shows vulnerabilities after SDK update
- All vulnerabilities are "via" another package (transitive)
- No fix available through direct dependency updates

### Pitfall 5: SDK v2 Migration Risk (Q1 2026)

**What goes wrong:** MCP SDK v2 release expected Q1 2026 will introduce breaking changes to import paths

**Why it happens:** v2 restructures imports into `@modelcontextprotocol/server` and `@modelcontextprotocol/node` packages

**How to avoid:**
- Complete v1.27.0 upgrade in this phase
- Plan separate v2 migration phase when stable release arrives
- v1.x receives 6 months of bug fixes/security updates after v2 ships
- Don't delay v1.27.0 upgrade waiting for v2

**Warning signs:**
- Package manager shows v2.x pre-release versions
- TypeScript errors about import paths
- Documentation references @modelcontextprotocol/server package

### Pitfall 6: Missing Input Constraints Enable DoS

**What goes wrong:** API accepts unbounded offset/limit values, large property_ids arrays, or unrealistic date ranges, causing performance degradation

**Why it happens:** Current schemas use `z.number().optional()` without min/max constraints

**How to avoid:**
- Enforce API limits in schema: `limit: z.number().max(100)` (Hostex API maximum)
- Add reasonable defaults: `offset: z.number().min(0).default(0)`
- Validate array lengths: `property_ids: z.array(z.number()).max(100)`
- Use `z.iso.date()` for date format validation

**Warning signs:**
- Tool calls hang with large offset values
- API rate limiting triggers unexpectedly
- Error messages from Hostex API about parameter limits

## Code Examples

Verified patterns from official sources:

### Complete Tool Handler with Error Handling and Logging

```typescript
// Source: Synthesized from https://mcpcat.io/guides/error-handling-custom-mcp-servers/
// and https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import pino from "pino";

// Configure logger to stderr
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { serverName: 'hostex-mcp', pid: process.pid }
}, pino.destination(2)); // stderr

// Tool error wrapper
function withErrorHandling<TArgs, TResult>(
  toolName: string,
  handler: (args: TArgs) => Promise<TResult>
) {
  return async (args: TArgs) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    try {
      logger.info({
        tool: toolName,
        requestId,
        args
      }, 'Tool invoked');

      const result = await handler(args);

      logger.info({
        tool: toolName,
        requestId,
        duration: Date.now() - startTime
      }, 'Tool completed successfully');

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: false
      };

    } catch (error) {
      const errorDetails = {
        tool: toolName,
        requestId,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };

      logger.error(errorDetails, 'Tool execution failed');

      // Provide actionable error message for LLM
      const userMessage = error instanceof Error
        ? `Operation failed: ${error.message}. Please verify your parameters and try again.`
        : `An unexpected error occurred while executing ${toolName}.`;

      return {
        content: [{ type: "text", text: userMessage }],
        isError: true
      };
    }
  };
}

// Enhanced schema with constraints (Zod v4 syntax)
const listPropertiesSchema = {
  offset: z.number()
    .int({ error: "Offset must be an integer" })
    .min(0, { error: "Offset cannot be negative" })
    .optional()
    .describe("Starting point for results (default: 0)"),

  limit: z.number()
    .int({ error: "Limit must be an integer" })
    .min(1, { error: "Limit must be at least 1" })
    .max(100, { error: "Limit cannot exceed 100 (API maximum)" })
    .optional()
    .describe("Maximum results to return, max 100 (default: 20)"),

  id: z.number()
    .int({ error: "Property ID must be an integer" })
    .positive({ error: "Property ID must be positive" })
    .optional()
    .describe("Filter by specific property ID"),
};

// Tool registration with wrapper
server.tool(
  "hostex_list_properties",
  "List properties from your Hostex account. Returns property details including ID, title, address, channels, and location coordinates.",
  listPropertiesSchema,
  withErrorHandling("hostex_list_properties", async ({ offset, limit, id }) => {
    const result = await hostexClient.listProperties({ offset, limit, id });
    return result.data;
  })
);
```

### Configuration Validation at Startup

```typescript
// Source: https://www.stainless.com/mcp/error-handling-and-debugging-mcp-servers
import { z } from "zod";
import { logger } from "./lib/logger.js";

// Zod v4: Uses unified 'error' parameter for custom messages
export const configSchema = z.object({
  accessToken: z.string()
    .min(1, { error: "Hostex API access token is required. Set the 'accessToken' configuration parameter." })
    .describe("Your Hostex API access token"),
});

export default function createServer({
  config
}: {
  config: z.infer<typeof configSchema>
}) {
  // Validate configuration - fail fast on startup
  try {
    configSchema.parse(config);
    logger.info({ config: { accessToken: '***' } }, 'Configuration validated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');

      logger.error({ validationErrors: errors }, 'Configuration validation failed');
      throw new Error(`Invalid configuration: ${errors}`);
    }
    throw error;
  }

  // Configuration is valid, proceed with server initialization
  const server = new McpServer({
    name: "hostex-mcp",
    title: "Hostex Property Management",
    version: "0.3.0"
  });

  const hostexClient = new HostexClient({
    accessToken: config.accessToken,
  });

  logger.info('Hostex MCP server initialized successfully');

  // ... register tools

  return server.server;
}
```

### Date Validation with Zod v4

```typescript
// Source: https://zod.dev/api
import { z } from "zod";

// Zod v4: z.iso.date() validates YYYY-MM-DD format
const reservationSchema = {
  start_check_in_date: z.iso.date()
    .optional()
    .describe("Check-in start date (YYYY-MM-DD format)"),

  end_check_in_date: z.iso.date()
    .optional()
    .describe("Check-in end date (YYYY-MM-DD format)"),

  start_check_out_date: z.iso.date()
    .optional()
    .describe("Check-out start date (YYYY-MM-DD format)"),

  end_check_out_date: z.iso.date()
    .optional()
    .describe("Check-out end date (YYYY-MM-DD format)"),
};

// z.iso.date() examples:
// "2024-01-15" ✅
// "2024-1-15"  ❌ (must be zero-padded)
// "2024-01-32" ❌ (invalid date)
// "01/15/2024" ❌ (wrong format)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| console.log() for debugging | Structured logging to stderr with Pino | MCP protocol standardization | Prevents Error -32000, enables log aggregation |
| Throwing errors from handlers | Return { isError: true } with context | MCP SDK 1.0+ | LLM can see errors and self-correct, no crashes |
| Zod v3 string methods | Zod v4 top-level functions | Zod v4.0.0 (2025) | z.string().date() → z.iso.date() |
| Manual input validation | Zod schemas with constraints | TypeScript ecosystem trend | Type safety + runtime validation |
| Shared server instances | One server per connection | MCP SDK 1.26.0 fix | Prevents cross-client data leakage |
| MCP SDK v1.0.4 | MCP SDK v1.27.0 | Jan-Feb 2026 releases | Security fixes (DNS rebinding, ReDoS, data leakage) |

**Deprecated/outdated:**
- **MCP SDK <1.24.0:** Lacks DNS rebinding protection (GHSA-w48q-cv73-mx4w)
- **MCP SDK <1.25.2:** Contains ReDoS vulnerability in UriTemplate (GHSA-8r9q-7v3j-jr4g)
- **MCP SDK 1.10.0-1.25.3:** Cross-client data leak in shared instances (GHSA-345p-7cg4-v4c7)
- **Zod v3 syntax:** `z.string().email()` → `z.email()`, `z.string().date()` → `z.iso.date()`
- **Winston for MCP servers:** Slower than Pino (5x difference), harder to route to stderr exclusively

## Open Questions

1. **Smithery SDK compatibility with MCP SDK 1.27.0**
   - What we know: @smithery/sdk 1.6.6 is current version, provides transport abstraction
   - What's unclear: Any peer dependency requirements with MCP SDK 1.27.0
   - Recommendation: Test both stdio and shttp transports after upgrade, check for deprecation warnings

2. **MCP SDK v2 timeline and migration effort**
   - What we know: Stable v2 expected Q1 2026, primary change is import restructuring
   - What's unclear: Exact release date, full scope of breaking changes beyond imports
   - Recommendation: Complete v1.27.0 upgrade now, plan separate v2 migration phase when stable

3. **Hostex API rate limits and error responses**
   - What we know: API has undocumented rate limits, may vary by plan/tier
   - What's unclear: Specific limits, error response format, retry-after headers
   - Recommendation: Monitor initial deployments, add rate limit logging, document empirical findings

4. **Lodash transitive vulnerability timeline**
   - What we know: CVE-2025-13465 in lodash 4.17.21, fixed in 4.17.23, transitive via @smithery/cli
   - What's unclear: When @smithery/cli will update lodash dependency
   - Recommendation: Document in verification, monitor @smithery releases, MODERATE severity allows deferring

5. **Tool invocation logging storage strategy**
   - What we know: Pino outputs structured JSON to stderr, need to track usage/errors/performance
   - What's unclear: Log aggregation destination (local files, CloudWatch, Datadog, etc.)
   - Recommendation: Implement logging first, decide aggregation strategy based on deployment environment

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [MCP TypeScript SDK Releases](https://github.com/modelcontextprotocol/typescript-sdk/releases) - Version history, security fixes, v1.27.0 features
- [Zod v4 Migration Guide](https://zod.dev/v4/changelog) - Breaking changes, string validators, optional field behavior
- [Zod API Documentation](https://zod.dev/api) - Schema validation, z.iso.date(), constraints

**Security Advisories:**
- [GHSA-w48q-cv73-mx4w](https://github.com/advisories/GHSA-w48q-cv73-mx4w) - MCP SDK DNS rebinding vulnerability (<1.24.0)
- [GHSA-8r9q-7v3j-jr4g](https://github.com/advisories/GHSA-8r9q-7v3j-jr4g) - MCP SDK ReDoS vulnerability (<1.25.2)
- [GHSA-345p-7cg4-v4c7](https://github.com/advisories/GHSA-345p-7cg4-v4c7) - MCP SDK cross-client data leak (1.10.0-1.25.3)
- [CVE-2025-15284](https://github.com/advisories/GHSA-6rw7-vpxm-498p) - qs arrayLimit bypass DoS
- [CVE-2025-13465](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) - Lodash prototype pollution

### Secondary (MEDIUM-HIGH confidence)

**Best Practices Guides:**
- [Error Handling in MCP Servers](https://mcpcat.io/guides/error-handling-custom-mcp-servers/) - CallToolResult pattern, isError flag
- [MCP Best Practices](https://www.philschmid.de/mcp-best-practices) - Error messages as context, LLM-friendly responses
- [MCP Error -32000 Solutions](https://mcpcat.io/guides/fixing-mcp-error-32000-connection-closed/) - Stdout contamination, stderr routing
- [Error Handling and Debugging](https://www.stainless.com/mcp/error-handling-and-debugging-mcp-servers) - Fail-fast configuration, validation patterns

**Logging Best Practices:**
- [Node.js Logging Best Practices](https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/) - Structured logging, JSON format, stderr routing
- [Pino vs Winston Comparison](https://betterstack.com/community/comparisons/pino-vs-winston/) - Performance benchmarks, feature comparison
- [Pino Logger Complete Guide 2026](https://signoz.io/guides/pino-logger/) - Configuration, transports, best practices

**TypeScript Patterns:**
- [TypeScript Async Error Handling](https://medium.com/@angeldavid218/stop-repeating-try-catch-this-typescript-wrapper-makes-error-handling-easy-39c80a8a2081) - Wrapper patterns, try-catch alternatives
- [Zod Schema Validation Complete Guide](https://betterstack.com/community/guides/scaling-nodejs/zod-explained/) - Schema composition, validation patterns

### Tertiary (MEDIUM confidence - requires verification)

**Community Resources:**
- [MCP Monitoring and Logging](https://www.stainless.com/mcp/real-time-mcp-monitoring-and-logging) - Tool invocation metrics, performance tracking
- [Better MCP Tool Error Responses](https://alpic.ai/blog/better-mcp-tool-call-error-responses-ai-recover-gracefully) - Error message quality, LLM recovery
- [MCP Server Troubleshooting Guide 2025](https://www.mcpstack.org/learn/mcp-server-troubleshooting-guide-2025) - Common issues, debugging strategies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official releases confirmed (SDK 1.27.0, Zod v4), npm audit verified vulnerabilities
- Architecture: HIGH - Patterns sourced from official MCP docs and established best practices
- Pitfalls: HIGH - Specific CVEs documented, Error -32000 well-established issue, Zod v4 breaking changes in official migration guide
- Open questions: MEDIUM - Smithery compatibility needs testing, v2 timeline approximate, Hostex rate limits undocumented

**Research date:** 2026-02-16
**Valid until:** 2026-03-18 (30 days - SDK v2 may arrive sooner, monitor for updates)

**Notes:**
- MCP SDK v2 pre-alpha exists but v1.x is production-recommended
- All 22 current tool handlers need error wrapper (counted via grep)
- Transitive vulnerabilities (lodash, qs) are toolkit dependencies - no direct action available
- Pino selected over Winston for 5x performance advantage and simpler stderr configuration
