# Testing Patterns

**Analysis Date:** 2026-02-16

## Test Framework

**Runner:**
- Not detected - no test framework installed or configured
- No jest.config.js, vitest.config.js, or test scripts in package.json
- No test files present in `src/` directory

**Assertion Library:**
- Not applicable - no testing framework

**Run Commands:**
- No test commands defined in package.json
- Available commands: `npm run build`, `npm run dev`, `npm run watch`
- Build commands: `build:stdio`, `build:shttp`, `build:all`

## Test File Organization

**Location:**
- No test files detected
- Single source file structure: `src/index.ts` (370 lines)
- No colocated test files (*.test.ts, *.spec.ts)
- No dedicated `tests/` or `__tests__/` directory

**Naming:**
- Not applicable - no test files exist

**Structure:**
- Not applicable - no test files exist

## Test Strategy

**Approach:**
- Build-time verification through TypeScript compiler with strict mode
- Runtime validation via zod schemas for all tool parameters
- No unit, integration, or E2E tests in codebase
- Testing delegated to external integrations

## Validation Framework

**Runtime Validation:**
- Zod schemas used for all tool parameter validation
- Each tool handler has explicit zod schema defining allowed parameters
- Type-safe parameter passing via `z.infer<typeof configSchema>`

**Example from `src/index.ts`:**
```typescript
export const configSchema = z.object({
  accessToken: z.string().describe("Your Hostex API access token"),
});

server.tool(
  "hostex_list_properties",
  "List properties from your Hostex account...",
  {
    offset: z.number().optional().describe("Starting point for results (default: 0)"),
    limit: z.number().optional().describe("Maximum results to return, max 100 (default: 20)"),
    id: z.number().optional().describe("Filter by specific property ID"),
  },
  async ({ offset, limit, id }) => {
    const result = await hostexClient.listProperties({ offset, limit, id });
    return result.data;
  }
);
```

## Build-Time Verification

**TypeScript Compiler:**
- Configuration: `tsconfig.json`
- Strict mode enabled: catches type errors before runtime
- Module resolution: Node16
- Target: ES2022

**Key Settings:**
```json
{
  "strict": true,
  "esModuleInterop": true,
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true,
  "resolveJsonModule": true,
  "declaration": true
}
```

**Compilation Output:**
- Directory: `./build/`
- Root: `./src/`

## Build Pipeline

**Scripts in package.json:**
```bash
npm run build              # Alias for build:stdio
npm run build:stdio       # Build stdio transport via Smithery
npm run build:shttp       # Build shttp transport via Smithery
npm run build:all         # Build both transports
npm run prepare            # Runs build:stdio (lifecycle hook)
npm run dev               # Development mode via Smithery
npm run watch             # Watch mode with tsc
```

## CI/CD Testing

**GitHub Actions:**
- Release workflow: `.github/workflows/release.yml`
- Dependency update workflow: `.github/workflows/check-npm-updates.yml`

**Build Verification in CI:**
- Release job runs: `npm ci` → `npm run build:all` → package creation
- Dependency update job runs: `npm install` → `npm run build:all`
- Build success used as verification (no separate test step)

**Example from release.yml:**
```yaml
- name: Build MCP server
  run: npm run build:all
```

## Mocking

**Framework:** Not applicable - no test framework installed

**Patterns:**
- No mocking library detected
- External API calls use real `hostexClient` instance from `hostex-ts`
- Configuration passed to `HostexClient` constructor:
  ```typescript
  const hostexClient = new HostexClient({
    accessToken: config.accessToken,
  });
  ```

## Testing Guidelines

**What to Test (if implementing):**
- Tool parameter validation (handled by zod schemas)
- API response data transformation (minimal - mostly pass-through)
- Configuration validation (handled by configSchema)
- Tool registration completeness

**What NOT to Test:**
- External Hostex API behavior (third-party responsibility)
- MCP framework internals
- Transport mechanism (Smithery CLI handles this)

## Type Safety & Validation

**Zod Schemas:**
- All 25+ tools have explicit parameter schemas
- Configuration validated at startup via `configSchema`
- Optional parameters marked with `.optional()`
- All parameters documented via `.describe()`

**Type Inference:**
- Config type: `z.infer<typeof configSchema>`
- Parameters automatically typed from zod schemas
- Return types inferred from async handler results

## Code Coverage

**Requirements:** Not enforced - no coverage tooling

**Note:** With single entry file and direct API delegation, coverage analysis would show:
- All tool definitions always executed (on server initialization)
- Individual tool handlers executed only when called by client
- No unused code paths due to direct delegation pattern

## Verification Checklist

**Pre-Deployment Verification (Manual):**
- [ ] TypeScript compilation succeeds (`npm run build:all`)
- [ ] No type errors in IDE/editor
- [ ] Configuration schema matches expected environment variables
- [ ] Smithery CLI builds without errors
- [ ] MCPB package created successfully (release workflow)
- [ ] Manual testing against Hostex API with real credentials

## Edge Cases Not Covered by Tests

**Potential Test Areas:**
1. Invalid Hostex API tokens - tested manually by humans
2. Network failures during API calls - delegated to hostex-ts client
3. Malformed parameters - zod catches at schema level
4. API rate limiting - handled by Hostex API
5. Missing optional parameters - handled by zod `.optional()`

## Future Testing Recommendations

**If implementing tests:**
1. Create `src/index.test.ts` or `tests/server.test.ts`
2. Mock `hostex-ts` HostexClient via Jest mocks or Vitest
3. Test each tool's parameter schema validation
4. Test configuration validation
5. Add e2e tests against staging Hostex API

**Testing Framework Choice:**
- Vitest recommended (better TypeScript support, faster)
- Alternative: Jest with ts-jest preset
- Consider: 100% would be impractical due to tool count; target 70%+ on critical paths

---

*Testing analysis: 2026-02-16*
