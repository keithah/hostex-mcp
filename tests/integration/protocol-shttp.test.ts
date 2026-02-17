import { randomInt } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

type ToolCallResult = Awaited<ReturnType<Client["callTool"]>>;
type ContentResult = {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

let client: Client | null = null;
let transport: StreamableHTTPClientTransport | null = null;
let serverProcess: ChildProcess | null = null;

function parseJsonTextContent(result: ToolCallResult): Record<string, unknown> | null {
  const contentResult = result as ContentResult;
  const textPart = contentResult.content.find((part) => part.type === "text");
  if (!textPart || typeof textPart.text !== "string") {
    return null;
  }

  try {
    return JSON.parse(textPart.text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function waitForShttpServer(url: URL, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status >= 400 && response.status < 500) {
        return;
      }
    } catch {
      // retry until timeout
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for shttp server at ${url.toString()}`);
}

async function createShttpClient(): Promise<Client> {
  const port = randomInt(20_000, 30_000);
  const endpoint = new URL(`http://127.0.0.1:${port}/mcp`);
  endpoint.searchParams.set("accessToken", "test-access-token");

  serverProcess = spawn(
    "node",
    [".smithery/shttp/index.cjs"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  await waitForShttpServer(endpoint);

  transport = new StreamableHTTPClientTransport(endpoint);
  const nextClient = new Client({
    name: "hostex-mcp-protocol-shttp-test",
    version: "1.0.0",
  });

  await nextClient.connect(transport);
  return nextClient;
}

afterEach(async () => {
  if (client) {
    await client.close();
  }
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }

  client = null;
  transport = null;
  serverProcess = null;
});

describe("MCP protocol over streamable HTTP transport", () => {
  it("completes initialize/list/call lifecycle via StreamableHTTPClientTransport", async () => {
    client = await createShttpClient();

    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThan(0);
    expect(tools.tools.some((tool) => tool.name === "hostex_list_properties")).toBe(true);

    const callResult = await client.callTool({
      name: "hostex_list_properties",
      arguments: {
        offset: 0,
        limit: 1,
      },
    });

    const contentResult = callResult as ContentResult;
    expect(contentResult.content.length).toBeGreaterThan(0);

    const parsedTextContent = parseJsonTextContent(callResult);
    expect(parsedTextContent).not.toBeNull();

    if (contentResult.isError) {
      expect(parsedTextContent).toMatchObject({
        type: expect.any(String),
        tool: "hostex_list_properties",
        category: expect.any(String),
        message: expect.any(String),
      });
      expect(Array.isArray(parsedTextContent?.issues)).toBe(true);
      return;
    }

    expect(contentResult.structuredContent).toEqual(
      expect.objectContaining({
        properties: expect.any(Array),
        total: expect.any(Number),
      }),
    );
  });
});
