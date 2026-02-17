import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { createSuccessScenario } from "../../fixtures/hostex-scenarios.js";
import {
  mockHostexClient,
  resetHostexClientMock,
} from "../../helpers/hostex-client-mock.js";
import {
  createMcpTestServer,
  type McpTestHarness,
} from "../../helpers/mcp-test-server.js";
import {
  HOSTEX_TOOL_ID_LIST,
  HOSTEX_TOOL_IDS,
  type HostexToolId,
} from "../../helpers/tool-ids.js";

type CoverageCase = {
  method: keyof typeof mockHostexClient;
  args?: Record<string, unknown>;
  response: unknown;
};

let harness: McpTestHarness | null = null;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const domainToolSources = [
  "src/tools/properties.ts",
  "src/tools/reservations.ts",
  "src/tools/conversations.ts",
  "src/tools/reviews.ts",
  "src/tools/webhooks.ts",
  "src/tools/listings.ts",
  "src/tools/meta.ts",
];

afterEach(async () => {
  resetHostexClientMock();
  if (harness) {
    await harness.close();
  }
  harness = null;
});

describe("tool handler coverage matrix", () => {
  const success = createSuccessScenario();

  const coverageCases: Record<HostexToolId, CoverageCase> = {
    [HOSTEX_TOOL_IDS.listProperties]: {
      method: "listProperties",
      args: { offset: 0, limit: 1, id: 1001 },
      response: success.listProperties,
    },
    [HOSTEX_TOOL_IDS.listRoomTypes]: {
      method: "listRoomTypes",
      args: { offset: 0, limit: 1 },
      response: success.listRoomTypes,
    },
    [HOSTEX_TOOL_IDS.listReservations]: {
      method: "listReservations",
      args: { property_id: 1001, offset: 0, limit: 1 },
      response: success.listReservations,
    },
    [HOSTEX_TOOL_IDS.createReservation]: {
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
      response: success.createReservation,
    },
    [HOSTEX_TOOL_IDS.cancelReservation]: {
      method: "cancelReservation",
      args: { reservation_code: "R-0001" },
      response: success.emptySuccess,
    },
    [HOSTEX_TOOL_IDS.updateLockCode]: {
      method: "updateLockCode",
      args: { stay_code: "S-0001", lock_code: "4321" },
      response: success.emptySuccess,
    },
    [HOSTEX_TOOL_IDS.getCustomFields]: {
      method: "getCustomFields",
      args: { stay_code: "S-0001" },
      response: success.getCustomFields,
    },
    [HOSTEX_TOOL_IDS.updateCustomFields]: {
      method: "updateCustomFields",
      args: { stay_code: "S-0001", custom_fields: { lockbox_code: "9876" } },
      response: success.emptySuccess,
    },
    [HOSTEX_TOOL_IDS.listAvailabilities]: {
      method: "listAvailabilities",
      args: {
        property_ids: "1001",
        start_date: "2026-03-01",
        end_date: "2026-03-05",
      },
      response: success.listAvailabilities,
    },
    [HOSTEX_TOOL_IDS.updateAvailabilities]: {
      method: "updateAvailabilities",
      args: {
        property_ids: [1001],
        start_date: "2026-03-01",
        end_date: "2026-03-05",
        available: true,
      },
      response: success.emptySuccess,
    },
    [HOSTEX_TOOL_IDS.listConversations]: {
      method: "listConversations",
      args: { offset: 0, limit: 1 },
      response: success.listConversations,
    },
    [HOSTEX_TOOL_IDS.getConversation]: {
      method: "getConversation",
      args: { conversation_id: "conversation-1001" },
      response: success.getConversation,
    },
    [HOSTEX_TOOL_IDS.sendMessage]: {
      method: "sendMessage",
      args: { conversation_id: "conversation-1001", message: "Welcome!" },
      response: success.emptySuccess,
    },
    [HOSTEX_TOOL_IDS.listReviews]: {
      method: "listReviews",
      args: { property_id: 1001, offset: 0, limit: 1 },
      response: success.listReviews,
    },
    [HOSTEX_TOOL_IDS.createReview]: {
      method: "createReview",
      args: {
        reservation_code: "R-0001",
        host_review_score: 5,
        host_review_content: "Great guest",
      },
      response: success.emptySuccess,
    },
    [HOSTEX_TOOL_IDS.listWebhooks]: {
      method: "listWebhooks",
      args: {},
      response: success.listWebhooks,
    },
    [HOSTEX_TOOL_IDS.createWebhook]: {
      method: "createWebhook",
      args: { url: "https://example.test/webhook" },
      response: success.createWebhook,
    },
    [HOSTEX_TOOL_IDS.deleteWebhook]: {
      method: "deleteWebhook",
      args: { webhook_id: 401 },
      response: success.emptySuccess,
    },
    [HOSTEX_TOOL_IDS.getListingCalendar]: {
      method: "getListingCalendar",
      args: {
        start_date: "2026-03-01",
        end_date: "2026-03-05",
        listings: [{ channel_type: "airbnb", listing_id: "listing-1001" }],
      },
      response: success.getListingCalendar,
    },
    [HOSTEX_TOOL_IDS.updateListingPrices]: {
      method: "updateListingPrices",
      args: {
        channel_type: "airbnb",
        listing_id: "listing-1001",
        prices: [{ date: "2026-03-01", price: 30000 }],
      },
      response: success.emptySuccess,
    },
    [HOSTEX_TOOL_IDS.listCustomChannels]: {
      method: "listCustomChannels",
      args: {},
      response: success.listCustomChannels,
    },
    [HOSTEX_TOOL_IDS.listIncomeMethods]: {
      method: "listIncomeMethods",
      args: {},
      response: success.listIncomeMethods,
    },
  };

  it("enforces complete coverage for all 22 tool IDs", () => {
    expect(HOSTEX_TOOL_ID_LIST).toHaveLength(22);

    const coveredToolIds = Object.keys(coverageCases);
    expect(coveredToolIds).toHaveLength(22);
    expect(new Set(coveredToolIds)).toEqual(new Set(HOSTEX_TOOL_ID_LIST));
  });

  it("keeps every registered tool callable through the test harness", async () => {
    harness = await createMcpTestServer();

    for (const toolId of HOSTEX_TOOL_ID_LIST) {
      const coverage = coverageCases[toolId];
      mockHostexClient[coverage.method].mockResolvedValue(coverage.response);

      const result = await harness.callTool(toolId, coverage.args);

      expect(result.isError).not.toBe(true);
      expect(mockHostexClient[coverage.method]).toHaveBeenCalled();
    }
  });

  it("blocks legacy error-handler imports in all domain registrars", async () => {
    for (const relativePath of domainToolSources) {
      const source = await readFile(path.join(projectRoot, relativePath), "utf8");
      expect(source).not.toContain("../lib/error-handler.js");
      expect(source).toContain("../handlers/tool-error-handler.js");
    }
  });

  it("keeps register-all shared dependency wiring active", async () => {
    const source = await readFile(path.join(projectRoot, "src/tools/register-all.ts"), "utf8");

    expect(source).not.toMatch(/void\s+(toHandledToolError|toolErrorSchema|validateSchema)/);
    expect(source).toMatch(/registerPropertyTools\(server,\s*deps\.gateway,\s*sharedDeps\)/);
    expect(source).toMatch(/registerMetaTools\(server,\s*deps\.gateway,\s*sharedDeps\)/);
  });
});
