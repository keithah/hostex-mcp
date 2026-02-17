import { expect } from "vitest";

import {
  HOSTEX_TOOL_ID_LIST,
  HOSTEX_TOOL_IDS,
  type HostexToolId,
} from "../helpers/tool-ids.js";

type ToolMode = "read-only" | "mutation";

type ToolMatrixEntry = {
  mode: ToolMode;
  requires?: string;
  cleanup?: string;
};

export const E2E_TOOL_MATRIX: Record<HostexToolId, ToolMatrixEntry> = {
  [HOSTEX_TOOL_IDS.listProperties]: { mode: "read-only" },
  [HOSTEX_TOOL_IDS.listRoomTypes]: { mode: "read-only" },
  [HOSTEX_TOOL_IDS.listReservations]: { mode: "read-only" },
  [HOSTEX_TOOL_IDS.getCustomFields]: {
    mode: "read-only",
    requires: "stay_code from list_reservations or created reservation",
  },
  [HOSTEX_TOOL_IDS.listAvailabilities]: {
    mode: "read-only",
    requires: "property ID from list_properties",
  },
  [HOSTEX_TOOL_IDS.listConversations]: { mode: "read-only" },
  [HOSTEX_TOOL_IDS.getConversation]: {
    mode: "read-only",
    requires: "conversation ID from list_conversations",
  },
  [HOSTEX_TOOL_IDS.listReviews]: { mode: "read-only" },
  [HOSTEX_TOOL_IDS.listWebhooks]: { mode: "read-only" },
  [HOSTEX_TOOL_IDS.getListingCalendar]: {
    mode: "read-only",
    requires: "channel_type + listing_id from list_properties channels",
  },
  [HOSTEX_TOOL_IDS.listCustomChannels]: { mode: "read-only" },
  [HOSTEX_TOOL_IDS.listIncomeMethods]: { mode: "read-only" },

  [HOSTEX_TOOL_IDS.createReservation]: {
    mode: "mutation",
    requires: "property/custom_channel/income_method IDs",
    cleanup: "cancel created reservation in finally block",
  },
  [HOSTEX_TOOL_IDS.cancelReservation]: {
    mode: "mutation",
    requires: "reservation_code from create_reservation",
  },
  [HOSTEX_TOOL_IDS.updateLockCode]: {
    mode: "mutation",
    requires: "stay_code and explicit opt-in env flag",
    cleanup: "disabled by default due external side effects",
  },
  [HOSTEX_TOOL_IDS.updateCustomFields]: {
    mode: "mutation",
    requires: "stay_code from create_reservation",
    cleanup: "overwrite temporary field with blank value",
  },
  [HOSTEX_TOOL_IDS.updateAvailabilities]: {
    mode: "mutation",
    requires: "property ID from list_properties",
    cleanup: "idempotent write uses available=true",
  },
  [HOSTEX_TOOL_IDS.sendMessage]: {
    mode: "mutation",
    requires: "conversation_id and explicit opt-in env flag",
    cleanup: "disabled by default to avoid guest spam",
  },
  [HOSTEX_TOOL_IDS.createReview]: {
    mode: "mutation",
    requires: "reservation_code and explicit opt-in env flag",
    cleanup: "disabled by default to avoid irreversible external writes",
  },
  [HOSTEX_TOOL_IDS.createWebhook]: {
    mode: "mutation",
    cleanup: "delete created webhook ID in finally block",
  },
  [HOSTEX_TOOL_IDS.deleteWebhook]: {
    mode: "mutation",
    requires: "webhook ID from create_webhook",
  },
  [HOSTEX_TOOL_IDS.updateListingPrices]: {
    mode: "mutation",
    requires: "channel_type + listing_id and explicit opt-in env flag",
    cleanup: "disabled by default to avoid calendar price drift",
  },
};

export const READ_ONLY_TOOL_IDS = HOSTEX_TOOL_ID_LIST.filter(
  (toolId) => E2E_TOOL_MATRIX[toolId].mode === "read-only",
);

export const MUTATION_TOOL_IDS = HOSTEX_TOOL_ID_LIST.filter(
  (toolId) => E2E_TOOL_MATRIX[toolId].mode === "mutation",
);

export type ToolOutcome = {
  status: "passed" | "skipped";
  reason?: string;
};

export function createOutcomeTracker(toolIds: readonly HostexToolId[]) {
  const outcomes = new Map<HostexToolId, ToolOutcome>();

  return {
    pass(toolId: HostexToolId) {
      outcomes.set(toolId, { status: "passed" });
    },
    skip(toolId: HostexToolId, reason: string) {
      outcomes.set(toolId, { status: "skipped", reason });
    },
    assertComplete(scope: string) {
      for (const toolId of toolIds) {
        if (!outcomes.has(toolId)) {
          throw new Error(
            `Missing ${scope} smoke accounting for ${toolId}; matrix gap detected.`,
          );
        }
      }

      const uncovered = HOSTEX_TOOL_ID_LIST.filter(
        (toolId) => !READ_ONLY_TOOL_IDS.includes(toolId) && !MUTATION_TOOL_IDS.includes(toolId),
      );
      expect(uncovered).toEqual([]);
    },
  };
}

export function assertToolMatrixParity() {
  expect(HOSTEX_TOOL_ID_LIST).toHaveLength(22);
  expect(Object.keys(E2E_TOOL_MATRIX)).toHaveLength(22);
  expect(new Set(Object.keys(E2E_TOOL_MATRIX))).toEqual(new Set(HOSTEX_TOOL_ID_LIST));
  expect(READ_ONLY_TOOL_IDS.length + MUTATION_TOOL_IDS.length).toBe(22);
}

export function getE2EGate() {
  const accessToken = process.env.HOSTEX_ACCESS_TOKEN;
  const enabled = process.env.HOSTEX_E2E_ENABLED === "true" && Boolean(accessToken);

  if (enabled) {
    return { enabled: true as const, accessToken };
  }

  const reason =
    process.env.HOSTEX_E2E_ENABLED !== "true"
      ? "HOSTEX_E2E_ENABLED must be true"
      : "HOSTEX_ACCESS_TOKEN is missing";

  return { enabled: false as const, reason };
}

export function nextDateRange(daysFromNow = 14, spanDays = 2) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + daysFromNow);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + spanDays);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
