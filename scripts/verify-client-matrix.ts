import { access, readFile } from "node:fs/promises";

type Check = {
  id: string;
  run: () => Promise<void>;
};

async function assertExists(path: string): Promise<void> {
  try {
    await access(path);
  } catch {
    throw new Error(`Missing required file: ${path}`);
  }
}

async function assertContains(path: string, requiredSnippets: string[]): Promise<void> {
  const content = await readFile(path, "utf8");
  const missing = requiredSnippets.filter((snippet) => !content.includes(snippet));

  if (missing.length > 0) {
    throw new Error(
      [
        `Missing required content in ${path}:`,
        ...missing.map((snippet) => `- ${snippet}`),
      ].join("\n"),
    );
  }
}

async function runChecks(checks: Check[]): Promise<void> {
  for (const check of checks) {
    await check.run();
    console.log(`PASS: ${check.id}`);
  }
}

async function main(): Promise<void> {
  const checks: Check[] = [
    {
      id: "required-doc-files-exist",
      run: async () => {
        await assertExists("README.md");
        await assertExists("docs/production-runbook.md");
        await assertExists("docs/client-validation.md");
        await assertExists("docs/known-limitations.md");
      },
    },
    {
      id: "readme-links-operational-docs",
      run: async () => {
        await assertContains("README.md", [
          "healthz",
          "docs/production-runbook.md",
          "docs/client-validation.md",
          "docs/known-limitations.md",
        ]);
      },
    },
    {
      id: "client-validation-covers-required-clients",
      run: async () => {
        await assertContains("docs/client-validation.md", [
          "Claude Desktop",
          "Poke",
          "tools/list",
          "hostex_list_properties",
          "node scripts/verify-client-matrix.ts",
        ]);
      },
    },
    {
      id: "known-limitations-covers-required-risks",
      run: async () => {
        await assertContains("docs/known-limitations.md", [
          "webhook",
          "sync",
          "signature",
          "HOSTEX_E2E_ENABLED=true npm run test:e2e -- --run",
        ]);
      },
    },
    {
      id: "runbook-includes-real-api-verification-flow",
      run: async () => {
        await assertContains("docs/production-runbook.md", [
          "HOSTEX_E2E_ENABLED=true npm run test:e2e -- --run",
          "node scripts/verify-live-api-validation.ts",
          "node scripts/verify-client-matrix.ts",
        ]);
      },
    },
  ];

  await runChecks(checks);
  console.log("Client validation matrix verification passed.");
}

void main();
