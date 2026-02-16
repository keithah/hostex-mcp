# Technology Stack

**Project:** Hostex MCP Server Modernization
**Researched:** 2026-02-16

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @modelcontextprotocol/sdk | 1.27.0 | MCP server implementation | Latest stable v1 (v2 in pre-alpha, expected Q1 2026). Eight versions ahead of current 1.0.4. Provides core server capabilities with Zod v4 support. |
| Node.js | >=18 | Runtime environment | Already specified in package.json. LTS support, modern ESM compatibility. |
| TypeScript | ^5.7.2 | Type safety | Already in use. Latest stable with excellent module resolution. |
| Zod | ^4.x | Schema validation | Zod v4 is now the peer dependency for @modelcontextprotocol/sdk v1.27.0. Upgrade from 3.25.76 required. Runtime validation + compile-time types. |

### Build Tooling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @smithery/sdk | ^1.6.6 | Smithery integration | Already in use. Provides dual-transport support (stdio + shttp). |
| @smithery/cli | ^1.4.2 | Build automation | Already in use. Handles bundling for both transports. |
| tsc | (via TypeScript) | Type checking | Direct TypeScript compiler for type validation during development. |

**Note on bundlers:** The current stack uses Smithery CLI which handles bundling internally (likely esbuild-based). While `tsup` is mentioned in ecosystem research as common for MCP servers, Smithery CLI already provides optimized bundling for MCP's dual-transport pattern. Changing bundlers would require significant refactoring with minimal benefit.

### Testing Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | ^2.x | Unit/integration testing | Industry standard for TypeScript MCP servers in 2026. Faster than Jest, native ESM support, better TypeScript integration. Well-suited for async MCP operations. |
| @vitest/coverage-v8 | ^2.x | Code coverage | V8-based coverage for accurate reporting. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| hostex-ts | ^0.1.1 | Hostex API client | Keep current version. Domain-specific integration. |
| @types/node | ^22.10.2 | Node.js type definitions | Already in use. Keep updated with Node.js version. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| SDK | @modelcontextprotocol/sdk v1.27.0 | Stay on v1.0.4 | Eight versions behind. Missing Zod v4 support, security updates, and bug fixes. |
| Validation | Zod v4 | Zod v3 | v4 is now required peer dependency for latest SDK. v3 creates compatibility issues. |
| Testing | Vitest | Jest | Vitest has better ESM support, faster execution, tighter TypeScript integration. Community trend favors Vitest for MCP servers. |
| Bundler | Smithery CLI | tsup/esbuild directly | Smithery CLI already handles dual-transport bundling. Switching adds complexity without benefit. |
| Module System | ESM (type: "module") | CommonJS | Already using ESM. MCP SDK has known CommonJS compatibility issues with ESM-only dependencies (pkce-challenge). ESM is 2026 standard. |

## Installation

```bash
# Upgrade core dependencies
npm install @modelcontextprotocol/sdk@^1.27.0 zod@^4

# Add testing framework
npm install -D vitest @vitest/coverage-v8

# Update existing dependencies to latest compatible versions
npm update

# Verify no conflicts
npm audit
```

## TypeScript Configuration

Maintain ESM-first configuration in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", ".smithery"]
}
```

**Key settings:**
- `module: "NodeNext"` - Modern Node.js ESM support (2026 standard vs older "Node16")
- `moduleResolution: "NodeNext"` - Correct resolution for dual ESM/CJS packages
- `strict: true` - Full type safety (already in use)

## Module System Notes

**Current state:** Project correctly uses ESM (`"type": "module"` in package.json).

**MCP SDK compatibility:**
- SDK v1.27.0 provides dual-module support (ESM + CJS via conditional exports)
- Known issue: CommonJS projects may encounter errors with ESM-only dependency `pkce-challenge`
- **Impact:** None for this project (already ESM)

**Build outputs:** Smithery CLI bundles to `.smithery/stdio/index.cjs` and `.smithery/shttp/index.cjs` for compatibility with various MCP clients.

## Security Considerations

### Dependency Security
| Concern | Mitigation |
|---------|------------|
| Outdated SDK (8 versions behind) | Upgrade to 1.27.0 immediately. Includes security patches and bug fixes. |
| Zod version mismatch | Upgrade to v4 required. v3 incompatible with latest SDK internals. |
| Static API keys in env vars | **Critical:** 79% of MCP servers use plain environment variables for API keys. Implement secrets manager (AWS Secrets Manager, HashiCorp Vault). |
| Dependency vulnerabilities | Run `npm audit` regularly. Add to CI/CD pipeline. |

### Runtime Security
| Concern | Mitigation |
|---------|------------|
| STDIO logging corruption | Never use `console.log()` (writes to stdout). Use `console.error()` or structured logging to stderr/files. |
| Input validation | Zod schemas already provide runtime validation. Extend for all tool inputs. |
| Tool execution permissions | Run with least-privilege principle. Sandbox API operations. |
| Credential exposure | Never commit `.env` files. Use `.gitignore` enforcement. Pull secrets from vault at runtime. |

### Best Practices from 2026 Research

1. **Isolation:** Run in isolated environment (VPC, containers, namespaces)
2. **Authentication:** OAuth 2.1 for HTTP transports (stdio uses different auth model)
3. **Input sanitization:** Validate all JSON-RPC requests against schemas to prevent prompt injection
4. **Monitoring:** Log security events to stderr/files, never stdout
5. **Secrets management:** Use vault systems, not environment variables directly

## Version Migration Path

**Current → Target:**
- `@modelcontextprotocol/sdk`: 1.0.4 → 1.27.0 (major dependency updates expected)
- `zod`: 3.25.76 → 4.x (breaking changes in API surface)

**Migration steps:**
1. Audit all Zod schema definitions for v4 compatibility
2. Update SDK import paths (v2 will change to `@modelcontextprotocol/server` and `@modelcontextprotocol/node` when released)
3. Test all tool registrations and validations
4. Verify stdio and shttp transports still function
5. Run full integration tests

**Timeline consideration:** SDK v2 expected Q1 2026 (imminent). May want to wait for v2 release announcement before migrating to avoid double migration (v1.0.4 → v1.27.0 → v2.0.0).

## Sources

**High Confidence (Official/Verified):**
- [@modelcontextprotocol/sdk npm package](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - Latest version: 1.27.0
- [GitHub: modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) - v2 pre-alpha status, Zod v4 peer dependency
- [MCP Official Documentation: Build a Server](https://modelcontextprotocol.io/docs/develop/build-server) - TypeScript configuration recommendations
- [MCP Official Documentation: Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices) - Authoritative security guidance

**Medium Confidence (Industry Research):**
- [MCP Server Best Practices for 2026](https://www.cdata.com/blog/mcp-server-best-practices-2026) - Logging and configuration practices
- [Unit Testing MCP Servers Guide](https://mcpcat.io/guides/writing-unit-tests-mcp-servers/) - Vitest testing patterns
- [TrueFoundry: MCP Server Security Best Practices](https://www.truefoundry.com/blog/mcp-server-security-best-practices) - Environment variable security statistics
- [WorkOS: MCP Security Guide](https://workos.com/blog/mcp-security-risks-best-practices) - Secrets management approaches

**Low Confidence (Needs Validation):**
- Smithery CLI internal bundler (esbuild-based) - Assumed from build output characteristics
- tsup ecosystem prevalence - Mentioned in multiple sources but not required for this project
