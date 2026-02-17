import { spawn } from "node:child_process";

type Step = {
  name: string;
  command: string;
  args: string[];
};

const CI_EQUIVALENT_STEPS: Step[] = [
  {
    name: "Typecheck",
    command: "npm",
    args: ["run", "typecheck"],
  },
  {
    name: "Build",
    command: "npm",
    args: ["run", "build:all"],
  },
  {
    name: "Unit tests",
    command: "npm",
    args: ["run", "test:unit"],
  },
  {
    name: "Integration tests",
    command: "npm",
    args: ["run", "test:integration"],
  },
  {
    name: "Coverage",
    command: "npm",
    args: ["run", "test:coverage"],
  },
  {
    name: "Inspector compatibility",
    command: "node",
    args: ["scripts/verify-inspector-compat.ts"],
  },
];

async function runStep(step: Step): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Step failed: ${step.name} (${step.command} ${step.args.join(" ")}) exited with ${String(code)}`,
        ),
      );
    });
  });
}

async function main(): Promise<void> {
  console.log("Running CI-equivalent readiness checks...");

  for (const step of CI_EQUIVALENT_STEPS) {
    console.log(`\n==> ${step.name}`);
    await runStep(step);
  }

  console.log("\nAll CI readiness checks passed.");
}

void main();
