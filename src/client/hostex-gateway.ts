import type { Options as PRetryOptions } from "p-retry";

import type {
  HostexApiClient,
  HostexMethodParams,
  HostexMethodResponse,
} from "../types/hostex-client.js";
import type { HostexClientFactory } from "./hostex-client-factory.js";
import { callWithRetry } from "../resilience/retry-policy.js";
import {
  resolveTimeoutMs,
  withTimeout,
} from "../resilience/timeout-policy.js";

export interface HostexGatewayOptions {
  clientFactory: HostexClientFactory;
  retryOptions?: Partial<PRetryOptions>;
  timeoutMs?: number;
}

export interface HostexGatewayRequestOptions {
  timeoutMs?: number;
}

export function createHostexGateway(options: HostexGatewayOptions): HostexApiClient {
  const execute = <T>(
    run: (client: HostexApiClient) => Promise<T>,
    request?: HostexGatewayRequestOptions,
  ): Promise<T> => {
    const timeoutMs = resolveTimeoutMs(request?.timeoutMs ?? options.timeoutMs);

    return callWithRetry(
      () =>
        withTimeout(async () => {
          const client = options.clientFactory({ timeoutMs });
          return run(client);
        }, timeoutMs),
      options.retryOptions,
    );
  };

  return {
    listProperties(params?: HostexMethodParams<"listProperties">[0]) {
      return execute((client) => client.listProperties(params));
    },
    listRoomTypes(params?: HostexMethodParams<"listRoomTypes">[0]) {
      return execute((client) => client.listRoomTypes(params));
    },
    listReservations(params?: HostexMethodParams<"listReservations">[0]) {
      return execute((client) => client.listReservations(params));
    },
    createReservation(data: HostexMethodParams<"createReservation">[0]) {
      return execute((client) => client.createReservation(data));
    },
    cancelReservation(reservationCode: HostexMethodParams<"cancelReservation">[0]) {
      return execute((client) => client.cancelReservation(reservationCode));
    },
    updateLockCode(
      stayCode: HostexMethodParams<"updateLockCode">[0],
      lockCode: HostexMethodParams<"updateLockCode">[1],
    ) {
      return execute((client) => client.updateLockCode(stayCode, lockCode));
    },
    getCustomFields(stayCode: HostexMethodParams<"getCustomFields">[0]) {
      return execute((client) => client.getCustomFields(stayCode));
    },
    updateCustomFields(
      stayCode: HostexMethodParams<"updateCustomFields">[0],
      customFields: HostexMethodParams<"updateCustomFields">[1],
    ) {
      return execute((client) => client.updateCustomFields(stayCode, customFields));
    },
    listAvailabilities(params: HostexMethodParams<"listAvailabilities">[0]) {
      return execute((client) => client.listAvailabilities(params));
    },
    updateAvailabilities(data: HostexMethodParams<"updateAvailabilities">[0]) {
      return execute((client) => client.updateAvailabilities(data));
    },
    getListingCalendar(data: HostexMethodParams<"getListingCalendar">[0]) {
      return execute((client) => client.getListingCalendar(data));
    },
    updateListingPrices(data: HostexMethodParams<"updateListingPrices">[0]) {
      return execute((client) => client.updateListingPrices(data));
    },
    listConversations(params?: HostexMethodParams<"listConversations">[0]) {
      return execute((client) => client.listConversations(params));
    },
    getConversation(conversationId: HostexMethodParams<"getConversation">[0]) {
      return execute((client) => client.getConversation(conversationId));
    },
    sendMessage(
      conversationId: HostexMethodParams<"sendMessage">[0],
      data: HostexMethodParams<"sendMessage">[1],
    ) {
      return execute((client) => client.sendMessage(conversationId, data));
    },
    listReviews(params?: HostexMethodParams<"listReviews">[0]) {
      return execute((client) => client.listReviews(params));
    },
    createReview(
      reservationCode: HostexMethodParams<"createReview">[0],
      data: HostexMethodParams<"createReview">[1],
    ) {
      return execute((client) => client.createReview(reservationCode, data));
    },
    listWebhooks() {
      return execute((client) => client.listWebhooks());
    },
    createWebhook(url: HostexMethodParams<"createWebhook">[0]) {
      return execute((client) => client.createWebhook(url));
    },
    deleteWebhook(webhookId: HostexMethodParams<"deleteWebhook">[0]) {
      return execute((client) => client.deleteWebhook(webhookId));
    },
    listCustomChannels() {
      return execute((client) => client.listCustomChannels());
    },
    listIncomeMethods() {
      return execute((client) => client.listIncomeMethods());
    },
  } as {
    [K in keyof HostexApiClient]: (...args: HostexMethodParams<K>) => Promise<HostexMethodResponse<K>>;
  };
}
