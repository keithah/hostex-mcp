import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHostexGateway } from "../../../src/client/hostex-gateway.js";
import { metricsRegistry } from "../../../src/observability/metrics.js";
import type { HostexApiClient } from "../../../src/types/hostex-client.js";

function createClientStub(overrides: Partial<HostexApiClient> = {}): HostexApiClient {
  return {
    listProperties: vi.fn(async () => ({ data: { properties: [], total: 0 } })),
    listRoomTypes: vi.fn(async () => ({})),
    listReservations: vi.fn(async () => ({})),
    createReservation: vi.fn(async () => ({})),
    cancelReservation: vi.fn(async () => ({})),
    updateLockCode: vi.fn(async () => ({})),
    getCustomFields: vi.fn(async () => ({})),
    updateCustomFields: vi.fn(async () => ({})),
    listAvailabilities: vi.fn(async () => ({})),
    updateAvailabilities: vi.fn(async () => ({})),
    getListingCalendar: vi.fn(async () => ({})),
    updateListingPrices: vi.fn(async () => ({})),
    listConversations: vi.fn(async () => ({})),
    getConversation: vi.fn(async () => ({})),
    sendMessage: vi.fn(async () => ({})),
    listReviews: vi.fn(async () => ({})),
    createReview: vi.fn(async () => ({})),
    listWebhooks: vi.fn(async () => ({})),
    createWebhook: vi.fn(async () => ({})),
    deleteWebhook: vi.fn(async () => ({})),
    listCustomChannels: vi.fn(async () => ({})),
    listIncomeMethods: vi.fn(async () => ({})),
    ...overrides,
  } as HostexApiClient;
}

describe("observability metrics", () => {
  beforeEach(() => {
    metricsRegistry.resetMetrics();
  });

  it("registers tool and gateway metrics in Prometheus format", async () => {
    const gateway = createHostexGateway({
      clientFactory: () => createClientStub(),
      retryOptions: { retries: 0 },
      throttleOptions: { maxConcurrent: 1, minTimeMs: 0 },
      timeoutMs: 100,
    });

    await gateway.listProperties({ offset: 0, limit: 1 });

    const output = await metricsRegistry.metrics();
    expect(output).toContain("hostex_mcp_tool_duration_seconds");
    expect(output).toContain("hostex_mcp_tool_calls_total{tool=\"listProperties\",status=\"success\"} 1");
    expect(output).toContain("hostex_mcp_gateway_requests_total{operation=\"listProperties\",status=\"success\"} 1");
    expect(output).toContain("hostex_mcp_hostex_request_duration_seconds");
  });

  it("records error category labels on failed tool execution", async () => {
    const gateway = createHostexGateway({
      clientFactory: () =>
        createClientStub({
          listProperties: vi.fn(async () => {
            throw new Error("boom");
          }),
        }),
      retryOptions: { retries: 0 },
      throttleOptions: { maxConcurrent: 1, minTimeMs: 0 },
      timeoutMs: 100,
    });

    await expect(gateway.listProperties({ offset: 0, limit: 1 })).rejects.toThrow("boom");

    const output = await metricsRegistry.metrics();
    expect(output).toContain("hostex_mcp_tool_errors_total{tool=\"listProperties\",category=\"Error\"} 1");
    expect(output).toContain("hostex_mcp_gateway_requests_total{operation=\"listProperties\",status=\"error\"} 1");
  });
});
