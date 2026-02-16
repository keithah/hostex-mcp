# Codebase Concerns

**Analysis Date:** 2026-02-16

## Security Vulnerabilities

**Critical MCP SDK Issues:**
- Issue: `@modelcontextprotocol/sdk <=1.25.3` contains multiple high-severity vulnerabilities including DNS rebinding protection bypass, ReDoS vulnerability, and cross-client data leak via shared server/transport instance reuse
- Files: `package.json` (dependency specification)
- Impact: Running instances could be exploited for denial of service, protocol manipulation, or data exposure between concurrent clients
- Current mitigation: None active - vulnerable version `^1.0.4` is installed
- Fix approach: Upgrade to `@modelcontextprotocol/sdk ^1.26.0` or later to patch all three vulnerabilities

**Transitive Dependency Vulnerabilities:**
- Issue: `qs` package has arrayLimit bypass vulnerabilities allowing DoS via memory exhaustion (GHSA-6rw7-vpxm-498p, GHSA-w7fw-mjwx-w883)
- Files: `package-lock.json` (transitive dependency through express/body-parser)
- Impact: Malicious requests with deeply nested query parameters could exhaust server memory
- Current mitigation: None active
- Fix approach: Run `npm audit fix` to update transitive dependencies, or update body-parser and express

**Lodash Prototype Pollution:**
- Issue: `lodash` 4.0.0-4.17.21 has prototype pollution vulnerability in `_.unset` and `_.omit` functions
- Files: `package-lock.json` (transitive dependency)
- Impact: Could allow arbitrary property injection in processed objects
- Current mitigation: None active
- Fix approach: Run `npm audit fix` to update to patched version

## Type Safety Issues

**Unchecked Type Coercion:**
- Issue: Multiple tool handlers use `as any` to bypass TypeScript type checking, hiding potential runtime errors
- Files: `src/index.ts` (lines 80, 106, 192, 253)
- Patterns:
  - Line 80: `const result = await hostexClient.listReservations(params as any);`
  - Line 106: `const result = await hostexClient.createReservation(data as any);`
  - Line 192: `const result = await hostexClient.updateAvailabilities(data as any);`
  - Line 253: `const result = await hostexClient.listReviews(params as any);`
- Impact: No compile-time validation of parameter shapes; invalid parameters pass TypeScript but fail at runtime
- Safe modification: Extract proper types from `hostex-ts` package and use them instead of `as any`, or define explicit interfaces that match the expected API
- Priority: High - affects 4 critical data mutation and query operations

**Weakly Typed Custom Fields:**
- Issue: `z.record(z.any())` on line 157 accepts any key-value structure without validation
- Files: `src/index.ts` (line 157)
- Impact: Malformed data could be sent to Hostex API; no validation of field names or value types
- Safe modification: Define a stricter schema with known custom field names and their types, or use regex validation on field names

## Error Handling

**No Error Handling:**
- Issue: No try-catch blocks or error handling in any tool handlers
- Files: `src/index.ts` (all tool handler functions, lines 43-356)
- Impact: API errors from `hostexClient` (network failures, invalid tokens, rate limits) are unhandled; these propagate as crashes instead of user-friendly errors
- Improvement path: Wrap all `await hostexClient.*()` calls in try-catch blocks; return structured error responses with error messages and codes

**Empty Error Responses:**
- Issue: Some handlers don't inspect response data for embedded errors
- Files: `src/index.ts` (all handlers returning `result` or `result.data` directly)
- Impact: API error responses may be returned as data to clients without clear indication of failure
- Improvement path: Check response status/error fields before returning; throw errors for non-success responses

## Dependency Management

**High Drift on Core Dependencies:**
- Issue: Multiple critical dependencies are outdated with available major/minor updates:
  - `@modelcontextprotocol/sdk`: installed 1.18.2, latest 1.26.0 (8 minor versions behind)
  - `@smithery/cli`: installed 1.4.2, latest 4.0.1 (major version update available)
  - `@smithery/sdk`: installed 1.6.6, latest 4.0.1 (major version update available)
  - `hostex-ts`: installed 0.1.1, latest 0.2.0 (1 minor version behind)
  - `zod`: installed 3.25.76, latest 4.3.6 (major version update available)
- Files: `package.json`
- Impact: Missing bug fixes, performance improvements, and security patches; newer APIs may have breaking changes requiring code updates
- Current mitigation: GitHub Actions workflow checks `hostex-ts` hourly and creates PRs, but manual process for other dependencies
- Fix approach: Systematically upgrade and test each dependency; prioritize `@modelcontextprotocol/sdk` for security; test Smithery major version upgrade

## Test Coverage Gaps

**No Tests Exist:**
- Issue: Zero automated tests in the project
- Files: No test files found in repository (only test files in `node_modules/`)
- Impact: Changes cannot be validated without manual testing; regression bugs are undetected; tool implementations are untested
- Priority: High - 22 tools and a critical API integration deserve test coverage
- Test coverage gaps:
  - Tool parameter validation not tested
  - Hostex API integration not tested
  - Error conditions not tested
  - Concurrent request handling not tested

**No Integration Tests:**
- Issue: No testing of interaction between MCP server, Smithery transport, and Hostex API
- Impact: Transport-specific bugs (stdio vs shttp) are only found during manual testing
- Improvement path: Add integration tests that mock Hostex API and verify end-to-end tool execution

## Known Limitations (By Design)

**API Limit Enforcement:**
- Issue: Tools document API limits (max 100 results, max 100 properties) but don't enforce them in validation
- Files: `src/index.ts` (lines 40, 55, 170)
- Patterns:
  - `limit: z.number().optional().describe("Maximum results to return, max 100 (default: 20)")` - no `max(100)`
  - `property_ids: z.string().describe("Comma-separated property IDs (max 100)")` - no validation
- Impact: Users can request >100 results or properties; requests fail at API level with unclear error
- Safe modification: Add zod validators: `.max(100)` for limits, regex validation for property_ids comma-separated lists

**Channel Booking Limitation:**
- Issue: `hostex_cancel_reservation` tool explicitly does not support channel bookings
- Files: `src/index.ts` (line 114 comment)
- Impact: Users cannot cancel non-direct bookings; limitation not validated in schema
- Improvement path: Consider adding a tool for cancelling channel bookings if API supports it, or add input validation to reject channel reservation codes

## Fragile Areas

**Single File Monolith:**
- Issue: All 22 tools and 370 lines of business logic in one file
- Files: `src/index.ts`
- Why fragile: Adding new tools or modifying existing ones carries risk of breaking others; testing individual tools requires running entire server; no clear separation of concerns
- Safe modification: Extract tools into separate modules (`src/tools/properties.ts`, `src/tools/reservations.ts`, etc.) with individual exports, then import in `createServer`; this allows easier testing and maintenance
- Priority: Medium - manageable at current size but will become critical with more tools

**Hard-Coded Hostex Client Configuration:**
- Issue: Client initialized with only `accessToken`, no configurable base URL or other options
- Files: `src/index.ts` (lines 30-32)
- Impact: Cannot test against staging/sandbox; locked to production Hostex API
- Safe modification: Extract additional config options (baseUrl, timeout, retries) and pass to HostexClient initialization

**Build Script Complexity:**
- Issue: Build script includes hacky workaround: `echo '#!/usr/bin/env node' | cat - .smithery/stdio/index.cjs > temp && mv temp`
- Files: `package.json` (line 15)
- Impact: Non-portable (fails on Windows); maintenance burden; fragile if file format changes
- Safe modification: Use native Node.js file operations in build script or request feature in Smithery CLI to add shebang automatically

## Scaling Limits

**Single Tool Instance:**
- Issue: All requests to all tools serialized through single Hostex API client instance
- Files: `src/index.ts` (lines 30-32)
- Current capacity: Limited by API rate limits; no connection pooling or batching
- Limit: Hostex API rate limits unknown (typically 100-1000 req/min for REST APIs); no backoff/retry implemented
- Scaling path: Implement rate limit handling with exponential backoff; consider request queuing for high-volume scenarios

**In-Memory State:**
- Issue: No caching; every request hits Hostex API
- Impact: High latency for repeated queries; vulnerable to rate limiting
- Scaling path: Add optional Redis/in-memory cache for read operations (properties, room types) with TTL

## Missing Critical Features

**No Request Logging/Monitoring:**
- Issue: No logging of tool invocations, parameters, or responses
- Impact: Debugging production issues is blind; audit trail absent
- Blocks: SLA enforcement, compliance, debugging customer issues
- Improvement path: Add structured logging to all tool handlers using Winston or Pino; log parameters, response times, errors

**No API Response Validation:**
- Issue: Responses from Hostex API are returned directly without validation
- Impact: If API schema changes, invalid data reaches clients; no type safety on responses
- Improvement path: Define zod schemas for all API responses; validate before returning to clients

**No Retry Logic:**
- Issue: Failed API requests fail immediately without retry
- Impact: Transient network issues cause failures that could succeed on retry
- Improvement path: Implement exponential backoff retry logic for network errors and 5xx responses

## Security Considerations

**API Token Exposure:**
- Issue: Hostex API token passed via environment variable or config; no encryption in transit verification
- Files: `src/index.ts` (line 31), README.md (lines 82, 96)
- Risk: Token could be logged, exposed in error messages, or transmitted over unencrypted connections
- Current mitigation: Smithery/MCP protocol presumably uses TLS for HTTPS transport; stdio transport inherits host security
- Recommendations: Add validation that token is never logged; add warning if used over non-HTTPS; consider supporting token refresh/expiration

**Unvalidated Custom Channel IDs:**
- Issue: `custom_channel_id` parameter (line 91) accepts any number without validation
- Risk: Invalid IDs could cause API errors or return wrong data
- Recommendations: Add whitelist validation against `listCustomChannels()` response

**No Rate Limit Headers Handling:**
- Issue: No inspection of rate limit headers from Hostex API responses
- Impact: Cannot detect approaching rate limits; will hit hard limits before backing off
- Recommendations: Parse `X-RateLimit-*` headers from responses; implement client-side throttling

## Dependencies at Risk

**hostex-ts Coupling:**
- Risk: Project tightly coupled to `hostex-ts` library; all API interactions go through it
- Impact: If library stops being maintained or has breaking changes, significant refactoring required
- Current status: Library at 0.1.1, suggesting early-stage (pre-1.0); API may not be stable
- Migration plan: Monitor library for maintenance; consider abstracting API calls behind a service layer to reduce coupling; if unmaintained, fork or switch to official Hostex SDK

**Smithery CLI Instability:**
- Risk: Smithery CLI is core to build process; majors version updates available (1.4.2 → 4.0.1)
- Impact: Build reproducibility issues; unclear what changed in major versions
- Current status: Latest version 4.0.1 likely has significant changes
- Migration plan: Document Smithery upgrade requirements; test 4.0.1 upgrade thoroughly before adopting

---

*Concerns audit: 2026-02-16*
