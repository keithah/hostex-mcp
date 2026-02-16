# Architecture Patterns for MCP Servers

**Domain:** Model Context Protocol (MCP) Server Development
**Researched:** 2026-02-16
**Confidence:** HIGH

## Executive Summary

Modern MCP server architecture prioritizes **single responsibility, modular organization, and strong type safety**. The official TypeScript SDK enforces clean separation between core MCP logic and transport layers, with zod schemas providing runtime validation. Production-ready servers avoid monolithic anti-patterns by organizing tool handlers into separate modules with clear boundaries, implementing structured error handling, and using dependency injection for API clients.

The 370-line monolithic structure in the current Hostex MCP server represents the **exact anti-pattern** the ecosystem has moved away from. Modern best practices call for separating tool handlers, validation logic, API client configuration, and error handling into distinct modules while maintaining a single deployment unit.

## Recommended Architecture

### Layered Modular Structure

```
src/
├── index.ts                  # Server initialization and transport setup
├── config/
│   ├── schema.ts            # Configuration validation (zod schemas)
│   └── environment.ts       # Environment variable handling
├── client/
│   └── hostex.ts            # Hostex API client wrapper/factory
├── tools/
│   ├── index.ts             # Tool registry and registration
│   ├── properties.ts        # Property-related tools
│   ├── reservations.ts      # Reservation-related tools
│   ├── conversations.ts     # Conversation/messaging tools
│   ├── reviews.ts           # Review tools
│   ├── webhooks.ts          # Webhook tools
│   ├── listings.ts          # Listing/calendar/pricing tools
│   └── meta.ts              # Meta tools (custom channels, income methods)
├── handlers/
│   └── errors.ts            # Error transformation and handling
├── types/
│   ├── schemas.ts           # Shared zod schemas for tool inputs
│   └── responses.ts         # Response type definitions
└── utils/
    ├── validation.ts        # Common validation helpers
    └── logger.ts            # Structured logging to stderr
```

### Component Boundaries

| Component | Responsibility | Depends On | Exports |
|-----------|---------------|------------|---------|
| **index.ts** | Server bootstrapping, transport connection | config, client, tools | Server instance |
| **config/** | Environment validation, schema definition | zod | Config schema, validated config |
| **client/** | Hostex API client initialization and wrapping | hostex-ts, config | Client factory/instance |
| **tools/** | Tool registration, parameter validation, business logic | client, schemas, handlers | Tool registration functions |
| **handlers/** | Error transformation, response formatting | MCP SDK | Error utilities, formatters |
| **types/** | Shared type definitions and schemas | zod | Schemas, types |
| **utils/** | Cross-cutting concerns (logging, validation) | None | Helper functions |

## Patterns to Follow

### Pattern 1: Modular Tool Registration

**What:** Group related tools by domain, expose registration functions

**When:** Always - prevents monolithic tool handlers

**Example:**

```typescript
// src/tools/properties.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HostexClient } from "../client/hostex.js";
import { propertySchemas } from "../types/schemas.js";
import { handleError } from "../handlers/errors.js";

export function registerPropertyTools(server: McpServer, client: HostexClient) {
  server.tool(
    "hostex_list_properties",
    "List properties from your Hostex account",
    propertySchemas.listProperties,
    async (params) => {
      try {
        const result = await client.listProperties(params);
        return result.data;
      } catch (error) {
        return handleError(error, "list_properties");
      }
    }
  );

  server.tool(
    "hostex_list_room_types",
    "List room types from your Hostex account",
    propertySchemas.listRoomTypes,
    async (params) => {
      try {
        const result = await client.listRoomTypes(params);
        return result.data;
      } catch (error) {
        return handleError(error, "list_room_types");
      }
    }
  );
}
```

```typescript
// src/tools/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HostexClient } from "../client/hostex.js";
import { registerPropertyTools } from "./properties.js";
import { registerReservationTools } from "./reservations.js";
import { registerConversationTools } from "./conversations.js";
// ... other tool modules

export function registerAllTools(server: McpServer, client: HostexClient) {
  registerPropertyTools(server, client);
  registerReservationTools(server, client);
  registerConversationTools(server, client);
  // ... register other tool groups
}
```

### Pattern 2: Centralized Schema Management

**What:** Define all zod schemas in a dedicated types module, reuse across tools

**When:** Always - ensures consistency and type safety

**Example:**

```typescript
// src/types/schemas.ts
import { z } from "zod";

export const propertySchemas = {
  listProperties: z.object({
    offset: z.number().optional().describe("Starting point (default: 0)"),
    limit: z.number().optional().describe("Max results, max 100 (default: 20)"),
    id: z.number().optional().describe("Filter by specific property ID"),
  }),

  listRoomTypes: z.object({
    offset: z.number().optional().describe("Starting point (default: 0)"),
    limit: z.number().optional().describe("Max results, max 100 (default: 20)"),
  }),
};

export const reservationSchemas = {
  listReservations: z.object({
    reservation_code: z.string().optional(),
    property_id: z.number().optional(),
    status: z.enum(['wait_accept', 'wait_pay', 'accepted', 'cancelled', 'denied', 'timeout']).optional(),
    start_check_in_date: z.string().optional().describe("YYYY-MM-DD format"),
    end_check_in_date: z.string().optional().describe("YYYY-MM-DD format"),
    // ...
  }),

  createReservation: z.object({
    property_id: z.string().describe("Property ID"),
    custom_channel_id: z.number().describe("Custom channel ID"),
    check_in_date: z.string().describe("Check-in date (YYYY-MM-DD)"),
    // ...
  }),
};

// Common reusable schemas
export const commonSchemas = {
  pagination: z.object({
    offset: z.number().optional().describe("Starting point (default: 0)"),
    limit: z.number().optional().describe("Max results, max 100 (default: 20)"),
  }),

  dateRange: z.object({
    start_date: z.string().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().describe("End date (YYYY-MM-DD)"),
  }),
};
```

### Pattern 3: Structured Error Handling

**What:** Centralized error transformation with structured responses, never expose internal errors

**When:** All tool handlers - prevents crashes and information leakage

**Example:**

```typescript
// src/handlers/errors.ts
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";

export interface StructuredErrorResponse {
  isError: true;
  errorType: string;
  message: string;
  context?: Record<string, unknown>;
}

export function handleError(
  error: unknown,
  operation: string
): StructuredErrorResponse {
  // Log full error details to stderr for debugging
  logger.error({
    operation,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  // API client errors
  if (isHostexApiError(error)) {
    return {
      isError: true,
      errorType: "API_ERROR",
      message: `Hostex API error during ${operation}: ${sanitizeMessage(error.message)}`,
      context: {
        statusCode: error.statusCode,
        operation,
      },
    };
  }

  // Validation errors
  if (error instanceof z.ZodError) {
    return {
      isError: true,
      errorType: "VALIDATION_ERROR",
      message: "Invalid parameters provided",
      context: {
        issues: error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    };
  }

  // Network/timeout errors
  if (isNetworkError(error)) {
    return {
      isError: true,
      errorType: "NETWORK_ERROR",
      message: `Network error during ${operation}. Please try again.`,
    };
  }

  // Default: don't leak internal details
  return {
    isError: true,
    errorType: "INTERNAL_ERROR",
    message: `An unexpected error occurred during ${operation}`,
  };
}

function sanitizeMessage(message: string): string {
  // Remove sensitive info like API keys, tokens
  return message
    .replace(/accessToken=[^&\s]+/gi, 'accessToken=***')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer ***')
    .replace(/api[_-]?key[=:]\s*[^\s&]+/gi, 'api_key=***');
}

function isHostexApiError(error: unknown): error is { statusCode: number; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error
  );
}

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('timeout') ||
         message.includes('econnrefused') ||
         message.includes('network');
}
```

### Pattern 4: Client Factory with Dependency Injection

**What:** Create API client through factory function, inject into tool modules

**When:** Always - enables testing, configuration flexibility

**Example:**

```typescript
// src/client/hostex.ts
import { HostexClient } from 'hostex-ts';
import { logger } from '../utils/logger.js';

export interface HostexClientConfig {
  accessToken: string;
  timeout?: number;
  retryAttempts?: number;
}

export function createHostexClient(config: HostexClientConfig): HostexClient {
  logger.info('Initializing Hostex API client');

  return new HostexClient({
    accessToken: config.accessToken,
    // Additional configuration
  });
}

// Type re-export for convenience
export type { HostexClient };
```

```typescript
// src/index.ts
import { validateConfig } from './config/schema.js';
import { createHostexClient } from './client/hostex.js';
import { registerAllTools } from './tools/index.js';

export default function createServer({ config }: { config: unknown }) {
  const validatedConfig = validateConfig(config);
  const server = new McpServer({
    name: "hostex-mcp",
    version: "0.3.0"
  });

  const hostexClient = createHostexClient({
    accessToken: validatedConfig.accessToken
  });

  registerAllTools(server, hostexClient);

  return server.server;
}
```

### Pattern 5: Configuration Validation

**What:** Validate all configuration at startup, fail fast with clear errors

**When:** Server initialization - prevents runtime failures

**Example:**

```typescript
// src/config/schema.ts
import { z } from "zod";

export const configSchema = z.object({
  accessToken: z
    .string()
    .min(1, "Hostex access token is required")
    .describe("Your Hostex API access token"),

  timeout: z
    .number()
    .int()
    .positive()
    .default(30000)
    .describe("API request timeout in milliseconds"),

  logLevel: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info')
    .describe("Logging level"),
});

export type ServerConfig = z.infer<typeof configSchema>;

export function validateConfig(raw: unknown): ServerConfig {
  try {
    return configSchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(
        issue => `${issue.path.join('.')}: ${issue.message}`
      );
      throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
    }
    throw error;
  }
}
```

### Pattern 6: Structured Logging to stderr

**What:** Use structured logger writing to stderr, never stdout (corrupts JSON-RPC)

**When:** All logging - required for STDIO transport

**Example:**

```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  constructor(private level: LogLevel = 'info') {}

  private levelWeight(level: LogLevel): number {
    const weights = { debug: 0, info: 1, warn: 2, error: 3 };
    return weights[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelWeight(level) >= this.levelWeight(this.level);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    // CRITICAL: Write to stderr, not stdout (stdio transport)
    console.error(JSON.stringify(entry));
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string | LogContext, context?: LogContext) {
    if (typeof message === 'string') {
      this.log('error', message, context);
    } else {
      this.log('error', 'Error occurred', message);
    }
  }
}

export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);
```

### Pattern 7: Testing Architecture

**What:** In-memory testing pattern with mocked API client

**When:** Unit and integration tests - eliminates subprocess complexity

**Example:**

```typescript
// tests/tools/properties.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPropertyTools } from '../../src/tools/properties.js';
import type { HostexClient } from '../../src/client/hostex.js';

describe('Property Tools', () => {
  let server: McpServer;
  let mockClient: HostexClient;

  beforeEach(() => {
    server = new McpServer({ name: "test-server", version: "1.0.0" });

    // Mock Hostex client
    mockClient = {
      listProperties: vi.fn(),
      listRoomTypes: vi.fn(),
    } as unknown as HostexClient;

    registerPropertyTools(server, mockClient);
  });

  it('should list properties with valid parameters', async () => {
    const mockData = {
      data: [
        { id: 1, title: "Test Property", address: "123 Main St" }
      ]
    };

    vi.mocked(mockClient.listProperties).mockResolvedValue(mockData);

    // Test tool execution through server
    const tools = await server.server.listTools();
    expect(tools.tools).toContainEqual(
      expect.objectContaining({ name: 'hostex_list_properties' })
    );

    // Execute tool and verify
    const result = await server.server.callTool({
      name: 'hostex_list_properties',
      arguments: { offset: 0, limit: 10 }
    });

    expect(result).toEqual(mockData.data);
    expect(mockClient.listProperties).toHaveBeenCalledWith({
      offset: 0,
      limit: 10
    });
  });

  it('should handle API errors gracefully', async () => {
    const apiError = new Error('API rate limit exceeded');
    vi.mocked(mockClient.listProperties).mockRejectedValue(apiError);

    const result = await server.server.callTool({
      name: 'hostex_list_properties',
      arguments: {}
    });

    expect(result).toMatchObject({
      isError: true,
      errorType: expect.any(String),
      message: expect.stringContaining('error'),
    });
  });
});
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Tool Handler File

**What goes wrong:** All 20+ tools in a single 370-line file becomes unmaintainable

**Why bad:**
- Difficult to navigate and understand
- Merge conflicts when multiple developers work on tools
- No logical grouping or separation of concerns
- Hard to test individual tool groups
- Violates single responsibility principle

**Instead:** Use the modular tool registration pattern (Pattern 1), grouping tools by domain (properties, reservations, conversations, etc.)

### Anti-Pattern 2: Inline Schema Definitions

**What goes wrong:** Zod schemas defined directly in tool registration calls

**Why bad:**
- Schema duplication when similar parameters exist
- No type reuse across tools
- Hard to maintain consistent validation
- Verbose and cluttered tool registration code

**Instead:** Use centralized schema management (Pattern 2), define schemas in `types/schemas.ts` and import

### Anti-Pattern 3: Raw Error Exposure

**What goes wrong:** Throwing errors directly from tool handlers without transformation

**Why bad:**
- Exposes internal implementation details (stack traces, API keys in URLs)
- Crashes server instead of returning structured error responses
- LLM clients can't distinguish between error types
- Security vulnerability (information leakage)
- No debugging context in logs

**Instead:** Use structured error handling (Pattern 3), always catch and transform errors

### Anti-Pattern 4: Global Client Instance

**What goes wrong:** Creating HostexClient as module-level global variable

**Why bad:**
- Impossible to test tools in isolation
- Can't mock API calls for unit tests
- Configuration coupling across entire codebase
- Multiple instances possible if module re-imported

**Instead:** Use client factory with dependency injection (Pattern 4)

### Anti-Pattern 5: console.log for Debugging

**What goes wrong:** Using `console.log()` for debugging output in STDIO transport

**Why bad:**
- Writes to stdout, corrupting JSON-RPC protocol messages
- Breaks MCP client-server communication
- Server appears non-functional or crashes client

**Instead:** Use structured logging to stderr (Pattern 6), `console.error()` or proper logger

### Anti-Pattern 6: Unchecked Configuration

**What goes wrong:** Reading `config.accessToken` without validation

**Why bad:**
- Runtime errors when config is missing or malformed
- Poor error messages ("undefined is not a string")
- No type safety or IDE autocomplete
- Secrets might be accidentally logged

**Instead:** Use configuration validation (Pattern 5), validate with zod at startup

### Anti-Pattern 7: No Input Validation

**What goes wrong:** Passing tool parameters directly to API without validation

**Why bad:**
- API receives invalid data, returns cryptic errors
- No early feedback to LLM about parameter issues
- Security risk (injection attacks if data reaches DB)
- Poor developer experience

**Instead:** Use zod schemas for all tool inputs, validate before API calls

## Scalability Considerations

| Concern | Current (10 tools) | Medium (20-50 tools) | Large (100+ tools) |
|---------|-------------------|----------------------|-------------------|
| **File organization** | Single file acceptable | Modular structure required | Domain-based modules + sub-modules |
| **Schema management** | Inline schemas OK | Centralized schemas module | Hierarchical schema library |
| **Error handling** | Try-catch per tool | Centralized error handler | Error handler + custom error types |
| **Testing** | Manual testing | Unit tests per tool group | Full test suite + integration + E2E |
| **API client** | Direct instantiation | Factory function | Factory + connection pooling |
| **Logging** | Console.error | Structured logger | Structured logger + log aggregation |
| **Configuration** | Simple validation | Environment-based config | Config service + secrets manager |

## Testing Architecture

### Unit Testing

**Target:** Individual tool handlers in isolation

**Pattern:** Mock API client, test tool logic

```typescript
// Structure
tests/
├── unit/
│   ├── tools/
│   │   ├── properties.test.ts
│   │   ├── reservations.test.ts
│   │   └── conversations.test.ts
│   ├── handlers/
│   │   └── errors.test.ts
│   └── utils/
│       └── validation.test.ts
```

**Coverage targets:**
- Tool parameter validation (zod schemas)
- Error handling and transformation
- Response formatting
- Edge cases (empty results, null values)

### Integration Testing

**Target:** End-to-end tool execution with real MCP protocol

**Pattern:** In-memory server + client, mock external APIs

```typescript
// Structure
tests/
├── integration/
│   ├── server-initialization.test.ts
│   ├── tool-registration.test.ts
│   └── workflows/
│       ├── reservation-workflow.test.ts
│       └── conversation-workflow.test.ts
```

**Coverage targets:**
- Server initialization with valid/invalid config
- Tool discovery via listTools()
- Tool execution via callTool()
- Multi-tool workflows (create reservation → update custom fields)
- Error propagation through protocol

### E2E Testing

**Target:** Full server deployment with real Hostex API (staging)

**Pattern:** Subprocess server + MCP client, real API calls

```typescript
// Structure
tests/
├── e2e/
│   ├── smoke.test.ts           # Basic connectivity
│   ├── properties.e2e.test.ts  # Real API calls
│   └── reservations.e2e.test.ts
```

**Coverage targets:**
- STDIO transport communication
- Real Hostex API integration
- Authentication and authorization
- Rate limiting and retries
- Actual data CRUD operations

### Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
      ],
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
```

## Migration Path from Monolith (370 lines → Modular)

### Phase 1: Extract Configuration (Week 1)
1. Create `src/config/schema.ts` with validation
2. Move configSchema from index.ts
3. Add environment variable handling

### Phase 2: Extract Client (Week 1)
1. Create `src/client/hostex.ts`
2. Implement factory function
3. Update index.ts to use factory

### Phase 3: Extract Schemas (Week 2)
1. Create `src/types/schemas.ts`
2. Move all inline zod schemas
3. Group by domain (properties, reservations, etc.)

### Phase 4: Extract Error Handling (Week 2)
1. Create `src/handlers/errors.ts`
2. Implement structured error responses
3. Add error transformation utilities

### Phase 5: Extract Tool Groups (Week 3-4)
1. Create `src/tools/properties.ts` - extract property tools
2. Create `src/tools/reservations.ts` - extract reservation tools
3. Create `src/tools/conversations.ts` - extract conversation tools
4. Create `src/tools/reviews.ts` - extract review tools
5. Create `src/tools/webhooks.ts` - extract webhook tools
6. Create `src/tools/listings.ts` - extract listing tools
7. Create `src/tools/meta.ts` - extract meta tools
8. Create `src/tools/index.ts` - unified registration

### Phase 6: Extract Utilities (Week 4)
1. Create `src/utils/logger.ts`
2. Create `src/utils/validation.ts`

### Phase 7: Add Testing (Week 5-6)
1. Set up vitest configuration
2. Write unit tests for each tool group
3. Add integration tests for workflows
4. Add E2E smoke tests

**Result:** ~70-100 lines per file, ~15 files, full test coverage

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| **Modular structure** | HIGH | Official MCP TypeScript SDK patterns, official build server tutorial |
| **Error handling** | HIGH | MCP best practices guides, production server examples |
| **Schema patterns** | HIGH | Official SDK uses zod throughout, documented in examples |
| **Testing patterns** | HIGH | Community testing frameworks, official testing guidance |
| **Logging requirements** | HIGH | Official documentation (never use stdout for STDIO transport) |
| **Configuration** | MEDIUM | Community patterns, environment variable guides |
| **Scalability** | MEDIUM | Architectural best practices, monolith vs modular discussions |

## Sources

**Official Documentation:**
- [Build an MCP Server - Model Context Protocol](https://modelcontextprotocol.io/docs/develop/build-server) - Official tutorial with TypeScript patterns
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official SDK structure and patterns

**Architecture & Best Practices:**
- [MCP Server Best Practices for 2026](https://www.cdata.com/blog/mcp-server-best-practices-2026)
- [15 Best Practices for Building MCP Servers in Production](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/)
- [MCP Best Practices: Architecture & Implementation Guide](https://modelcontextprotocol.info/docs/best-practices/)
- [MCP Server Architecture: How Modular Protocols Power Scalable AI Integrations](https://www.theninjastudio.com/blog/mcp-server-architecture-how-modular-protocols-power-scalable-ai-integrations)
- [From Monolith to Modular (Part 1): Understanding MCP for Modern AI Applications](https://medium.com/@khansaima/from-monolith-to-modular-part-1-understanding-mcp-for-modern-ai-applications-c367036c1c5e)

**Error Handling:**
- [Error Handling in MCP Servers - Best Practices Guide](https://mcpcat.io/guides/error-handling-custom-mcp-servers/)
- [Debugging Model Context Protocol (MCP) Servers: Tips and Best Practices](https://www.mcpevals.io/blog/debugging-mcp-servers-tips-and-best-practices)

**Testing:**
- [Unit Testing MCP Servers - Complete Testing Guide](https://mcpcat.io/guides/writing-unit-tests-mcp-servers/)
- [MCP Integration Testing - E2E Testing Guide](https://mcpcat.io/guides/integration-tests-mcp-flows/)
- [How to Test MCP Servers - Blog Codely](https://codely.com/en/blog/how-to-test-mcp-servers)
- [Testing your FastMCP Server](https://gofastmcp.com/patterns/testing)

**Configuration Management:**
- [Managing Environment Variables](https://apxml.com/courses/getting-started-model-context-protocol/chapter-4-debugging-and-client-integration/managing-environment-variables)
- [How To Manage Multiple Environments with MCP](https://chrisfrew.in/blog/how-to-manage-multiple-environments-with-mcp/)
