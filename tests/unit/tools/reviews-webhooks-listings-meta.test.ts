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

describe("tool handlers: reviews, webhooks, listings, meta", () => {
  const success = createSuccessScenario();
  const nonEmptyEmptyDataMismatch = {
    request_id: "req-bad-empty-data-shape",
    error_code: 0,
    error_msg: "",
    data: { unexpected_field: true },
  };

  const toolCases: ToolCase[] = [
    {
      name: "list reviews",
      tool: HOSTEX_TOOL_IDS.listReviews,
      method: "listReviews",
      args: {
        property_id: 1001,
        offset: 0,
        limit: 20,
      },
      expectedMethodArgs: [
        {
          property_id: 1001,
          offset: 0,
          limit: 20,
        },
      ],
      successResponse: success.listReviews,
    },
    {
      name: "create review",
      tool: HOSTEX_TOOL_IDS.createReview,
      method: "createReview",
      args: {
        reservation_code: "R-0001",
        host_review_score: 5,
        host_review_content: "Great guest",
      },
      expectedMethodArgs: [
        "R-0001",
        {
          host_review_score: 5,
          host_review_content: "Great guest",
        },
      ],
      successResponse: success.emptySuccess,
      validationMismatchResponse: nonEmptyEmptyDataMismatch,
    },
    {
      name: "list webhooks",
      tool: HOSTEX_TOOL_IDS.listWebhooks,
      method: "listWebhooks",
      args: {},
      expectedMethodArgs: [],
      successResponse: success.listWebhooks,
    },
    {
      name: "create webhook",
      tool: HOSTEX_TOOL_IDS.createWebhook,
      method: "createWebhook",
      args: { url: "https://example.test/webhook" },
      expectedMethodArgs: ["https://example.test/webhook"],
      successResponse: success.createWebhook,
    },
    {
      name: "delete webhook",
      tool: HOSTEX_TOOL_IDS.deleteWebhook,
      method: "deleteWebhook",
      args: { webhook_id: 401 },
      expectedMethodArgs: [401],
      successResponse: success.emptySuccess,
      validationMismatchResponse: nonEmptyEmptyDataMismatch,
    },
    {
      name: "get listing calendar",
      tool: HOSTEX_TOOL_IDS.getListingCalendar,
      method: "getListingCalendar",
      args: {
        start_date: "2026-03-01",
        end_date: "2026-03-05",
        listings: [{ channel_type: "airbnb", listing_id: "listing-1001" }],
      },
      expectedMethodArgs: [
        {
          start_date: "2026-03-01",
          end_date: "2026-03-05",
          listings: [{ channel_type: "airbnb", listing_id: "listing-1001" }],
        },
      ],
      successResponse: success.getListingCalendar,
    },
    {
      name: "update listing prices",
      tool: HOSTEX_TOOL_IDS.updateListingPrices,
      method: "updateListingPrices",
      args: {
        channel_type: "airbnb",
        listing_id: "listing-1001",
        prices: [{ date: "2026-03-01", price: 30000 }],
      },
      expectedMethodArgs: [
        {
          channel_type: "airbnb",
          listing_id: "listing-1001",
          prices: [{ date: "2026-03-01", price: 30000 }],
        },
      ],
      successResponse: success.emptySuccess,
      validationMismatchResponse: nonEmptyEmptyDataMismatch,
    },
    {
      name: "list custom channels",
      tool: HOSTEX_TOOL_IDS.listCustomChannels,
      method: "listCustomChannels",
      args: {},
      expectedMethodArgs: [],
      successResponse: success.listCustomChannels,
    },
    {
      name: "list income methods",
      tool: HOSTEX_TOOL_IDS.listIncomeMethods,
      method: "listIncomeMethods",
      args: {},
      expectedMethodArgs: [],
      successResponse: success.listIncomeMethods,
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
