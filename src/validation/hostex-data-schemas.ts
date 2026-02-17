import { z } from "zod";

const channelSchema = z.object({
  channel_type: z.string(),
  listing_id: z.string(),
}).catchall(z.unknown());

const propertySchema = z.object({
  id: z.number(),
  title: z.string(),
  address: z.string().optional(),
  longitude: z.union([z.string(), z.number(), z.null()]).optional(),
  latitude: z.union([z.string(), z.number(), z.null()]).optional(),
  channels: z.array(channelSchema),
}).catchall(z.unknown());

const roomTypeSchema = z.strictObject({
  id: z.number(),
  title: z.string(),
  properties: z.array(propertySchema),
  channels: z.array(channelSchema),
});

const reservationSchema = z.object({
  reservation_code: z.string(),
  stay_code: z.string(),
  property_id: z.number(),
  channel_type: z.string(),
  status: z.enum([
    "wait_accept",
    "wait_pay",
    "accepted",
    "cancelled",
    "denied",
    "timeout",
  ]),
  check_in_date: z.string(),
  check_out_date: z.string(),
  guest_name: z.string().optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  number_of_guests: z.number().optional(),
  currency: z.string().optional(),
  rate_amount: z.number().optional(),
  commission_amount: z.number().optional(),
  received_amount: z.number().optional(),
  booked_at: z.string().optional(),
}).catchall(z.unknown());

const createReservationSchema = z.object({
  reservation_code: z.string(),
  stay_code: z.string().optional(),
}).catchall(z.unknown());

const conversationSchema = z.object({
  id: z.string(),
  channel_type: z.string(),
  guest: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    mobile: z.string().optional(),
  }).catchall(z.unknown()),
  property_id: z.number().optional(),
  property_title: z.string().optional(),
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  last_message_at: z.string().optional(),
  unread_count: z.number().optional(),
}).catchall(z.unknown());

const reviewSchema = z.object({
  reservation_code: z.string(),
  property_id: z.number(),
  channel_type: z.string(),
  check_out_date: z.string(),
  review_status: z.string().optional(),
  host_review: z
    .object({
      score: z.number().optional(),
      content: z.string().optional(),
      created_at: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
  guest_review: z
    .object({
      score: z.number().optional(),
      content: z.string().optional(),
      created_at: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
  host_reply: z
    .object({
      content: z.string().optional(),
      created_at: z.string().optional(),
    })
    .catchall(z.unknown())
    .nullable()
    .optional(),
}).catchall(z.unknown());

const webhookSchema = z.strictObject({
  id: z.number(),
  url: z.string(),
  manageable: z.boolean(),
  created_at: z.string(),
});

const customChannelSchema = z.strictObject({
  id: z.number(),
  name: z.string(),
});

const incomeMethodSchema = z.strictObject({
  id: z.number(),
  name: z.string(),
});

const emptyDataSchema = z.union([z.undefined(), z.null(), z.strictObject({})]);

const updateCustomFieldsSchema = z.object({
  custom_fields: z.union([z.record(z.string(), z.unknown()), z.null()]),
}).catchall(z.unknown());

export const toolSchemaMap = {
  hostex_list_properties: z.strictObject({
    properties: z.array(propertySchema),
    total: z.number().int().nonnegative(),
  }),
  hostex_list_room_types: z.strictObject({
    room_types: z.array(roomTypeSchema),
    total: z.number().int().nonnegative(),
  }),
  hostex_list_reservations: z.strictObject({
    reservations: z.array(reservationSchema),
    total: z.number().int().nonnegative().optional(),
  }),
  hostex_create_reservation: z.strictObject({
    reservation: createReservationSchema,
  }),
  hostex_cancel_reservation: emptyDataSchema,
  hostex_update_lock_code: emptyDataSchema,
  hostex_get_custom_fields: z.strictObject({
    custom_fields: z.union([z.record(z.string(), z.unknown()), z.null()]),
  }),
  hostex_update_custom_fields: z.union([
    updateCustomFieldsSchema,
    emptyDataSchema,
  ]),
  hostex_list_availabilities: z.strictObject({
    // Hostex currently returns either `listings` or `properties` for this endpoint.
    listings: z.array(z.unknown()).optional(),
    properties: z.array(z.unknown()).optional(),
  }),
  hostex_update_availabilities: emptyDataSchema,
  hostex_list_conversations: z.strictObject({
    conversations: z.array(conversationSchema),
    total: z.number().int().nonnegative().optional(),
  }),
  hostex_get_conversation: z.object({
    // hostex-ts exports guest and messages as broad any types.
    guest: z.unknown(),
    channel_type: z.string(),
    messages: z.array(z.unknown()),
  }).catchall(z.unknown()),
  hostex_send_message: emptyDataSchema,
  hostex_list_reviews: z.strictObject({
    reviews: z.array(reviewSchema),
    total: z.number().int().nonnegative().optional(),
  }),
  hostex_create_review: emptyDataSchema,
  hostex_list_webhooks: z.strictObject({
    webhooks: z.array(webhookSchema),
  }),
  hostex_create_webhook: z.union([
    z.strictObject({
      webhook: webhookSchema,
    }),
    emptyDataSchema,
  ]),
  hostex_delete_webhook: emptyDataSchema,
  hostex_get_listing_calendar: z.strictObject({
    // hostex-ts exports listings as any[] for this endpoint.
    listings: z.array(z.unknown()),
  }),
  hostex_update_listing_prices: emptyDataSchema,
  hostex_list_custom_channels: z.strictObject({
    custom_channels: z.array(customChannelSchema),
  }),
  hostex_list_income_methods: z.strictObject({
    income_methods: z.array(incomeMethodSchema),
  }),
} as const;

export type HostexToolName = keyof typeof toolSchemaMap;
