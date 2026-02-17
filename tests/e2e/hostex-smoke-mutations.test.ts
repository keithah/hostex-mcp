import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { HostexToolId } from "../helpers/tool-ids.js";
import { createMcpTestServer, type McpTestHarness } from "../helpers/mcp-test-server.js";
import { HOSTEX_TOOL_IDS } from "../helpers/tool-ids.js";
import {
  MUTATION_TOOL_IDS,
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

type CustomChannelLike = { id?: number };
type IncomeMethodLike = { id?: number };

const gate = getE2EGate();
const describeWhenEnabled = gate.enabled ? describe : describe.skip;
const accessToken = gate.enabled ? gate.accessToken : undefined;

const allowRiskyMutations = {
  lockCode: process.env.HOSTEX_E2E_ALLOW_LOCK_CODE_MUTATION === "true",
  message: process.env.HOSTEX_E2E_ALLOW_MESSAGE_MUTATION === "true",
  review: process.env.HOSTEX_E2E_ALLOW_REVIEW_MUTATION === "true",
  pricing: process.env.HOSTEX_E2E_ALLOW_PRICE_MUTATION === "true",
};

describe("hostex e2e smoke (mutations)", () => {
  it("keeps full 22-tool matrix parity", () => {
    assertToolMatrixParity();
  });
});

describeWhenEnabled("hostex e2e smoke (mutations, real api)", () => {
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

  it("checks mutation-capable tools with cleanup and idempotent safeguards", async () => {
    expect(harness).not.toBeNull();
    const activeHarness = harness as McpTestHarness;
    const tracker = createOutcomeTracker(MUTATION_TOOL_IDS);
    const { startDate, endDate } = nextDateRange();

    let propertyId: number | null = null;
    let listingRef: { channel_type: string; listing_id: string } | null = null;
    let customChannelId: number | null = null;
    let incomeMethodId: number | null = null;
    let reservationCode: string | null = null;
    let stayCode: string | null = null;
    let conversationId: string | null = null;
    let createdWebhookId: number | null = null;
    let reservationCancelled = false;

    const properties = await callSuccessfulTool(activeHarness, HOSTEX_TOOL_IDS.listProperties, {
      offset: 0,
      limit: 20,
    });
    const propertyRows = readArray<PropertyLike>(properties.properties);
    propertyId = propertyRows.find((property) => Number.isFinite(property.id))?.id ?? null;
    const channel = propertyRows
      .flatMap((property) => property.channels ?? [])
      .find(
        (item) => typeof item.channel_type === "string" && typeof item.listing_id === "string",
      );
    listingRef = channel
      ? { channel_type: channel.channel_type as string, listing_id: channel.listing_id as string }
      : null;

    const customChannels = await callSuccessfulTool(
      activeHarness,
      HOSTEX_TOOL_IDS.listCustomChannels,
      {},
    );
    const customChannelRows = readArray<CustomChannelLike>(customChannels.custom_channels);
    customChannelId =
      customChannelRows.find((customChannel) => Number.isFinite(customChannel.id))?.id ?? null;

    const incomeMethods = await callSuccessfulTool(
      activeHarness,
      HOSTEX_TOOL_IDS.listIncomeMethods,
      {},
    );
    const incomeMethodRows = readArray<IncomeMethodLike>(incomeMethods.income_methods);
    incomeMethodId =
      incomeMethodRows.find((incomeMethod) => Number.isFinite(incomeMethod.id))?.id ?? null;

    const reservations = await callSuccessfulTool(activeHarness, HOSTEX_TOOL_IDS.listReservations, {
      offset: 0,
      limit: 20,
      ...(propertyId ? { property_id: propertyId } : {}),
    });
    const reservationRows = readArray<ReservationLike>(reservations.reservations);
    reservationCode =
      reservationRows.find((reservation) => typeof reservation.reservation_code === "string")
        ?.reservation_code ?? null;
    stayCode =
      reservationRows.find((reservation) => typeof reservation.stay_code === "string")?.stay_code ??
      null;

    const conversations = await callSuccessfulTool(activeHarness, HOSTEX_TOOL_IDS.listConversations, {
      offset: 0,
      limit: 20,
    });
    const conversationRows = readArray<ConversationLike>(conversations.conversations);
    conversationId =
      conversationRows.find((conversation) => typeof conversation.id === "string")?.id ?? null;

    try {
      for (const toolId of MUTATION_TOOL_IDS) {
        if (toolId === HOSTEX_TOOL_IDS.createReservation) {
          if (!propertyId || !customChannelId || !incomeMethodId) {
            tracker.skip(
              toolId,
              "Missing property/custom_channel/income_method prerequisites for create_reservation",
            );
            continue;
          }

          const payload = await callSuccessfulTool(activeHarness, toolId, {
            property_id: String(propertyId),
            custom_channel_id: customChannelId,
            check_in_date: startDate,
            check_out_date: endDate,
            guest_name: "Hostex MCP E2E Smoke",
            currency: "USD",
            rate_amount: 100,
            commission_amount: 0,
            received_amount: 100,
            income_method_id: incomeMethodId,
            remarks: "Temporary smoke test reservation",
          });

          const reservation = payload.reservation as ReservationLike | undefined;
          reservationCode = reservation?.reservation_code ?? reservationCode;
          stayCode = reservation?.stay_code ?? stayCode;
          tracker.pass(toolId);
          continue;
        }

        if (toolId === HOSTEX_TOOL_IDS.cancelReservation) {
          if (!reservationCode) {
            tracker.skip(toolId, "No reservation_code available for cancellation cleanup");
            continue;
          }

          await callSuccessfulTool(activeHarness, toolId, {
            reservation_code: reservationCode,
          });
          reservationCancelled = true;
          tracker.pass(toolId);
          continue;
        }

        if (toolId === HOSTEX_TOOL_IDS.updateLockCode) {
          if (!allowRiskyMutations.lockCode) {
            tracker.skip(toolId, "Set HOSTEX_E2E_ALLOW_LOCK_CODE_MUTATION=true to enable");
            continue;
          }
          if (!stayCode) {
            tracker.skip(toolId, "No stay_code available for lock-code mutation");
            continue;
          }

          await callSuccessfulTool(activeHarness, toolId, {
            stay_code: stayCode,
            lock_code: `9${Date.now().toString().slice(-3)}`,
          });
          tracker.pass(toolId);
          continue;
        }

        if (toolId === HOSTEX_TOOL_IDS.updateCustomFields) {
          if (!stayCode) {
            tracker.skip(toolId, "No stay_code available for update_custom_fields");
            continue;
          }

          const cleanupKey = "mcp_e2e_cleanup";
          await callSuccessfulTool(activeHarness, toolId, {
            stay_code: stayCode,
            custom_fields: {
              [cleanupKey]: `set-${Date.now()}`,
            },
          });
          await callSuccessfulTool(activeHarness, toolId, {
            stay_code: stayCode,
            custom_fields: {
              [cleanupKey]: "",
            },
          });
          tracker.pass(toolId);
          continue;
        }

        if (toolId === HOSTEX_TOOL_IDS.updateAvailabilities) {
          if (!propertyId) {
            tracker.skip(toolId, "No property ID available for update_availabilities");
            continue;
          }

          await callSuccessfulTool(activeHarness, toolId, {
            property_ids: [propertyId],
            start_date: startDate,
            end_date: endDate,
            available: true,
          });
          tracker.pass(toolId);
          continue;
        }

        if (toolId === HOSTEX_TOOL_IDS.sendMessage) {
          if (!allowRiskyMutations.message) {
            tracker.skip(toolId, "Set HOSTEX_E2E_ALLOW_MESSAGE_MUTATION=true to enable");
            continue;
          }
          if (!conversationId) {
            tracker.skip(toolId, "No conversation ID available for send_message");
            continue;
          }

          await callSuccessfulTool(activeHarness, toolId, {
            conversation_id: conversationId,
            message: `Hostex MCP smoke message ${Date.now()}`,
          });
          tracker.pass(toolId);
          continue;
        }

        if (toolId === HOSTEX_TOOL_IDS.createReview) {
          if (!allowRiskyMutations.review) {
            tracker.skip(toolId, "Set HOSTEX_E2E_ALLOW_REVIEW_MUTATION=true to enable");
            continue;
          }
          if (!reservationCode) {
            tracker.skip(toolId, "No reservation code available for create_review");
            continue;
          }

          await callSuccessfulTool(activeHarness, toolId, {
            reservation_code: reservationCode,
            host_reply_content: `Hostex MCP smoke review ${Date.now()}`,
          });
          tracker.pass(toolId);
          continue;
        }

        if (toolId === HOSTEX_TOOL_IDS.createWebhook) {
          const result = await activeHarness.callTool(toolId, {
            url: `https://hostex-mcp-smoke-${Date.now()}.invalid/webhook`,
          });

          if (result.isError) {
            const message = readErrorMessage(result.structuredContent);
            if (message.includes("maximum of 5 webhooks")) {
              tracker.skip(toolId, "Hostex account has reached max webhook count");
              continue;
            }

            throw new Error(`${toolId} failed: ${JSON.stringify(result.structuredContent)}`);
          }

          const payload = (result.structuredContent ?? {}) as Record<string, unknown>;
          const webhook = payload.webhook as { id?: number } | undefined;
          createdWebhookId = webhook?.id ?? null;
          tracker.pass(toolId);
          continue;
        }

        if (toolId === HOSTEX_TOOL_IDS.deleteWebhook) {
          if (!createdWebhookId) {
            tracker.skip(toolId, "No webhook ID available from create_webhook cleanup");
            continue;
          }

          await callSuccessfulTool(activeHarness, toolId, {
            webhook_id: createdWebhookId,
          });
          createdWebhookId = null;
          tracker.pass(toolId);
          continue;
        }

        if (toolId === HOSTEX_TOOL_IDS.updateListingPrices) {
          if (!allowRiskyMutations.pricing) {
            tracker.skip(toolId, "Set HOSTEX_E2E_ALLOW_PRICE_MUTATION=true to enable");
            continue;
          }
          if (!listingRef) {
            tracker.skip(toolId, "No channel/listing pair available for update_listing_prices");
            continue;
          }

          await callSuccessfulTool(activeHarness, toolId, {
            channel_type: listingRef.channel_type,
            listing_id: listingRef.listing_id,
            prices: [{ date: startDate, price: 1 }],
          });
          tracker.pass(toolId);
          continue;
        }

        throw new Error(`Unhandled mutation tool in e2e suite: ${toolId}`);
      }
    } finally {
      await cleanupArtifacts(activeHarness, { createdWebhookId, reservationCode, reservationCancelled });
    }

    tracker.assertComplete("mutation");
  }, 120_000);
});

async function cleanupArtifacts(
  harness: McpTestHarness,
  context: {
    createdWebhookId: number | null;
    reservationCode: string | null;
    reservationCancelled: boolean;
  },
) {
  if (context.createdWebhookId) {
    await harness.callTool(HOSTEX_TOOL_IDS.deleteWebhook, {
      webhook_id: context.createdWebhookId,
    });
  }

  if (context.reservationCode && !context.reservationCancelled) {
    await harness.callTool(HOSTEX_TOOL_IDS.cancelReservation, {
      reservation_code: context.reservationCode,
    });
  }
}

async function callSuccessfulTool(
  harness: McpTestHarness,
  toolId: HostexToolId,
  args?: Record<string, unknown>,
) {
  const result = await harness.callTool(toolId, args);
  expect(result.isError, `${toolId} returned error payload: ${JSON.stringify(result.structuredContent)}`).not.toBe(true);

  const payload = result.structuredContent;
  expect(payload).toBeDefined();
  expect(typeof payload).toBe("object");

  return (payload ?? {}) as Record<string, unknown>;
}

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readErrorMessage(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const maybeMessage = (value as { message?: unknown }).message;
  return typeof maybeMessage === "string" ? maybeMessage.toLowerCase() : "";
}
