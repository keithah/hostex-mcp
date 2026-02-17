# Phase 3: Testing Infrastructure & Initial Coverage - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish comprehensive test infrastructure and initial coverage for all 22 Hostex MCP tools so regressions are caught early during refactoring. This phase covers unit, integration, and env-gated real-API smoke testing behavior and evidence standards.

</domain>

<decisions>
## Implementation Decisions

### MCP interaction model (token-efficient)
- Design MCP usage around code execution patterns to minimize token usage in testing and agent workflows.
- Prefer progressive tool disclosure over loading full tool definitions up front.
- Keep intermediate results in the execution environment; avoid routing large payloads through model context.

### Tool discovery and payload flow
- Use discovery-first interaction (`search_tools`-style behavior with detail levels such as name/summary/full) so only needed definitions are loaded.
- Favor handle/file-based chaining for large outputs (references/artifacts) instead of inlining full results across steps.
- Return compact summaries by default; expand only when explicitly required for debugging or verification.

### Test evidence expectations
- Coverage and verification evidence should emphasize concise, high-signal outputs (pass/fail, thresholds, failing IDs, artifact paths).
- Large debug artifacts should be written to files and referenced, not pasted into normal execution output.

### Claude's Discretion
- Exact wrapper file layout and naming for code-execution-facing MCP tool surfaces.
- Exact summary size limits and projection defaults per tool domain.
- Exact command/script structure used to produce compact verification artifacts.

</decisions>

<specifics>
## Specific Ideas

- Reference direction: Anthropic engineering article "Code execution with MCP: Building more efficient agents" (2025-11-04).
- Optimization target: minimize context/token overhead from both tool definitions and intermediate tool results.

</specifics>

<deferred>
## Deferred Ideas

- Full production-wide migration of all non-test agent workflows to a code-mode MCP runtime (capture for future phase if broader than Phase 3 testing scope).

</deferred>

---

*Phase: 03-testing-infrastructure-initial-coverage*
*Context gathered: 2026-02-16*
