# Client Validation Matrix

This document defines reproducible validation steps for MCP client compatibility and real Hostex API behavior.

## Preconditions

- `HOSTEX_ACCESS_TOKEN` is available.
- Artifacts are built: `npm run build:all`.
- Validation commands run from repository root.

## Automated Baseline Evidence

Run these first:

```bash
node scripts/verify-client-matrix.ts
HOSTEX_E2E_ENABLED=true npm run test:e2e -- --run
node scripts/verify-live-api-validation.ts
```

## Client Matrix

| Client path | Transport | Verification type | Required evidence |
| --- | --- | --- | --- |
| Claude Desktop | stdio | Human + command-backed | `tools/list` includes Hostex tools and one successful tool call |
| Poke | stdio or shttp | Human + command-backed | `tools/list` includes Hostex tools and one successful tool call |
| OpenCode (local MCP client path) | stdio | Human + command-backed (known caveat) | `tools/list` may pass while sample tool call can fail with runtime client mismatch |
| MCP Inspector CLI | stdio | Fully automated | `node scripts/verify-inspector-compat.ts` passes |
| Streamable HTTP client | shttp | Command-backed | HTTP handshake succeeds and one Hostex tool call returns non-error payload |

## Claude Desktop Validation

1. Configure MCP server entry with `HOSTEX_ACCESS_TOKEN` (see `README.md`).
2. Restart Claude Desktop.
3. Confirm tools are visible (`tools/list` equivalent from Claude tool picker).
4. Execute one safe tool call, recommended: `hostex_list_properties` with `offset=0`, `limit=5`.
5. Confirm response contains structured property data or expected empty list payload (not sanitized error).

Pass criteria:

- Hostex tools appear in client.
- At least one Hostex tool call succeeds.

## Poke Validation

1. Configure hostex-mcp server using either stdio artifact or streamable HTTP endpoint.
2. Open Poke connection and run `tools/list`.
3. Execute one safe tool call, recommended: `hostex_list_properties`.
4. Confirm response is non-error structured payload.

Pass criteria:

- Hostex tools are discoverable.
- At least one tool call succeeds against the configured token.

## Standard MCP Client Paths

### OpenCode local stdio path (known caveat)

Observed mismatch from human verification:

- Local server command: `node /home/keith/src/hostex-mcp/.smithery/stdio/index.cjs accessToken=test-access-token`
- Tool call: `hostex_list_properties` with `{offset:0, limit:1}`
- Result: `{"type":"runtime_error","tool":"hostex_list_properties","category":"runtime","message":"(0 , kf.default) is not a function","issues":[]}`

Current guidance:

- Treat this OpenCode stdio result as a known client caveat for now.
- Use Claude Desktop, Poke, and Inspector results as release-gating evidence until this runtime mismatch is resolved.
- Track follow-up investigation for the `.smithery/stdio/index.cjs` runtime import path causing `kf.default` failures.

### Inspector CLI (stdio)

```bash
node scripts/verify-inspector-compat.ts
```

### Streamable HTTP

Use the hosted endpoint or local HTTP deployment. Validate with a client capable of MCP streamable HTTP:

1. Connect to streamable HTTP endpoint.
2. Run `tools/list`.
3. Execute `hostex_list_properties`.

Expected:

- Tools load without protocol framing errors.
- Tool call returns valid structured payload.

## Recording Results

Capture validation notes in this format:

- Date/time
- Client name/version
- Transport (`stdio`/`shttp`)
- `tools/list` result (pass/fail)
- Sample tool call (`hostex_list_properties`) result (pass/fail)
- Observed mismatch details (if any)

If any mismatch is found, patch `README.md` and this document together so operator guidance stays aligned with real client behavior.
