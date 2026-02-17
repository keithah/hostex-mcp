import type { Options as PRetryOptions } from "p-retry";

import type {
  HostexApiClient,
  HostexMethodParams,
  HostexMethodResponse,
} from "../types/hostex-client.js";
import type { HostexClientFactory } from "./hostex-client-factory.js";
import { callWithRetry } from "../resilience/retry-policy.js";
import {
  createHostexLimiter,
  parseRateLimitMetadata,
  scheduleHostex,
  type HostexRateLimitMetadata,
  type HostexThrottleOptions,
} from "../resilience/throttle-policy.js";
import {
  resolveTimeoutMs,
  withTimeout,
} from "../resilience/timeout-policy.js";
import {
  observeGatewayError,
  observeGatewayRetry,
  observeGatewaySuccess,
  observeHostexOutboundError,
  observeHostexOutboundSuccess,
  observeToolError,
  observeToolSuccess,
} from "../observability/instrumentation.js";

export interface HostexGatewayOptions {
  clientFactory: HostexClientFactory;
  retryOptions?: Partial<PRetryOptions>;
  timeoutMs?: number;
  throttleOptions?: HostexThrottleOptions;
  onRateLimitMetadata?: (metadata: HostexRateLimitMetadata) => void;
}

export interface HostexGatewayRequestOptions {
  timeoutMs?: number;
}

function extractResponseHeaders(
  value: unknown,
): Headers | Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if ("headers" in value) {
    const headers = (value as { headers?: unknown }).headers;
    if (
      headers instanceof Headers ||
      (headers && typeof headers === "object")
    ) {
      return headers as Headers | Record<string, unknown>;
    }
  }

  return undefined;
}

export function createHostexGateway(options: HostexGatewayOptions): HostexApiClient {
  const limiter = createHostexLimiter(options.throttleOptions);

  const execute = <T>(
    operation: keyof HostexApiClient,
    run: (client: HostexApiClient) => Promise<T>,
    request?: HostexGatewayRequestOptions,
  ): Promise<T> => {
    const startedAt = Date.now();
    const timeoutMs = resolveTimeoutMs(request?.timeoutMs ?? options.timeoutMs);

    const retryOptions = {
      ...options.retryOptions,
      onFailedAttempt: (
        error: Parameters<NonNullable<PRetryOptions["onFailedAttempt"]>>[0],
      ) => {
        observeGatewayRetry(operation, error);
        options.retryOptions?.onFailedAttempt?.(error);
      },
    };

    return callWithRetry(async () => {
      const outboundStartedAt = Date.now();

      return scheduleHostex(limiter, () =>
        withTimeout(async () => {
          const client = options.clientFactory({ timeoutMs });
          try {
            const response = await run(client);
            observeHostexOutboundSuccess(
              operation,
              (Date.now() - outboundStartedAt) / 1000,
            );

            const headers = extractResponseHeaders(response);
            const metadata = parseRateLimitMetadata(headers);
            if (metadata) {
              options.onRateLimitMetadata?.(metadata);
            }

            return response;
          } catch (error) {
            observeHostexOutboundError(operation, (Date.now() - outboundStartedAt) / 1000);
            throw error;
          }
        }, timeoutMs),
      );
    }, retryOptions)
      .then((result) => {
        const durationSeconds = (Date.now() - startedAt) / 1000;
        observeToolSuccess(operation, durationSeconds);
        observeGatewaySuccess(operation, durationSeconds);
        return result;
      })
      .catch((error) => {
        const durationSeconds = (Date.now() - startedAt) / 1000;
        observeToolError(operation, error, durationSeconds);
        observeGatewayError(operation, error, durationSeconds);
        throw error;
      });
  };

  return {
    listProperties(params?: HostexMethodParams<"listProperties">[0]) {
      return execute("listProperties", (client) => client.listProperties(params));
    },
    listRoomTypes(params?: HostexMethodParams<"listRoomTypes">[0]) {
      return execute("listRoomTypes", (client) => client.listRoomTypes(params));
    },
    listReservations(params?: HostexMethodParams<"listReservations">[0]) {
      return execute("listReservations", (client) => client.listReservations(params));
    },
    createReservation(data: HostexMethodParams<"createReservation">[0]) {
      return execute("createReservation", (client) => client.createReservation(data));
    },
    cancelReservation(reservationCode: HostexMethodParams<"cancelReservation">[0]) {
      return execute("cancelReservation", (client) => client.cancelReservation(reservationCode));
    },
    updateLockCode(
      stayCode: HostexMethodParams<"updateLockCode">[0],
      lockCode: HostexMethodParams<"updateLockCode">[1],
    ) {
      return execute("updateLockCode", (client) => client.updateLockCode(stayCode, lockCode));
    },
    getCustomFields(stayCode: HostexMethodParams<"getCustomFields">[0]) {
      return execute("getCustomFields", (client) => client.getCustomFields(stayCode));
    },
    updateCustomFields(
      stayCode: HostexMethodParams<"updateCustomFields">[0],
      customFields: HostexMethodParams<"updateCustomFields">[1],
    ) {
      return execute("updateCustomFields", (client) =>
        client.updateCustomFields(stayCode, customFields));
    },
    listAvailabilities(params: HostexMethodParams<"listAvailabilities">[0]) {
      return execute("listAvailabilities", (client) => client.listAvailabilities(params));
    },
    updateAvailabilities(data: HostexMethodParams<"updateAvailabilities">[0]) {
      return execute("updateAvailabilities", (client) => client.updateAvailabilities(data));
    },
    getListingCalendar(data: HostexMethodParams<"getListingCalendar">[0]) {
      return execute("getListingCalendar", (client) => client.getListingCalendar(data));
    },
    updateListingPrices(data: HostexMethodParams<"updateListingPrices">[0]) {
      return execute("updateListingPrices", (client) => client.updateListingPrices(data));
    },
    listConversations(params?: HostexMethodParams<"listConversations">[0]) {
      return execute("listConversations", (client) => client.listConversations(params));
    },
    getConversation(conversationId: HostexMethodParams<"getConversation">[0]) {
      return execute("getConversation", (client) => client.getConversation(conversationId));
    },
    sendMessage(
      conversationId: HostexMethodParams<"sendMessage">[0],
      data: HostexMethodParams<"sendMessage">[1],
    ) {
      return execute("sendMessage", (client) => client.sendMessage(conversationId, data));
    },
    listReviews(params?: HostexMethodParams<"listReviews">[0]) {
      return execute("listReviews", (client) => client.listReviews(params));
    },
    createReview(
      reservationCode: HostexMethodParams<"createReview">[0],
      data: HostexMethodParams<"createReview">[1],
    ) {
      return execute("createReview", (client) => client.createReview(reservationCode, data));
    },
    listWebhooks() {
      return execute("listWebhooks", (client) => client.listWebhooks());
    },
    createWebhook(url: HostexMethodParams<"createWebhook">[0]) {
      return execute("createWebhook", (client) => client.createWebhook(url));
    },
    deleteWebhook(webhookId: HostexMethodParams<"deleteWebhook">[0]) {
      return execute("deleteWebhook", (client) => client.deleteWebhook(webhookId));
    },
    listCustomChannels() {
      return execute("listCustomChannels", (client) => client.listCustomChannels());
    },
    listIncomeMethods() {
      return execute("listIncomeMethods", (client) => client.listIncomeMethods());
    },
  } as {
    [K in keyof HostexApiClient]: (...args: HostexMethodParams<K>) => Promise<HostexMethodResponse<K>>;
  };
}
