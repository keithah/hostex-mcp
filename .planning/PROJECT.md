# Hostex MCP Server

## What This Is

A Model Context Protocol (MCP) server that enables AI assistants (Claude Desktop, Poke, etc.) to interact with the Hostex vacation rental management platform. Provides tools for reading and managing properties, reservations, guest information, and related vacation rental operations through a standardized MCP interface.

## Core Value

Users can complete real vacation rental management workflows end-to-end through AI assistants - checking reservations, managing properties, handling guest communications - with reliable Hostex API integration.

## Current State

**Shipped version:** v1.0 Modernization (2026-02-17)

- Production-hardened MCP server with 22 Hostex tools validated across unit, integration, and live API smoke workflows.
- Modular architecture with composition-root registration, extracted shared modules, and resilient Hostex gateway boundaries.
- Operational readiness in place: CI quality/security gates, health/readiness/metrics routes, and deployment/client-validation documentation.

## Next Milestone Goals

- Define v1.1 scope from fresh requirements (new REQUIREMENTS.md).
- Prioritize follow-up work discovered during v1.0 verification (SDK v2 migration plan, webhook signature verification clarity, runtime caveat reduction).
- Preserve shipped reliability baseline while adding next-value capabilities.

## Requirements

### Validated

<!-- Existing capabilities inferred from codebase -->

- ✓ MCP server structure exists — existing
- ✓ 22 Hostex tool handlers defined — existing
- ✓ Basic TypeScript implementation — existing
- ✓ Hostex API client integration via hostex-ts — existing
- ✓ All MCP tools execute successfully against real Hostex API — v1.0
- ✓ MCP protocol compliance with Claude Desktop, Poke, Inspector, and standard MCP clients — v1.0
- ✓ Comprehensive error handling and sanitized error contracts across tool handlers — v1.0
- ✓ Type safety hardening with runtime schema validation and strict TypeScript guardrails — v1.0
- ✓ Test infrastructure with broad unit/integration/live smoke coverage and coverage threshold enforcement — v1.0
- ✓ Modular architecture extraction, resilience controls, and production documentation — v1.0

### Active

<!-- Current scope - bringing server to production quality -->

- [ ] Define and deliver next milestone requirements (v1.1 scope TBD)
- [ ] Plan and execute MCP SDK v2 migration strategy
- [ ] Confirm and implement webhook signature verification if supported by Hostex
- [ ] Reduce known local runtime caveats in OpenCode stdio client path

### Out of Scope

- Multi-user support — deferred, single-user deployment sufficient for v1
- Airbnb authentication and review posting — v2 feature, requires separate OAuth implementation
- Backward compatibility — nobody using current version, breaking changes acceptable
- Database persistence — API-only integration for v1

## Context

**Existing codebase state:**
- Shipped modularized server architecture with extracted tool domains and shared dependency wiring
- 22 tools covered by test matrix and live Hostex API validation workflows
- Security and type-safety hardening complete for v1 scope
- Observability and operational endpoints available for production monitoring
- Uses @modelcontextprotocol/sdk 1.27.0, Zod v4, Vitest, and hostex-ts 0.2.0

**What works:**
- Basic MCP server structure in place
- Hostex API integration via hostex-ts library
- Tools defined for properties, reservations, guests, etc.

**What needs work:**
- Define and execute next milestone scope (new requirements baseline)
- Evaluate and schedule MCP SDK v2 migration
- Resolve remaining external dependency and runtime caveat follow-ups

**API access:**
- User can provide Hostex API key for validation
- Real-world testing against production Hostex data available

## Constraints

- **Quality over speed**: Take time to do it right - no rush
- **Breaking changes OK**: Nobody using current version, can redesign freely
- **MCP Standards**: Must conform to MCP protocol specification
- **Real API validation**: Must test against actual Hostex API, not mocks

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No backward compatibility | Nobody using current version | ✓ Good |
| Proactive hostex-ts update | Modernize both server and client together | ✓ Good |
| Real API validation required | Can't ship untested integration | ✓ Good |

---
*Last updated: 2026-02-17 after v1.0 milestone completion*
