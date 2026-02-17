import type {
  Channel,
  Conversation,
  HostexAPIResponse,
  Property,
  Reservation,
  Review,
  Webhook,
} from "hostex-ts";

type EnvelopeOverrides<TData> = Partial<HostexAPIResponse<TData>>;

export function createHostexEnvelope<TData>(
  data: TData,
  overrides: EnvelopeOverrides<TData> = {},
): HostexAPIResponse<TData> {
  return {
    request_id: overrides.request_id ?? "req-test-0001",
    error_code: overrides.error_code ?? 0,
    error_msg: overrides.error_msg ?? "",
    data: overrides.data ?? data,
  };
}

export function createHostexEmptyEnvelope(
  overrides: EnvelopeOverrides<undefined> = {},
): HostexAPIResponse {
  return {
    request_id: overrides.request_id ?? "req-test-empty",
    error_code: overrides.error_code ?? 0,
    error_msg: overrides.error_msg ?? "",
    data: overrides.data,
  };
}

export function createChannelFixture(
  overrides: Partial<Channel> = {},
): Channel {
  return {
    channel_type: overrides.channel_type ?? "airbnb",
    listing_id: overrides.listing_id ?? "listing-1001",
  };
}

export function createPropertyFixture(
  overrides: Partial<Property> = {},
): Property {
  return {
    id: overrides.id ?? 1001,
    title: overrides.title ?? "Demo Property",
    address: overrides.address ?? "100 Testing Lane",
    longitude: overrides.longitude ?? "1.2300",
    latitude: overrides.latitude ?? "4.5600",
    channels: overrides.channels ?? [createChannelFixture()],
  };
}

export function createReservationFixture(
  overrides: Partial<Reservation> = {},
): Reservation {
  return {
    reservation_code: overrides.reservation_code ?? "R-0001",
    stay_code: overrides.stay_code ?? "S-0001",
    property_id: overrides.property_id ?? 1001,
    channel_type: overrides.channel_type ?? "airbnb",
    status: overrides.status ?? "accepted",
    check_in_date: overrides.check_in_date ?? "2026-03-01",
    check_out_date: overrides.check_out_date ?? "2026-03-05",
    guest_name: overrides.guest_name ?? "Guest Example",
    email: overrides.email ?? "guest@example.com",
    mobile: overrides.mobile ?? "+15555550123",
    number_of_guests: overrides.number_of_guests ?? 2,
    currency: overrides.currency ?? "USD",
    rate_amount: overrides.rate_amount ?? 125000,
    commission_amount: overrides.commission_amount ?? 15000,
    received_amount: overrides.received_amount ?? 110000,
    booked_at: overrides.booked_at ?? "2026-02-01T00:00:00Z",
  };
}

export function createConversationFixture(
  overrides: Partial<Conversation> = {},
): Conversation {
  return {
    id: overrides.id ?? "conversation-1001",
    channel_type: overrides.channel_type ?? "airbnb",
    guest: overrides.guest ?? {
      name: "Guest Example",
      email: "guest@example.com",
      mobile: "+15555550123",
    },
    property_id: overrides.property_id ?? 1001,
    property_title: overrides.property_title ?? "Demo Property",
    check_in_date: overrides.check_in_date ?? "2026-03-01",
    check_out_date: overrides.check_out_date ?? "2026-03-05",
    last_message_at: overrides.last_message_at ?? "2026-02-27T12:00:00Z",
    unread_count: overrides.unread_count ?? 0,
  };
}

export function createReviewFixture(overrides: Partial<Review> = {}): Review {
  return {
    reservation_code: overrides.reservation_code ?? "R-0001",
    property_id: overrides.property_id ?? 1001,
    channel_type: overrides.channel_type ?? "airbnb",
    check_out_date: overrides.check_out_date ?? "2026-03-05",
    review_status: overrides.review_status ?? "reviewed",
    host_review: overrides.host_review ?? {
      score: 5,
      content: "Great guest",
      created_at: "2026-03-06T00:00:00Z",
    },
    guest_review: overrides.guest_review,
    host_reply: overrides.host_reply,
  };
}

export function createWebhookFixture(
  overrides: Partial<Webhook> = {},
): Webhook {
  return {
    id: overrides.id ?? 401,
    url: overrides.url ?? "https://example.test/webhook",
    manageable: overrides.manageable ?? true,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
  };
}
