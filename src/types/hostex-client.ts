import type { HostexClient } from "hostex-ts";

type HostexMethodName = keyof {
  [K in keyof HostexClient as HostexClient[K] extends (
    ...args: never[]
  ) => unknown
    ? K
    : never]: true;
};

export type HostexMethodParams<TMethod extends HostexMethodName> = Parameters<
  HostexClient[TMethod]
>;

export type HostexMethodResponse<TMethod extends HostexMethodName> = Awaited<
  ReturnType<HostexClient[TMethod]>
>;

export type ListPropertiesParams = HostexMethodParams<"listProperties">[0];
export type ListPropertiesResponse = HostexMethodResponse<"listProperties">;

export type ListRoomTypesParams = HostexMethodParams<"listRoomTypes">[0];
export type ListRoomTypesResponse = HostexMethodResponse<"listRoomTypes">;

export type ListReservationsParams = HostexMethodParams<"listReservations">[0];
export type ListReservationsResponse = HostexMethodResponse<"listReservations">;

export type CreateReservationData = HostexMethodParams<"createReservation">[0];
export type CreateReservationResponse = HostexMethodResponse<"createReservation">;

export type CancelReservationParams = HostexMethodParams<"cancelReservation">;
export type CancelReservationResponse = HostexMethodResponse<"cancelReservation">;

export type UpdateLockCodeParams = HostexMethodParams<"updateLockCode">;
export type UpdateLockCodeResponse = HostexMethodResponse<"updateLockCode">;

export type GetCustomFieldsParams = HostexMethodParams<"getCustomFields">;
export type GetCustomFieldsResponse = HostexMethodResponse<"getCustomFields">;

export type UpdateCustomFieldsParams = HostexMethodParams<"updateCustomFields">;
export type UpdateCustomFieldsResponse = HostexMethodResponse<"updateCustomFields">;

export type ListAvailabilitiesParams = HostexMethodParams<"listAvailabilities">[0];
export type ListAvailabilitiesResponse = HostexMethodResponse<"listAvailabilities">;

export type UpdateAvailabilitiesData = HostexMethodParams<"updateAvailabilities">[0];
export type UpdateAvailabilitiesResponse = HostexMethodResponse<"updateAvailabilities">;

export type ListConversationsParams = HostexMethodParams<"listConversations">[0];
export type ListConversationsResponse = HostexMethodResponse<"listConversations">;

export type GetConversationParams = HostexMethodParams<"getConversation">;
export type GetConversationResponse = HostexMethodResponse<"getConversation">;

export type SendMessageParams = HostexMethodParams<"sendMessage">;
export type SendMessageResponse = HostexMethodResponse<"sendMessage">;

export type ListReviewsParams = HostexMethodParams<"listReviews">[0];
export type ListReviewsResponse = HostexMethodResponse<"listReviews">;

export type CreateReviewParams = HostexMethodParams<"createReview">;
export type CreateReviewResponse = HostexMethodResponse<"createReview">;

export type ListWebhooksParams = HostexMethodParams<"listWebhooks">;
export type ListWebhooksResponse = HostexMethodResponse<"listWebhooks">;

export type CreateWebhookParams = HostexMethodParams<"createWebhook">;
export type CreateWebhookResponse = HostexMethodResponse<"createWebhook">;

export type DeleteWebhookParams = HostexMethodParams<"deleteWebhook">;
export type DeleteWebhookResponse = HostexMethodResponse<"deleteWebhook">;

export type GetListingCalendarData = HostexMethodParams<"getListingCalendar">[0];
export type GetListingCalendarResponse = HostexMethodResponse<"getListingCalendar">;

export type UpdateListingPricesData = HostexMethodParams<"updateListingPrices">[0];
export type UpdateListingPricesResponse = HostexMethodResponse<"updateListingPrices">;

export type ListCustomChannelsParams = HostexMethodParams<"listCustomChannels">;
export type ListCustomChannelsResponse = HostexMethodResponse<"listCustomChannels">;

export type ListIncomeMethodsParams = HostexMethodParams<"listIncomeMethods">;
export type ListIncomeMethodsResponse = HostexMethodResponse<"listIncomeMethods">;
