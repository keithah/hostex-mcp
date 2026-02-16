# Hostex MCP Server

## What This Is

A Model Context Protocol (MCP) server that enables AI assistants (Claude Desktop, Poke, etc.) to interact with the Hostex vacation rental management platform. Provides tools for reading and managing properties, reservations, guest information, and related vacation rental operations through a standardized MCP interface.

## Core Value

Users can complete real vacation rental management workflows end-to-end through AI assistants - checking reservations, managing properties, handling guest communications - with reliable Hostex API integration.

## Requirements

### Validated

<!-- Existing capabilities inferred from codebase -->

- ✓ MCP server structure exists — existing
- ✓ 22 Hostex tool handlers defined — existing
- ✓ Basic TypeScript implementation — existing
- ✓ Hostex API client integration via hostex-ts — existing

### Active

<!-- Current scope - bringing server to production quality -->

- [ ] All MCP tools execute successfully against real Hostex API
- [ ] MCP protocol compliance - works with Claude Desktop, Poke, and standard MCP clients
- [ ] Comprehensive error handling across all tool handlers
- [ ] Type safety throughout - eliminate `as any` coercions
- [ ] Test coverage for all tools and workflows
- [ ] End-to-end workflow validation with real API credentials
- [ ] Modern code quality - proper patterns, logging, monitoring
- [ ] hostex-ts client library updated and modernized
- [ ] Complete documentation - setup, usage, examples
- [ ] Security vulnerabilities in dependencies resolved
- [ ] MCP server conforms to mcp-server-template and typescript-example patterns

### Out of Scope

- Multi-user support — deferred, single-user deployment sufficient for v1
- Airbnb authentication and review posting — v2 feature, requires separate OAuth implementation
- Backward compatibility — nobody using current version, breaking changes acceptable
- Database persistence — API-only integration for v1

## Context

**Existing codebase state:**
- Single 370-line monolith implementation (`.smithery/shttp/index.cjs`)
- TypeScript MCP server with 22 Hostex tool handlers
- Zero test coverage currently
- Type safety issues - 4 locations using `as any` coercions
- No error handling on any tool handlers
- Known security vulnerabilities: MCP SDK (8 versions behind), qs DoS, Lodash prototype pollution
- Uses @modelcontextprotocol/sdk and @smithery/sdk
- Companion library: hostex-ts at ~/src/hostex-ts

**What works:**
- Basic MCP server structure in place
- Hostex API integration via hostex-ts library
- Tools defined for properties, reservations, guests, etc.

**What needs work:**
- Never validated against real Hostex API
- Doesn't conform to MCP protocol standards
- Code quality issues (no tests, poor types, no error handling)
- Dependency security vulnerabilities
- Not aligned with mcp-server-template / typescript-example patterns

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
| No backward compatibility | Nobody using current version | — Pending |
| Proactive hostex-ts update | Modernize both server and client together | — Pending |
| Real API validation required | Can't ship untested integration | — Pending |

---
*Last updated: 2026-02-16 after initialization*
