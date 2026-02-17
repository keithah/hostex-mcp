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
};

let harness: McpTestHarness | null = null;

afterEach(async () => {
  resetHostexClientMock();
  if (harness) {
    await harness.close();
  }
  harness = null;
});

describe("tool handlers: properties, reservations, custom fields", () => {
  const success = createSuccessScenario();

  const toolCases: ToolCase[] = [
    {
      name: "list properties",
      tool: HOSTEX_TOOL_IDS.listProperties,
      method: "listProperties",
      args: { offset: 0, limit: 2, id: 1001 },
      expectedMethodArgs: [{ offset: 0, limit: 2, id: 1001 }],
      successResponse: success.listProperties,
    },
    {
      name: "list room types",
      tool: HOSTEX_TOOL_IDS.listRoomTypes,
      method: "listRoomTypes",
      args: { offset: 0, limit: 5 },
      expectedMethodArgs: [{ offset: 0, limit: 5 }],
      successResponse: success.listRoomTypes,
    },
    {
      name: "list reservations",
      tool: HOSTEX_TOOL_IDS.listReservations,
      method: "listReservations",
      args: {
        reservation_code: "R-0001",
        property_id: 1001,
        status: "accepted",
        offset: 0,
        limit: 10,
      },
      expectedMethodArgs: [
        {
          reservation_code: "R-0001",
          property_id: 1001,
          status: "accepted",
          offset: 0,
          limit: 10,
        },
      ],
      successResponse: success.listReservations,
    },
    {
      name: "create reservation",
      tool: HOSTEX_TOOL_IDS.createReservation,
      method: "createReservation",
      args: {
        property_id: "1001",
        custom_channel_id: 1,
        check_in_date: "2026-03-01",
        check_out_date: "2026-03-05",
        guest_name: "Guest Example",
        currency: "USD",
        rate_amount: 125000,
        commission_amount: 15000,
        received_amount: 110000,
        income_method_id: 1,
      },
      expectedMethodArgs: [
        {
          property_id: "1001",
          custom_channel_id: 1,
          check_in_date: "2026-03-01",
          check_out_date: "2026-03-05",
          guest_name: "Guest Example",
          currency: "USD",
          rate_amount: 125000,
          commission_amount: 15000,
          received_amount: 110000,
          income_method_id: 1,
        },
      ],
      successResponse: success.createReservation,
    },
    {
      name: "cancel reservation",
      tool: HOSTEX_TOOL_IDS.cancelReservation,
      method: "cancelReservation",
      args: { reservation_code: "R-0001" },
      expectedMethodArgs: ["R-0001"],
      successResponse: success.emptySuccess,
    },
    {
      name: "update lock code",
      tool: HOSTEX_TOOL_IDS.updateLockCode,
      method: "updateLockCode",
      args: { stay_code: "S-0001", lock_code: "4321" },
      expectedMethodArgs: ["S-0001", "4321"],
      successResponse: success.emptySuccess,
    },
    {
      name: "get custom fields",
      tool: HOSTEX_TOOL_IDS.getCustomFields,
      method: "getCustomFields",
      args: { stay_code: "S-0001" },
      expectedMethodArgs: ["S-0001"],
      successResponse: success.getCustomFields,
    },
    {
      name: "update custom fields",
      tool: HOSTEX_TOOL_IDS.updateCustomFields,
      method: "updateCustomFields",
      args: { stay_code: "S-0001", custom_fields: { lockbox_code: "9876" } },
      expectedMethodArgs: ["S-0001", { lockbox_code: "9876" }],
      successResponse: success.emptySuccess,
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
    async ({ tool, method, args, expectedMethodArgs }) => {
      mockHostexClient[method].mockResolvedValue(createValidationMismatchScenario());
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
