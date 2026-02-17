import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { HostexToolId } from "../helpers/tool-ids.js";
import { createMcpTestServer, type McpTestHarness } from "../helpers/mcp-test-server.js";
import { HOSTEX_TOOL_IDS } from "../helpers/tool-ids.js";
import {
  READ_ONLY_TOOL_IDS,
  assertToolMatrixParity,
  createOutcomeTracker,
  getE2EGate,
  nextDateRange,
} from "./e2e-tool-matrix.js";

type PropertyLike = {
  id?: number;
  channels?: Array<{ channel_type?: string; listing_id?: string }>;
};

type ReservationLike = {
  reservation_code?: string;
  stay_code?: string;
};

type ConversationLike = {
  id?: string;
};

const gate = getE2EGate();
const describeWhenEnabled = gate.enabled ? describe : describe.skip;
const accessToken = gate.enabled ? gate.accessToken : undefined;

describe("hostex e2e smoke (read-only)", () => {
  it("keeps full 22-tool matrix parity", () => {
    assertToolMatrixParity();
  });

  it("has env-gated execution for safe default skips", () => {
    if (accessToken) {
      expect(accessToken.length).toBeGreaterThan(0);
      return;
    }

    expect(gate.reason).toBeDefined();
  });
});

describeWhenEnabled("hostex e2e smoke (read-only, real api)", () => {
  let harness: McpTestHarness | null = null;

  beforeAll(async () => {
    if (!accessToken) {
      throw new Error("HOSTEX_ACCESS_TOKEN is required when HOSTEX_E2E_ENABLED=true");
    }

    harness = await createMcpTestServer({ accessToken });
  });

  afterAll(async () => {
    if (harness) {
      await harness.close();
    }
    harness = null;
  });

  it("validates read/list/get tools with explicit matrix accounting", async () => {
    expect(harness).not.toBeNull();
    const activeHarness = harness as McpTestHarness;
    const tracker = createOutcomeTracker(READ_ONLY_TOOL_IDS);
    const { startDate, endDate } = nextDateRange();

    let propertyId: number | null = null;
    let stayCode: string | null = null;
    let conversationId: string | null = null;
    let listingRef: { channel_type: string; listing_id: string } | null = null;

    for (const toolId of READ_ONLY_TOOL_IDS) {
      if (toolId === HOSTEX_TOOL_IDS.listProperties) {
        const payload = await callSuccessfulTool(activeHarness, toolId, {
          offset: 0,
          limit: 20,
        });
        const properties = readArray<PropertyLike>(payload.properties);
        propertyId = properties.find((property) => Number.isFinite(property.id))?.id ?? null;
        const channel = properties
          .flatMap((property) => property.channels ?? [])
          .find(
            (item) => typeof item.channel_type === "string" && typeof item.listing_id === "string",
          );
        listingRef = channel
          ? { channel_type: channel.channel_type as string, listing_id: channel.listing_id as string }
          : null;
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.listRoomTypes) {
        await callSuccessfulTool(activeHarness, toolId, { offset: 0, limit: 20 });
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.listReservations) {
        const payload = await callSuccessfulTool(activeHarness, toolId, {
          offset: 0,
          limit: 20,
          ...(propertyId ? { property_id: propertyId } : {}),
        });
        const reservations = readArray<ReservationLike>(payload.reservations);
        const reservation = reservations.find(
          (item) => typeof item.stay_code === "string" && typeof item.reservation_code === "string",
        );
        stayCode = reservation?.stay_code ?? null;
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.getCustomFields) {
        if (!stayCode) {
          tracker.skip(toolId, "No stay_code available from list_reservations");
          continue;
        }

        await callSuccessfulTool(activeHarness, toolId, { stay_code: stayCode });
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.listAvailabilities) {
        if (!propertyId) {
          tracker.skip(toolId, "No property ID available from list_properties");
          continue;
        }

        await callSuccessfulTool(activeHarness, toolId, {
          property_ids: String(propertyId),
          start_date: startDate,
          end_date: endDate,
        });
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.listConversations) {
        const payload = await callSuccessfulTool(activeHarness, toolId, {
          offset: 0,
          limit: 20,
        });
        const conversations = readArray<ConversationLike>(payload.conversations);
        conversationId =
          conversations.find((conversation) => typeof conversation.id === "string")?.id ?? null;
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.getConversation) {
        if (!conversationId) {
          tracker.skip(toolId, "No conversation ID available from list_conversations");
          continue;
        }

        await callSuccessfulTool(activeHarness, toolId, { conversation_id: conversationId });
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.listReviews) {
        await callSuccessfulTool(activeHarness, toolId, {
          offset: 0,
          limit: 20,
          ...(propertyId ? { property_id: propertyId } : {}),
        });
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.listWebhooks) {
        await callSuccessfulTool(activeHarness, toolId, {});
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.getListingCalendar) {
        if (!listingRef) {
          tracker.skip(
            toolId,
            "No channel_type/listing_id pair available from list_properties",
          );
          continue;
        }

        await callSuccessfulTool(activeHarness, toolId, {
          start_date: startDate,
          end_date: endDate,
          listings: [listingRef],
        });
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.listCustomChannels) {
        await callSuccessfulTool(activeHarness, toolId, {});
        tracker.pass(toolId);
        continue;
      }

      if (toolId === HOSTEX_TOOL_IDS.listIncomeMethods) {
        await callSuccessfulTool(activeHarness, toolId, {});
        tracker.pass(toolId);
        continue;
      }

      throw new Error(`Unhandled read-only tool in e2e suite: ${toolId}`);
    }

    tracker.assertComplete("read-only");
  }, 120_000);
});

async function callSuccessfulTool(
  harness: McpTestHarness,
  toolId: HostexToolId,
  args?: Record<string, unknown>,
) {
  const result = await harness.callTool(toolId, args);
  expect(result.isError).not.toBe(true);

  const payload = result.structuredContent;
  expect(payload).toBeDefined();
  expect(typeof payload).toBe("object");

  return (payload ?? {}) as Record<string, unknown>;
}

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
