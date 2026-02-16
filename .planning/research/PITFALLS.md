# Domain Pitfalls

**Domain:** MCP Server Development with External API Integration
**Researched:** 2026-02-16

## Critical Pitfalls

Mistakes that cause rewrites, production failures, or major security issues.

### Pitfall 1: Writing to stdout Instead of stderr
**What goes wrong:** The #1 cause of Error -32000 (Connection Closed) in MCP servers. Any non-JSON-RPC output to stdout corrupts the message stream when using stdio transport.

**Why it happens:** Developers use console.log(), print statements, or debugging output without understanding that MCP's stdio transport exclusively uses stdout for JSON-RPC protocol messages.

**Consequences:**
- Immediate connection termination
- Error -32000: Connection Closed
- Corrupted JSON-RPC message stream
- ANSI escape sequences from colored terminal output inject escape codes that break JSON parsing

**Prevention:**
- **ALWAYS** redirect all logs to stderr: `console.error()` instead of `console.log()`
- Use structured logging libraries (Winston, Pino) configured to write to stderr
- Set up logging before any tool handlers execute
- Avoid terminal coloring libraries unless configured for stderr only
- Never use print/echo statements in production

**Detection:**
- Test with MCP Inspector or minimal scripted client
- Monitor for Error -32000 immediately after server launch
- Check for protocol parse errors in client logs
- Enable verbose logging to stderr to see what's being output

**Current codebase risk:** MEDIUM - No logging infrastructure observed in existing code; potential for future debug statements to break stdio transport.

### Pitfall 2: No Error Handling in Tool Handlers
**What goes wrong:** Unhandled exceptions in async tool handlers crash the entire MCP server process, terminating all client connections.

**Why it happens:** Developers assume try-catch blocks in application code will catch errors, but async exceptions in MCP tool handlers bubble up and crash the process if not explicitly handled.

**Consequences:**
- Server process exits unexpectedly
- All connected clients disconnected simultaneously
- No error information returned to client
- Lost work and interrupted user workflows
- No audit trail of what went wrong

**Prevention:**
- Wrap ALL tool handler logic in try-catch blocks
- Return structured error responses using `isError: true` flag
- Log full error details to stderr for debugging
- Sanitize error messages returned to clients (don't expose API keys, internal paths, stack traces)
- Implement a generic error handler wrapper for all tools
- Validate inputs before processing to provide clear error messages
- Use specific exception handling first, then catch-all for unexpected errors

**Detection:**
- Server process exits immediately after tool invocation
- Client receives no response before disconnection
- Check process exit codes (non-zero indicates crash)
- Monitor stderr logs for unhandled promise rejections

**Current codebase risk:** CRITICAL - No error handling observed in any of the 24 tool handlers. All API calls are direct pass-throughs with no try-catch blocks.

### Pitfall 3: No Runtime Type Validation for API Responses
**What goes wrong:** TypeScript types vanish at runtime. When the Hostex API changes, returns errors, or has bugs, your "type-safe" code crashes because response.json() returns `any`.

**Why it happens:** Developers trust TypeScript compiler checks but forget that external API responses are not validated at runtime. The API can return anything regardless of TypeScript types.

**Consequences:**
- Production crashes when API response shape changes
- Silent data corruption when optional fields are missing
- Type assertion (`as any`) bypasses all safety checks
- Undefined property access errors deep in execution
- No warning when API adds/removes fields

**Prevention:**
- Use runtime validation libraries (Zod, io-ts, yup) for ALL external API responses
- Validate before type assertion, not after
- Define response schemas and validate incoming data
- Never use `as any` without validation - current code uses it 5 times
- Implement schema versioning if API evolves
- Log validation failures with full payload for debugging

**Detection:**
- Crashes with "Cannot read property X of undefined"
- TypeScript shows no errors but runtime crashes
- Different behavior in development vs production
- Errors only appear with specific API responses

**Current codebase risk:** CRITICAL - All API calls use `as any` type assertions without runtime validation. No schema validation infrastructure in place.

### Pitfall 4: Global State Leakage Between Users
**What goes wrong:** Using global variables or shared state objects causes data to leak between different users/clients calling your MCP server tools.

**Why it happens:** Developers treat MCP servers like single-user applications, not realizing that tools can be called by different users concurrently, especially with HTTP transports.

**Consequences:**
- User A sees User B's data
- Authentication tokens mixed between users
- Race conditions in concurrent requests
- Cache poisoning across users
- Security violations and data breaches

**Prevention:**
- Never use global variables for user-specific state
- Create client instances per-request or per-session
- Pass context objects through function parameters
- Use connection-scoped storage, not process-scoped
- Implement proper session management with user binding
- Treat state objects like database connections: create, use, destroy

**Detection:**
- Different users seeing each other's data
- Intermittent failures that resolve on retry
- Data corruption under concurrent load
- Authentication failures for valid credentials

**Current codebase risk:** MEDIUM - Single global `hostexClient` instance created at server initialization. With Smithery's streamable HTTP transport, this could leak data between users if multiple clients connect.

### Pitfall 5: Missing Input Validation Before API Calls
**What goes wrong:** Invalid inputs are passed directly to the Hostex API, resulting in cryptic API error messages that don't help users understand what went wrong.

**Why it happens:** Developers rely on Zod schema validation at the protocol level but don't add business logic validation (date ranges, ID formats, required field combinations).

**Consequences:**
- Confusing error messages from API ("Invalid request")
- Unnecessary API calls that fail predictably
- Rate limit consumption on invalid requests
- Poor user experience
- No guidance on how to fix the input

**Prevention:**
- Validate inputs BEFORE calling external APIs
- Check business logic constraints (start_date < end_date, valid ID formats)
- Provide clear, actionable error messages
- Validate required field combinations Zod can't express
- Return early with descriptive errors
- Document validation rules in tool descriptions

**Detection:**
- High rate of API errors for user-supplied data
- Generic API error messages in responses
- Users repeatedly retrying with invalid inputs

**Current codebase risk:** HIGH - No validation beyond Zod schema checks. Date range validation, ID format checking, and business rule validation missing.

### Pitfall 6: No Rate Limiting or Retry Logic
**What goes wrong:** When Hostex API returns 429 (rate limit) or transient network errors, requests fail immediately without retry, and no backoff prevents hammering the API.

**Why it happens:** Developers don't implement retry logic with exponential backoff or respect Retry-After headers from rate-limited responses.

**Consequences:**
- Unnecessary failures for transient errors
- Thundering herd problem when multiple clients retry simultaneously
- API account suspended for excessive requests
- Poor reliability perception
- Wasted API quota on repeated failures

**Prevention:**
- Implement exponential backoff with jitter for retries
- Respect Retry-After headers from 429 responses
- Distinguish between retryable (network, 429, 5xx) and non-retryable (4xx client errors) failures
- Set maximum retry attempts (3-5 typical)
- Log retry attempts with context
- Consider circuit breaker pattern for persistent failures
- Queue requests instead of rejecting during rate limits

**Detection:**
- Immediate failures for 429 responses
- No retry attempts in logs
- Burst of failures during network hiccups
- API provider complaints about excessive requests

**Current codebase risk:** CRITICAL - No retry logic observed. Direct pass-through to `hostex-ts` client with no wrapper for resilience patterns.

### Pitfall 7: API Credentials in MCP Server Configuration
**What goes wrong:** API keys stored in MCP client configuration files (plaintext JSON) are exposed to malicious MCP servers, local file access, or logs.

**Why it happens:** Smithery config pattern stores `accessToken` directly in server configuration, which is convenient but insecure for production deployments.

**Consequences:**
- API keys leaked in client configuration backups
- Logs accidentally contain credentials
- Malicious servers can read client config files
- No rotation mechanism without redeployment
- Credentials shared across all users of server

**Prevention:**
- Use environment variables instead of config files for secrets
- Implement OAuth flow for user-scoped tokens
- Rotate API keys every 60-90 days minimum
- Never log configuration objects that contain secrets
- Use secret management systems (AWS Secrets Manager, Vault)
- Implement key encryption at rest
- Document security implications in setup instructions

**Detection:**
- Credentials found in logs or error messages
- Configuration files committed to version control
- API key appears in multiple locations

**Current codebase risk:** HIGH - Config schema requires `accessToken` as string. No OAuth implementation. Single shared credential for all users.

### Pitfall 8: Unvalidated Session IDs Enable Session Hijacking
**What goes wrong:** With Smithery's streamable HTTP transport, predictable or unverified session IDs allow attackers to impersonate users or inject malicious payloads into their sessions.

**Why it happens:** Developers don't bind session IDs to user identity, use predictable patterns, or validate authorization on every request.

**Consequences:**
- Session hijack prompt injection: attacker sends malicious events to victim's session
- Session hijack impersonation: attacker makes API calls as victim
- Data exfiltration through compromised sessions
- Malicious tool execution as legitimate user

**Prevention:**
- Use secure, non-deterministic session IDs (cryptographic random, not sequential)
- **CRITICAL:** Verify authorization on ALL inbound requests - never use sessions for authentication
- Bind session IDs to user-specific information: `<user_id>:<session_id>`
- Rotate/expire session IDs regularly
- Don't derive session state from client-provided data
- Implement additional unique identifiers beyond session ID

**Detection:**
- Unexpected tool calls from legitimate session IDs
- Users reporting actions they didn't perform
- Session activity from multiple IP addresses

**Current codebase risk:** MEDIUM - Using Smithery streamable HTTP which manages sessions. Need to verify if authorization happens per-request or per-session.

## Moderate Pitfalls

Issues causing degraded reliability or developer experience problems.

### Pitfall 9: Large Unstructured API Response Payloads
**What goes wrong:** Returning entire API responses without filtering consumes token budgets and confuses LLMs with irrelevant data.

**Why it happens:** Developers do direct pass-through of `result.data` without considering token costs or relevance to user queries.

**Consequences:**
- Excessive token consumption
- Slow response times
- LLM context window exhaustion
- Difficulty extracting relevant information
- Poor model performance on large datasets

**Prevention:**
- Implement pagination for list operations
- Filter response fields to only relevant data
- Summarize large datasets before returning
- Provide drill-down tools for details instead of monolithic responses
- Document response size in tool descriptions
- Consider streaming for large datasets

**Detection:**
- High token usage per request
- Timeouts on large dataset queries
- User complaints about slow responses

**Current codebase risk:** MEDIUM - All list tools return `result.data` directly without filtering. No pagination enforcement on tools with limit parameters.

### Pitfall 10: Tool Naming Collisions and Confusion
**What goes wrong:** Similar tool names cause LLMs to select the wrong tool, leading to incorrect operations or confusing error messages.

**Why it happens:** Developers use generic prefixes without considering how models differentiate between similar operations.

**Consequences:**
- Wrong tool invoked for user intent
- Repeated tool call failures
- User frustration with "wrong" results
- Increased token costs from retries

**Prevention:**
- Use clear, distinct tool names following single responsibility
- Include operation context in names (hostex_list_properties vs hostex_get_property)
- Provide detailed descriptions distinguishing similar tools
- Avoid overlapping functionality across tools
- Document when to use each tool

**Detection:**
- Model consistently picks wrong tool
- Users rephrase queries multiple times
- High rate of tool call failures

**Current codebase risk:** LOW - Tool names follow consistent `hostex_{operation}_{resource}` pattern. Descriptions are clear.

### Pitfall 11: Missing Timeout Configuration for External API Calls
**What goes wrong:** External API calls without timeouts can hang indefinitely, blocking the event loop and causing server unresponsiveness.

**Why it happens:** Developers assume HTTP clients have default timeouts, or don't consider network partition scenarios.

**Consequences:**
- Server becomes unresponsive during API outages
- Blocked event loop prevents other requests
- Resource exhaustion from hanging connections
- Difficult to diagnose "server stopped responding" issues

**Prevention:**
- Set explicit timeouts on all HTTP client operations
- Configure both connection timeout and read timeout
- Use timeout values appropriate for operation (30s typical)
- Return timeout errors with actionable messages
- Log timeout events for monitoring
- Implement circuit breaker for persistent timeouts

**Detection:**
- Server stops responding under load
- Hung processes requiring restart
- No error logs during unresponsiveness
- High memory usage from pending requests

**Current codebase risk:** MEDIUM - Relying on `hostex-ts` client default timeouts. No explicit timeout configuration visible.

### Pitfall 12: Synchronous Blocking Operations in Async Handlers
**What goes wrong:** Using synchronous operations (blocking file I/O, `time.sleep()`) in async tool handlers freezes the event loop, causing timeouts.

**Why it happens:** Developers don't realize synchronous operations block the entire Node.js event loop, not just the current request.

**Consequences:**
- All requests timeout during blocking operation
- Server appears frozen
- Poor concurrency performance
- Cascading failures

**Prevention:**
- Use async versions of all I/O operations
- Use `await asyncio.sleep()` not blocking sleep
- Run CPU-intensive tasks in worker threads
- Profile async handlers for blocking calls
- Test under concurrent load

**Detection:**
- Timeouts correlate with specific tool calls
- Server handles one request at a time
- CPU usage low but requests slow

**Current codebase risk:** LOW - All tool handlers use async/await properly. No blocking operations observed.

### Pitfall 13: Insufficient Tool Description Specificity
**What goes wrong:** Vague or incomplete tool descriptions cause models to misuse tools or fail to invoke them when appropriate.

**Why it happens:** Developers write minimal descriptions without considering how LLMs interpret ambiguity.

**Consequences:**
- Model doesn't invoke tool when it should
- Wrong tool parameters provided
- User intent not fulfilled
- Increased token costs from clarification loops

**Prevention:**
- Provide detailed, specific tool descriptions
- Include examples of when to use the tool
- Document all parameter constraints and formats
- Explain what the tool returns
- Update descriptions based on usage patterns

**Detection:**
- Model asks for clarification frequently
- Wrong tools invoked for clear intents
- Parameters often invalid

**Current codebase risk:** MEDIUM - Some tools have good descriptions (list_properties), others are minimal (list_room_types). Parameter descriptions vary in quality.

## Minor Pitfalls

Issues affecting code quality or maintainability.

### Pitfall 14: Type Assertions (`as any`) Bypass Safety
**What goes wrong:** Using `as any` to bypass TypeScript errors eliminates all type safety, allowing runtime errors to slip through.

**Why it happens:** API client types don't perfectly match MCP tool schemas, so developers use type assertions as a shortcut.

**Consequences:**
- Runtime crashes from type mismatches
- No compiler warnings for breaking changes
- False sense of type safety
- Difficult refactoring

**Prevention:**
- Define proper type mappings between schemas and API clients
- Use type guards instead of assertions
- Create adapter functions with proper typing
- Fix type mismatches at the source
- Only use assertions with runtime validation

**Detection:**
- Search codebase for `as any` or `as unknown`
- Runtime type errors in production
- TypeScript errors when removing assertions

**Current codebase risk:** HIGH - Five instances of `as any` usage without runtime validation (lines 80, 106, 175, 253).

### Pitfall 15: JSON Configuration Syntax Errors
**What goes wrong:** Trailing commas, missing quotes, or invalid JSON in MCP client configuration files cause parsing failures and prevent server startup.

**Why it happens:** Manual editing of JSON files without linting or validation.

**Consequences:**
- Server fails to start
- Cryptic parsing error messages
- Time wasted debugging configuration

**Prevention:**
- Use JSON schema validation for config files
- Provide config file templates
- Implement config validation with clear error messages
- Use configuration UI instead of manual editing
- Document common mistakes

**Detection:**
- Server won't start with JSON parse errors
- Configuration changes break previously working setup

**Current codebase risk:** LOW - Configuration managed by Smithery CLI, not manual editing.

### Pitfall 16: No Structured Logging with Request Context
**What goes wrong:** Unstructured logs without request IDs or context make debugging production issues nearly impossible.

**Why it happens:** Using console.error() without correlation IDs or structured fields.

**Consequences:**
- Can't trace request flow through logs
- Difficult to correlate errors with user actions
- No metrics for monitoring
- Time-consuming incident investigation

**Prevention:**
- Use structured logging library (Winston, Pino)
- Include request/session IDs in all log entries
- Log at appropriate levels (debug, info, warn, error)
- Include context: tool name, user ID, timestamp
- Sanitize sensitive data before logging

**Detection:**
- Logs lack context for debugging
- Can't correlate log entries
- Multiple developers asking "which request was this?"

**Current codebase risk:** HIGH - No logging infrastructure observed. No request context tracking.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Initial MVP | Skipping error handling to move fast | Wrap tool handlers in error boundary from day 1 |
| Error Handling | Exposing stack traces to clients | Sanitize all errors before returning |
| Type Safety | Trusting TypeScript without runtime validation | Add Zod validation for API responses early |
| Authentication | Storing credentials in config files | Implement OAuth flow for production |
| Testing | Testing only happy path | Add integration tests for API failures, rate limits |
| Deployment | No monitoring/observability | Add structured logging and error tracking from start |
| Rate Limiting | Hammering API during development | Implement retry logic with backoff immediately |
| Session Security | Not validating authorization per-request | Verify auth on every inbound request |
| Transport Migration | stdio works, HTTP exposes state issues | Test with multiple concurrent HTTP clients |
| Pagination | Returning unbounded result sets | Enforce max limits, document pagination strategy |

## Security-Specific Pitfalls

### Pitfall 17: Confused Deputy (OAuth Proxy Pattern)
**What goes wrong:** If implementing OAuth proxy pattern, attackers can obtain authorization codes without user consent by exploiting static client IDs and consent cookies.

**Why it happens:** MCP proxy servers use single static client ID with third-party APIs while allowing dynamic MCP client registration.

**Prevention:**
- Implement per-client consent BEFORE third-party authorization
- Store consent decisions per client_id and user
- Validate state parameter matches approved consent
- Use exact string matching for redirect_uri
- Don't set consent cookies before user approval
- Implement CSRF protection on consent pages

**Current codebase risk:** N/A - Not implementing OAuth proxy pattern currently.

### Pitfall 18: Server-Side Request Forgery (SSRF)
**What goes wrong:** MCP clients following URLs from untrusted servers can be tricked into accessing internal network resources or cloud metadata endpoints.

**Why it happens:** OAuth metadata discovery fetches URLs from server-controlled fields without validation.

**Prevention:**
- Require HTTPS for all OAuth URLs (except localhost in dev)
- Block private IP ranges (10.0.0.0/8, 192.168.0.0/16, 169.254.0.0/16)
- Validate redirect targets before following
- Use egress proxies to enforce network policies
- Be aware of DNS rebinding (TOCTOU issues)

**Current codebase risk:** N/A - Server doesn't implement OAuth currently.

### Pitfall 19: Local Server Compromise
**What goes wrong:** Malicious startup commands in local MCP server configurations execute arbitrary code with user privileges.

**Why it happens:** Users install MCP servers from untrusted sources without reviewing startup commands.

**Prevention:**
- Show clear consent dialog before executing commands
- Display full command without truncation
- Warn about dangerous patterns (sudo, rm -rf, network operations)
- Sandbox server execution with restricted privileges
- Use stdio transport to limit access

**Current codebase risk:** LOW - Package published to npm with standard startup. Users should review before installation.

## Hostex API-Specific Gotchas

### Pitfall 20: Webhook 3-Second Timeout Window
**What goes wrong:** Webhook endpoints must acknowledge within 3 seconds or notifications are lost forever (no retry).

**Why it happens:** Hostex API has strict webhook timeout policy documented in their guide.

**Consequences:**
- Missed webhook events during slow processing
- Lost real-time updates for reservations/messages
- No automatic retry mechanism

**Prevention:**
- Acknowledge webhooks immediately (< 3s)
- Queue payload for async processing
- Don't perform API calls in webhook handler
- Monitor webhook processing time
- Implement manual polling backup for critical events

**Current codebase risk:** N/A - Webhooks not implemented in MCP server (create/list/delete only).

### Pitfall 21: API is in Beta with Active Development
**What goes wrong:** API v3.0.0 is marked as beta and "actively developing and refining features," meaning breaking changes are possible.

**Why it happens:** Hostex API is evolving rapidly, documented limitations may change.

**Consequences:**
- Schema changes break type assumptions
- New required fields cause validation failures
- Deprecated endpoints removed without notice
- Response formats change

**Prevention:**
- Monitor Hostex changelog regularly
- Implement runtime validation to detect schema changes
- Version lock API client library
- Add integration tests for API contract
- Subscribe to API change notifications
- Document API version in use

**Current codebase risk:** HIGH - No mechanism to detect API schema changes at runtime.

### Pitfall 22: Platform Integration Historical Data Sync Issues
**What goes wrong:** When connecting Trip.com or Booking.com to Hostex, historical reservations before connection aren't synchronized.

**Why it happens:** Trip.com API restrictions prevent historical sync; Booking.com resets calendars to 0 by default.

**Consequences:**
- Missing reservation data for past bookings
- Calendar conflicts from reset availability
- Need manual data entry for pre-connection period
- Risk of double bookings during migration

**Prevention:**
- Document migration process in user guides
- Warn users to pause listings during setup
- Implement manual import for historical data
- Verify calendar state after connection
- Test with sandbox accounts first

**Current codebase risk:** LOW - MCP server doesn't handle platform connections, but should document this in user guides.

## Testing Blind Spots

### Pitfall 23: Not Testing Error Paths
**What goes wrong:** Only testing successful API responses means error handling code is never validated until production.

**Why it happens:** Happy path is easier to test; error cases require mocking or special setup.

**Consequences:**
- Error handlers crash on first real error
- Poor error messages in production
- No validation that recovery logic works
- Discovered during incident response

**Prevention:**
- Test all error paths: network failures, 4xx/5xx responses, timeouts, rate limits
- Use MCP testing framework in-memory pattern
- Mock API client to return error conditions
- Validate error message quality
- Test concurrent error scenarios
- Use MCP Inspector for manual validation

**Current codebase risk:** CRITICAL - No tests exist. Error paths completely unvalidated.

### Pitfall 24: Not Testing with Multiple Concurrent Clients
**What goes wrong:** Single-client testing misses state leakage and race conditions that appear under concurrent load.

**Why it happens:** Developers test with MCP Inspector or single client only.

**Consequences:**
- State pollution between requests
- Race conditions in production
- Global state mutations visible across users
- Session management issues not discovered

**Prevention:**
- Test with multiple simultaneous HTTP client connections
- Validate session isolation
- Test concurrent tool invocations
- Use load testing tools for stress testing
- Verify no shared state mutations

**Current codebase risk:** HIGH - Global hostexClient instance shared across all requests. Never tested under concurrent load.

### Pitfall 25: No Protocol Compliance Validation
**What goes wrong:** Custom MCP implementations may violate protocol requirements that aren't caught until production.

**Why it happens:** Developers don't use official testing tools or validation frameworks.

**Consequences:**
- Client compatibility issues
- Protocol version mismatches
- Invalid JSON-RPC message formats
- Connection failures with specific clients

**Prevention:**
- Use MCP Inspector for protocol validation
- Test with multiple MCP clients (Claude, others)
- Validate JSON-RPC message format
- Check protocol version negotiation
- Test schema validation
- Verify response format compliance

**Current codebase risk:** MEDIUM - Using official SDK reduces risk, but never validated with Inspector or multiple clients.

## Sources

### MCP Protocol & Development
- [Implementing MCP: Tips, Tricks and Pitfalls | Nearform](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/)
- [Error Handling in MCP Servers - Best Practices Guide | MCPcat](https://mcpcat.io/guides/error-handling-custom-mcp-servers/)
- [MCP Server Troubleshooting Guide 2025 | Learn MCP](https://www.mcpstack.org/learn/mcp-server-troubleshooting-guide-2025)
- [Error Handling And Debugging MCP Servers - Stainless MCP Portal](https://www.stainless.com/mcp/error-handling-and-debugging-mcp-servers)
- [Security Best Practices - Model Context Protocol](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)

### Error Handling & Resilience
- [The 5 Commandments of Clean Error Handling in TypeScript | Medium](https://medium.com/with-orus/the-5-commandments-of-clean-error-handling-in-typescript-93a9cbdf1af5)
- [Resilient API Calls with ts-retry-promise](https://typescript.tv/best-practices/resilient-api-calls-with-ts-retry-promise/)
- [API Rate Limiting: Best Practices for 2025 | ORQ.ai](https://orq.ai/blog/api-rate-limit)
- [Complete Guide to Handling API Rate Limits](https://www.ayrshare.com/complete-guide-to-handling-rate-limits-prevent-429-errors/)
- [Mastering Error Handling in Node.js | Medium](https://medium.com/@govindaekbote7/mastering-error-handling-in-node-js-best-practices-for-robust-applications-a5d1af0e0f1e)

### Type Safety & Runtime Validation
- [Type-Safe API Calls with TypeScript and Zod | Michael Ouroumis Blog](https://www.michaelouroumis.com/en/blog/posts/type-safe-api-calls-typescript-zod)
- [How to Create Type-Safe API Clients in TypeScript](https://oneuptime.com/blog/post/2026-01-30-typescript-type-safe-api-clients/view)
- [Mastering TypeScript Type Guards | React News](https://typescriptworld.com/mastering-typescript-type-guards-a-comprehensive-guide-to-runtime-safety)

### Security
- [5 MCP Security Risks and Mitigation Strategies | TechTarget](https://www.techtarget.com/searchenterpriseai/tip/MCP-security-risks-and-mitigation-strategies)
- [Top 10 MCP Security Risks | Prompt Security](https://prompt.security/blog/top-10-mcp-security-risks)
- [Understanding MCP Security: Common Risks | Datadog](https://www.datadoghq.com/blog/monitor-mcp-servers/)
- [MCP Server API Key Management Best Practices - Stainless MCP Portal](https://www.stainless.com/mcp/mcp-server-api-key-management-best-practices)

### Testing
- [Unit Testing MCP Servers | MCPcat](https://mcpcat.io/guides/writing-unit-tests-mcp-servers/)
- [How to Test MCP Servers - Stainless MCP Portal](https://www.stainless.com/mcp/how-to-test-mcp-servers)
- [MCP Integration Testing Guide | MCPcat](https://mcpcat.io/guides/integration-tests-mcp-flows/)
- [Testing your FastMCP Server](https://gofastmcp.com/patterns/testing)

### Hostex API
- [Hostex OpenAPI Overview](https://hostex-openapi.readme.io/reference/overview)
- [Hostex Changelog](https://changelog.hostex.io/)
- [Webhook Usage Guide | Hostex](https://hostex-openapi.readme.io/reference/webhook-useage-guide)
