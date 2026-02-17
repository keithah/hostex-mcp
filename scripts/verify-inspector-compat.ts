import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

type CommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

const STDIO_ARTIFACT_PATH = ".smithery/stdio/index.cjs";

function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (exitCode) => {
      resolve({
        exitCode,
        stdout,
        stderr,
      });
    });
  });
}

async function ensureStdioArtifactExists(): Promise<void> {
  try {
    await access(STDIO_ARTIFACT_PATH);
  } catch {
    throw new Error(
      `Missing ${STDIO_ARTIFACT_PATH}. Run npm run build:all before running inspector compatibility verification.`,
    );
  }
}

function assertInspectorOutput(stdout: string, stderr: string): void {
  const combinedOutput = `${stdout}\n${stderr}`;
  if (!combinedOutput.includes("hostex_list_properties")) {
    throw new Error(
      [
        "Inspector command completed but expected tool metadata was not found.",
        "Expected output to include hostex_list_properties from tools/list.",
      ].join(" "),
    );
  }
}

async function main(): Promise<void> {
  await ensureStdioArtifactExists();

  const args = [
    "@modelcontextprotocol/inspector",
    "--cli",
    "node",
    STDIO_ARTIFACT_PATH,
    "accessToken=test-access-token",
    "--method",
    "tools/list",
  ];

  const result = await runCommand("npx", args);
  if (result.exitCode !== 0) {
    throw new Error(
      [
        `Inspector compatibility check failed with exit code ${String(result.exitCode)}.`,
        result.stdout && `stdout:\n${result.stdout}`,
        result.stderr && `stderr:\n${result.stderr}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  assertInspectorOutput(result.stdout, result.stderr);

  console.log("MCP Inspector compatibility check passed for stdio artifact.");
}

void main();
