# Roadmap: Hostex MCP Server

## Overview

Transform the 370-line Hostex MCP server prototype into a production-ready implementation through security-first, foundation-up incremental refactoring. Beginning with critical vulnerability fixes and error handling, progressing through type safety and comprehensive testing, then modular architecture extraction, and culminating in production-grade resilience and documentation. The roadmap delivers a maintainable, well-tested MCP server that enables reliable vacation rental management workflows through Claude Desktop and other MCP clients.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security Foundations & Critical Fixes** - Eliminate vulnerabilities and prevent server crashes
- [x] **Phase 2: Type Safety & API Response Validation** - Eliminate runtime type gaps and catch API changes
- [ ] **Phase 3: Testing Infrastructure & Initial Coverage** - Establish comprehensive testing to prevent regressions
- [ ] **Phase 4: Architecture, Resilience & Production Readiness** - Modular structure with production-grade reliability

## Phase Details

### Phase 1: Security Foundations & Critical Fixes
**Goal**: Server can handle errors gracefully without crashing and has no critical security vulnerabilities
**Depends on**: Nothing (first phase)
**Requirements**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008
**Success Criteria** (what must be TRUE):
  1. MCP SDK updated to 1.27.0 and Zod upgraded to v4.x with zero dependency vulnerabilities
  2. All 22 tool handlers wrapped in error handling that prevents server crashes
  3. Structured logging writes only to stderr without contaminating stdout
  4. Configuration validates on startup with Zod schemas and fails fast on misconfiguration
  5. Input validation enforces constraints (max limits, regex patterns, date ranges)
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Upgrade MCP SDK to 1.27.0, Zod to v4, resolve vulnerabilities
- [ ] 01-02-PLAN.md — Create Pino logger + error handler, wrap all 22 tool handlers
- [ ] 01-03-PLAN.md — Config validation at startup, enhanced input validation constraints

### Phase 2: Type Safety & API Response Validation
**Goal**: All type assertions eliminated with runtime validation catching API schema changes
**Depends on**: Phase 1 (needs error handling for validation failures)
**Requirements**: REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014
**Success Criteria** (what must be TRUE):
  1. Zero `as any` type assertions remain in codebase
  2. Zod response schemas validate all Hostex API responses before usage
  3. Proper TypeScript types extracted from hostex-ts library
  4. Type-safe error responses follow structured format
  5. Response sanitization prevents information leakage in errors
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Build hostex-ts type aliases plus reusable envelope/data validation foundation
- [x] 02-02-PLAN.md — Remove all five `as any` and apply mandatory runtime response validation in handlers
- [x] 02-03-PLAN.md — Enforce structured sanitized errors and restore `noImplicitAny` strictness

### Phase 3: Testing Infrastructure & Initial Coverage
**Goal**: Comprehensive test coverage protects against regressions during refactoring
**Depends on**: Phase 2 (needs stable types and error handling)
**Requirements**: REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022
**Success Criteria** (what must be TRUE):
  1. Vitest framework configured with coverage reporting
  2. Unit tests exist for all 22 tool handlers with mocked hostex-ts client
  3. Integration tests verify MCP protocol compliance on stdio and shttp transports
  4. E2E smoke tests validate all tools work against real Hostex API
  5. Concurrent client tests verify no state leakage between requests
  6. Test coverage exceeds 80% across all modules
  7. MCP Inspector compatibility validated
**Plans:** 6 plans

Plans:
- [ ] 03-01-PLAN.md — Establish Vitest projects, coverage gates, fixtures/factories, and shared test harnesses
- [ ] 03-02-PLAN.md — Add deterministic unit tests for all 22 handlers with hostex-ts boundary mocks
- [ ] 03-03-PLAN.md — Verify stdio/shttp protocol compliance, concurrency isolation, and MCP Inspector CLI compatibility
- [ ] 03-04-PLAN.md — Add helper/schema regression tests to lock >80% coverage and sanitization guarantees
- [ ] 03-05-PLAN.md — Execute env-gated real Hostex API E2E smoke coverage for all 22 tools
- [ ] 03-06-PLAN.md — Close fail-closed empty-data contract gaps and restore green coverage verification

### Phase 4: Architecture, Resilience & Production Readiness
**Goal**: Production-ready modular server with retry logic, monitoring, and complete documentation
**Depends on**: Phase 3 (needs test coverage to refactor safely)
**Requirements**: REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-044, REQ-045, REQ-046
**Success Criteria** (what must be TRUE):
  1. Codebase organized into ~15 modular files (70-100 lines each) with clear domain separation
  2. Configuration, client factory, error handling, types, and utilities extracted to separate modules
  3. Tools organized by domain (properties, reservations, conversations, reviews, webhooks, listings, meta)
  4. Retry logic with exponential backoff handles transient failures automatically
  5. Rate limit awareness parses X-RateLimit headers and throttles requests
  6. Per-request client instances prevent global state leakage
  7. Performance monitoring tracks tool latency, error rates, and usage patterns
  8. CI/CD pipeline runs automated tests, linting, and security scans
  9. Health check endpoint available for deployment monitoring
  10. Complete README documents setup, configuration, and usage with examples
  11. All 22 tools validated end-to-end with real Hostex API credentials
  12. MCP server works with Claude Desktop, Poke, and standard MCP clients
  13. Known Hostex API limitations documented (webhook timeouts, sync issues)
**Plans**: TBD (1-3 plans)

Plans:
- [ ] 04-01: [TBD during planning]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Foundations | 0/3 | Planned | - |
| 2. Type Safety | 3/3 | Complete | 2026-02-17 |
| 3. Testing Infrastructure | 0/TBD | Not started | - |
| 4. Architecture & Resilience | 0/TBD | Not started | - |

---

**Traceability:** All 46 active requirements (REQ-001 through REQ-046) mapped to phases.
**Last updated:** 2026-02-17 during phase 2 execution
