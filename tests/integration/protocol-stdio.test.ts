import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type ToolCallResult = Awaited<ReturnType<Client["callTool"]>>;
type ContentResult = {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

let client: Client | null = null;
let transport: StdioClientTransport | null = null;

function parseJsonTextContent(result: ToolCallResult): Record<string, unknown> | null {
  const contentResult = result as ContentResult;
  const textPart = contentResult.content.find((part) => part.type === "text");
  if (!textPart) {
    return null;
  }
  if (typeof textPart.text !== "string") {
    return null;
  }

  try {
    return JSON.parse(textPart.text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function createStdioClient(): Promise<Client> {
  transport = new StdioClientTransport({
    command: "node",
    args: [".smithery/stdio/index.cjs", "accessToken=test-access-token"],
    cwd: process.cwd(),
    stderr: "pipe",
  });

  const nextClient = new Client({
    name: "hostex-mcp-protocol-stdio-test",
    version: "1.0.0",
  });

  await nextClient.connect(transport);
  return nextClient;
}

afterEach(async () => {
  if (client) {
    await client.close();
  }
  client = null;
  transport = null;
});

describe("MCP protocol over stdio transport", () => {
  it("completes initialize/list/call lifecycle via StdioClientTransport", async () => {
    client = await createStdioClient();

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

    if (contentResult.isError) {
      if (parsedTextContent) {
        expect(parsedTextContent).toMatchObject({
          type: expect.any(String),
          tool: "hostex_list_properties",
          category: expect.any(String),
          message: expect.any(String),
        });
        expect(Array.isArray(parsedTextContent.issues)).toBe(true);
      } else {
        const textPart = contentResult.content.find((part) => part.type === "text");
        expect(typeof textPart?.text).toBe("string");
        expect(textPart?.text?.length ?? 0).toBeGreaterThan(0);
      }
      return;
    }

    const structuredContent = contentResult.structuredContent;
    expect(structuredContent).toBeDefined();
    expect(structuredContent).toEqual(
      expect.objectContaining({
        properties: expect.any(Array),
        total: expect.any(Number),
      }),
    );
  });
});
