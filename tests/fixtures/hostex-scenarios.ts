import type { HostexAPIResponse } from "hostex-ts";

import {
  createChannelFixture,
  createConversationFixture,
  createHostexEmptyEnvelope,
  createHostexEnvelope,
  createPropertyFixture,
  createReservationFixture,
  createReviewFixture,
  createWebhookFixture,
} from "./hostex-factories.js";

export function createSuccessScenario() {
  return {
    listProperties: createHostexEnvelope({
      properties: [createPropertyFixture()],
      total: 1,
    }),
    listRoomTypes: createHostexEnvelope({
      room_types: [
        {
          id: 10,
          title: "Suite",
          properties: [createPropertyFixture()],
          channels: [createChannelFixture()],
        },
      ],
      total: 1,
    }),
    listReservations: createHostexEnvelope({
      reservations: [createReservationFixture()],
      total: 1,
    }),
    createReservation: createHostexEnvelope({
      reservation: createReservationFixture(),
    }),
    emptySuccess: createHostexEmptyEnvelope(),
    getCustomFields: createHostexEnvelope({
      custom_fields: { lockbox_code: "1234" },
    }),
    listAvailabilities: createHostexEnvelope({
      listings: [{ listing_id: "listing-1001", availabilities: [] }],
    }),
    listConversations: createHostexEnvelope({
      conversations: [createConversationFixture()],
      total: 1,
    }),
    getConversation: createHostexEnvelope({
      guest: { name: "Guest Example" },
      channel_type: "airbnb",
      messages: [{ id: "message-1", content: "Hello" }],
    }),
    listReviews: createHostexEnvelope({
      reviews: [createReviewFixture()],
      total: 1,
    }),
    listWebhooks: createHostexEnvelope({
      webhooks: [createWebhookFixture()],
    }),
    createWebhook: createHostexEnvelope({
      webhook: createWebhookFixture(),
    }),
    getListingCalendar: createHostexEnvelope({
      listings: [{ listing_id: "listing-1001", calendar: [] }],
    }),
    listCustomChannels: createHostexEnvelope({
      custom_channels: [{ id: 1, name: "Direct" }],
    }),
    listIncomeMethods: createHostexEnvelope({
      income_methods: [{ id: 1, name: "Wire Transfer" }],
    }),
  };
}

export function createValidationMismatchScenario(): HostexAPIResponse {
  return {
    request_id: "req-bad-shape",
    error_code: 0,
    error_msg: "",
    data: {
      total: "invalid-total-type",
    },
  };
}

export function createUpstreamErrorScenario(message = "Hostex unavailable") {
  return new Error(message);
}
