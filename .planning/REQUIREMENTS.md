# Requirements

**Project:** Hostex MCP Server
**Version:** 1.0 (Modernization)
**Last Updated:** 2026-02-16

## Overview

Modernize existing Hostex MCP server from 370-line prototype to production-ready implementation with security, reliability, and maintainability. Security-first, foundation-up incremental refactoring approach.

## Validated Requirements

<!-- Existing capabilities from codebase -->

- **REQ-V001**: MCP server structure exists with stdio/shttp dual transport
- **REQ-V002**: 22 Hostex tool handlers defined covering properties, reservations, guests, conversations
- **REQ-V003**: TypeScript implementation with basic type definitions
- **REQ-V004**: Hostex API client integration via hostex-ts library
- **REQ-V005**: Smithery SDK integration for dual-transport support

## Active Requirements

<!-- Organized by 5-phase structure from research -->

### Phase 1: Security Foundations & Critical Fixes

**Goal:** Eliminate critical security vulnerabilities and prevent server crashes

- **REQ-001**: Update MCP SDK from 1.0.4 to 1.27.0 (8 versions behind, security patches needed)
- **REQ-002**: Update Zod from v3.25.76 to v4.x (required peer dependency for SDK 1.27.0)
- **REQ-003**: Resolve dependency vulnerabilities (qs DoS, Lodash prototype pollution)
- **REQ-004**: Add error handling wrapper to all 22 tool handlers (prevent server crashes)
- **REQ-005**: Implement structured logging to stderr only (prevent stdout contamination / Error -32000)
- **REQ-006**: Enhance input validation with constraints (max limits, regex patterns, date ranges)
- **REQ-007**: Validate configuration on startup with Zod schemas (fail-fast on misconfiguration)
- **REQ-008**: Add tool invocation logging (track usage, errors, performance)

### Phase 2: Type Safety & API Response Validation

**Goal:** Eliminate runtime type safety gaps and prevent crashes from API changes

- **REQ-009**: Eliminate all 5 `as any` type assertions with proper type extraction from hostex-ts
- **REQ-010**: Create Zod response schemas for all Hostex API endpoints
- **REQ-011**: Add runtime validation layer before type assertions (catch API schema changes)
- **REQ-012**: Extract proper TypeScript types from hostex-ts (verify type exports)
- **REQ-013**: Implement type-safe error responses with structured format
- **REQ-014**: Add response sanitization to prevent information leakage

### Phase 3: Testing Infrastructure & Initial Coverage

**Goal:** Establish comprehensive testing to prevent regressions

- **REQ-015**: Set up Vitest ^2.x testing framework with @vitest/coverage-v8
- **REQ-016**: Create unit tests for all tool handlers with mocked hostex-ts client
- **REQ-017**: Add integration tests for MCP protocol compliance (stdio/shttp)
- **REQ-018**: Implement E2E smoke tests with real Hostex API (validate all 22 tools work)
- **REQ-019**: Add concurrent client testing (verify no state leakage between requests)
- **REQ-020**: Set up test fixtures and factories for Hostex API responses
- **REQ-021**: Achieve >80% code coverage across all modules
- **REQ-022**: Add MCP Inspector compatibility validation

### Phase 4: Modular Architecture Refactor

**Goal:** Transform 370-line monolith into maintainable modular structure

- **REQ-023**: Extract configuration layer (config/) with environment validation
- **REQ-024**: Extract API client factory (client/) with dependency injection pattern
- **REQ-025**: Extract centralized error handling (handlers/) for structured responses
- **REQ-026**: Extract shared type definitions (types/) with Zod schemas
- **REQ-027**: Extract utility functions (utils/) for logging and validation helpers
- **REQ-028**: Organize tools into domain modules (properties, reservations, conversations, reviews, webhooks, listings, meta)
- **REQ-029**: Implement modular tool registration pattern (registerAllTools composition)
- **REQ-030**: Reduce file sizes to 70-100 lines per file (~15 files total)
- **REQ-031**: Update hostex-ts library if needed (verify/fix type exports, patterns)

### Phase 5: Resilience & Observability

**Goal:** Add production-grade reliability and monitoring

- **REQ-032**: Implement retry logic with exponential backoff for transient failures
- **REQ-033**: Add rate limit awareness (parse X-RateLimit headers, client-side throttling)
- **REQ-034**: Implement timeout configuration for all API calls (prevent hung connections)
- **REQ-035**: Create per-request client instances (fix global state leakage risk)
- **REQ-036**: Add performance monitoring (track tool latency, error rates, usage patterns)
- **REQ-037**: Implement pagination helpers for large result sets (auto-paginate with metadata)
- **REQ-038**: Set up CI/CD pipeline (automated testing, linting, security scans)
- **REQ-039**: Add health check endpoint for deployment monitoring

### Documentation & Validation

**Goal:** Complete documentation and end-to-end validation

- **REQ-040**: Enhance tool descriptions for accurate LLM tool selection
- **REQ-041**: Create comprehensive README (setup, configuration, usage examples)
- **REQ-042**: Document all Hostex API endpoints used with rate limits and constraints
- **REQ-043**: Add setup instructions (API key configuration, environment variables)
- **REQ-044**: Validate complete end-to-end workflows with real Hostex API credentials
- **REQ-045**: Test MCP server with Claude Desktop, Poke, and other MCP clients
- **REQ-046**: Document known Hostex API limitations (3s webhook timeout, beta status, sync issues)

## Out of Scope

<!-- Explicitly deferred to v2 or beyond -->

- **Multi-user support** — Single-user deployment sufficient for v1, OAuth/multi-tenant deferred
- **Airbnb authentication and review posting** — v2 feature, separate OAuth implementation required
- **Backward compatibility** — Breaking changes acceptable, nobody using current version
- **Database persistence** — API-only integration for v1, no local caching or storage
- **MCP Resources** — No clear use case yet, tools cover API needs adequately
- **OpenTelemetry integration** — Enterprise observability, structured logs sufficient for v1
- **Advanced caching layer** — Adds complexity, API freshness preferred for v1
- **Prompt templates** — Workflow templates for common tasks (handle_checkin) can wait for v2
- **SDK v2 migration** — Plan as future phase after Q1 2026 release, migrate to v1.27.0 for now

## Constraints

- **Quality over speed**: Take time to do it right, no rush on delivery
- **Breaking changes OK**: Nobody using current version, can redesign freely
- **MCP Standards**: Must conform to MCP protocol specification for client compatibility
- **Real API validation**: Must test against actual Hostex API, not just mocks
- **Incremental refactoring**: Each phase must deliver working code, not break existing functionality
- **Security-first**: Address vulnerabilities and error handling before features

## Success Criteria

**v1 is complete when:**

1. All 46 active requirements (REQ-001 through REQ-046) are implemented
2. All 22 MCP tools execute successfully against real Hostex API
3. MCP server works with Claude Desktop, Poke, and standard MCP clients
4. Test coverage >80% with unit, integration, and E2E tests passing
5. Zero critical security vulnerabilities in dependencies
6. Code organized in modular structure (~15 files, 70-100 lines each)
7. Complete documentation (README, setup, usage examples)
8. End-to-end vacation rental workflows validated (check-in, reservations, guest communication)
9. CI/CD pipeline running automated tests and security scans
10. Production-ready error handling, logging, retry logic, and monitoring in place

## Dependencies

- **External**: Hostex API access (user can provide API key)
- **Libraries**: @modelcontextprotocol/sdk 1.27.0, Zod v4, Vitest ^2.x, hostex-ts (may need updates)
- **Phase ordering**: Security → Type Safety → Testing → Architecture → Resilience (each depends on previous)
- **Research needs**: Phase 3 (Testing patterns) and Phase 5 (Resilience strategies) may need research-phase before planning

## Open Questions

- **SDK v2 timing**: Q1 2026 is broad window (Feb vs March vs April) — when to plan migration? _(Decision: migrate to v1.27.0 now, plan v2 as future phase)_
- **Hostex API rate limits**: Not documented, may need empirical discovery or Hostex support contact
- **Staging environment**: Hostex doesn't clearly provide staging API, may need production with test data
- **hostex-ts type exports**: Need to verify if types are exported properly or require redefinition
- **Webhook signature verification**: Does Hostex API provide signature verification for security?

---

*This requirements document is a living artifact. Update as scope evolves, decisions are made, or constraints change.*
