import { afterEach, describe, expect, it } from "vitest";

import { createSuccessScenario } from "../fixtures/hostex-scenarios.js";
import {
  resetHostexClientMock,
  seedHostexClientMock,
} from "../helpers/hostex-client-mock.js";
import { createMcpTestServer, type McpTestHarness } from "../helpers/mcp-test-server.js";
import { HOSTEX_TOOL_IDS } from "../helpers/tool-ids.js";

let harness: McpTestHarness | null = null;

afterEach(async () => {
  resetHostexClientMock();
  if (harness) {
    await harness.close();
  }
  harness = null;
});

describe("mcp test harness", () => {
  it("boots the server and lists registered tools", async () => {
    const success = createSuccessScenario();
    seedHostexClientMock({
      listProperties: success.listProperties,
    });

    harness = await createMcpTestServer();

    const tools = await harness.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);

    expect(toolNames).toContain(HOSTEX_TOOL_IDS.listProperties);

    const result = await harness.callTool(HOSTEX_TOOL_IDS.listProperties, {
      offset: 0,
      limit: 1,
    });

    expect(result.isError).not.toBe(true);
  });
});
