import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import createServer from "../../src/index.js";
import type { HostexToolId } from "./tool-ids.js";

type ToolArguments = Record<string, unknown> | undefined;

export type McpTestHarness = {
  listTools: () => ReturnType<Client["listTools"]>;
  callTool: (
    name: HostexToolId,
    args?: ToolArguments,
  ) => ReturnType<Client["callTool"]>;
  close: () => Promise<void>;
};

export async function createMcpTestServer(options?: {
  accessToken?: string;
}): Promise<McpTestHarness> {
  const server = createServer({
    config: {
      accessToken: options?.accessToken ?? "test-access-token",
    },
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({
    name: "hostex-mcp-test-client",
    version: "1.0.0",
  });

  await client.connect(clientTransport);

  return {
    listTools: () => client.listTools(),
    callTool: (name, args) =>
      client.callTool({
        name,
        arguments: args,
      }),
    close: async () => {
      await clientTransport.close();
      await serverTransport.close();
    },
  };
}
