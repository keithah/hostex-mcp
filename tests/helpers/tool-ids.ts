export const HOSTEX_TOOL_IDS = {
  listProperties: "hostex_list_properties",
  listRoomTypes: "hostex_list_room_types",
  listReservations: "hostex_list_reservations",
  createReservation: "hostex_create_reservation",
  cancelReservation: "hostex_cancel_reservation",
  updateLockCode: "hostex_update_lock_code",
  getCustomFields: "hostex_get_custom_fields",
  updateCustomFields: "hostex_update_custom_fields",
  listAvailabilities: "hostex_list_availabilities",
  updateAvailabilities: "hostex_update_availabilities",
  listConversations: "hostex_list_conversations",
  getConversation: "hostex_get_conversation",
  sendMessage: "hostex_send_message",
  listReviews: "hostex_list_reviews",
  createReview: "hostex_create_review",
  listWebhooks: "hostex_list_webhooks",
  createWebhook: "hostex_create_webhook",
  deleteWebhook: "hostex_delete_webhook",
  getListingCalendar: "hostex_get_listing_calendar",
  updateListingPrices: "hostex_update_listing_prices",
  listCustomChannels: "hostex_list_custom_channels",
  listIncomeMethods: "hostex_list_income_methods",
} as const;

export type HostexToolId =
  (typeof HOSTEX_TOOL_IDS)[keyof typeof HOSTEX_TOOL_IDS];

export const HOSTEX_TOOL_ID_LIST: readonly HostexToolId[] =
  Object.values(HOSTEX_TOOL_IDS);
