import { afterEach, describe, expect, it } from "vitest";

import {
  createSuccessScenario,
  createValidationMismatchScenario,
} from "../../fixtures/hostex-scenarios.js";
import {
  mockHostexClient,
  resetHostexClientMock,
} from "../../helpers/hostex-client-mock.js";
import {
  createMcpTestServer,
  type McpTestHarness,
} from "../../helpers/mcp-test-server.js";
import { HOSTEX_TOOL_IDS } from "../../helpers/tool-ids.js";

type ToolCase = {
  name: string;
  tool: (typeof HOSTEX_TOOL_IDS)[keyof typeof HOSTEX_TOOL_IDS];
  method: keyof typeof mockHostexClient;
  args?: Record<string, unknown>;
  expectedMethodArgs: unknown[];
  successResponse: unknown;
  validationMismatchResponse?: unknown;
};

let harness: McpTestHarness | null = null;

afterEach(async () => {
  resetHostexClientMock();
  if (harness) {
    await harness.close();
  }
  harness = null;
});

describe("tool handlers: availability and conversations", () => {
  const success = createSuccessScenario();
  const nonEmptyEmptyDataMismatch = {
    request_id: "req-bad-empty-data-shape",
    error_code: 0,
    error_msg: "",
    data: { unexpected_field: true },
  };

  const toolCases: ToolCase[] = [
    {
      name: "list availabilities",
      tool: HOSTEX_TOOL_IDS.listAvailabilities,
      method: "listAvailabilities",
      args: {
        property_ids: "1001,1002",
        start_date: "2026-03-01",
        end_date: "2026-03-05",
      },
      expectedMethodArgs: [
        {
          property_ids: "1001,1002",
          start_date: "2026-03-01",
          end_date: "2026-03-05",
        },
      ],
      successResponse: success.listAvailabilities,
    },
    {
      name: "update availabilities",
      tool: HOSTEX_TOOL_IDS.updateAvailabilities,
      method: "updateAvailabilities",
      args: {
        property_ids: [1001],
        start_date: "2026-03-01",
        end_date: "2026-03-03",
        available: true,
      },
      expectedMethodArgs: [
        {
          property_ids: [1001],
          start_date: "2026-03-01",
          end_date: "2026-03-03",
          available: true,
        },
      ],
      successResponse: success.emptySuccess,
      validationMismatchResponse: nonEmptyEmptyDataMismatch,
    },
    {
      name: "list conversations",
      tool: HOSTEX_TOOL_IDS.listConversations,
      method: "listConversations",
      args: { offset: 0, limit: 20 },
      expectedMethodArgs: [{ offset: 0, limit: 20 }],
      successResponse: success.listConversations,
    },
    {
      name: "get conversation",
      tool: HOSTEX_TOOL_IDS.getConversation,
      method: "getConversation",
      args: { conversation_id: "conversation-1001" },
      expectedMethodArgs: ["conversation-1001"],
      successResponse: success.getConversation,
    },
    {
      name: "send message",
      tool: HOSTEX_TOOL_IDS.sendMessage,
      method: "sendMessage",
      args: {
        conversation_id: "conversation-1001",
        message: "Welcome!",
      },
      expectedMethodArgs: ["conversation-1001", { message: "Welcome!", jpeg_base64: undefined }],
      successResponse: success.emptySuccess,
      validationMismatchResponse: nonEmptyEmptyDataMismatch,
    },
  ];

  it.each(toolCases)(
    "returns successful result for $name",
    async ({ tool, method, args, expectedMethodArgs, successResponse }) => {
      mockHostexClient[method].mockResolvedValue(successResponse);
      harness = await createMcpTestServer();

      const result = await harness.callTool(tool, args);

      expect(result.isError).not.toBe(true);
      expect(mockHostexClient[method]).toHaveBeenCalledWith(...expectedMethodArgs);
      expect(mockHostexClient[method]).toHaveBeenCalledTimes(1);
    },
  );

  it.each(toolCases)(
    "fails closed with sanitized validation error for $name",
    async ({ tool, method, args, expectedMethodArgs, validationMismatchResponse }) => {
      mockHostexClient[method].mockResolvedValue(
        validationMismatchResponse ?? createValidationMismatchScenario(),
      );
      harness = await createMcpTestServer();

      const result = await harness.callTool(tool, args);
      const structuredError = result.structuredContent as Record<string, unknown>;

      expect(result.isError).toBe(true);
      expect(mockHostexClient[method]).toHaveBeenCalledWith(...expectedMethodArgs);
      expect(structuredError).toMatchObject({
        type: "validation_error",
        tool,
        category: "validation",
      });
      expect(Array.isArray(structuredError.issues)).toBe(true);
    },
  );
});
