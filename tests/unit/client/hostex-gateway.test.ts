import {
  TimeoutError,
  ValidationError,
} from "hostex-ts";
import { describe, expect, it, vi } from "vitest";

import { createHostexGateway } from "../../../src/client/hostex-gateway.js";
import type { HostexClientFactory } from "../../../src/client/hostex-client-factory.js";
import type { HostexApiClient } from "../../../src/types/hostex-client.js";

function createHostexClientStub(overrides: Partial<HostexApiClient> = {}): HostexApiClient {
  return {
    listProperties: vi.fn(async () => ({})),
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

function createFactory(createClient: () => HostexApiClient) {
  return vi.fn(() => createClient()) as unknown as ReturnType<typeof vi.fn> &
    HostexClientFactory;
}

describe("createHostexGateway", () => {
  it("retries transient failures and eventually succeeds", async () => {
    const listProperties = vi
      .fn()
      .mockRejectedValueOnce(new TimeoutError("temporary timeout"))
      .mockResolvedValueOnce({ data: { properties: [], total: 0 } });
    const clientFactory = createFactory(() =>
      createHostexClientStub({ listProperties }),
    );
    const gateway = createHostexGateway({
      clientFactory,
      retryOptions: { retries: 1, minTimeout: 1, maxTimeout: 1, randomize: false },
      throttleOptions: { maxConcurrent: 1, minTimeMs: 0 },
      timeoutMs: 200,
    });

    const result = await gateway.listProperties({ offset: 0, limit: 1 });

    expect(result).toEqual({ data: { properties: [], total: 0 } });
    expect(listProperties).toHaveBeenCalledTimes(2);
    expect(clientFactory).toHaveBeenCalledTimes(2);
  });

  it("aborts non-retryable validation failures", async () => {
    const listProperties = vi
      .fn()
      .mockRejectedValue(new ValidationError("invalid request"));
    const clientFactory = createFactory(() =>
      createHostexClientStub({ listProperties }),
    );
    const gateway = createHostexGateway({
      clientFactory,
      retryOptions: { retries: 3, minTimeout: 1, maxTimeout: 1, randomize: false },
      throttleOptions: { maxConcurrent: 1, minTimeMs: 0 },
      timeoutMs: 200,
    });

    await expect(gateway.listProperties({ offset: 0, limit: 1 })).rejects.toThrow(
      "invalid request",
    );
    expect(listProperties).toHaveBeenCalledTimes(1);
    expect(clientFactory).toHaveBeenCalledTimes(1);
  });

  it("enforces centralized throttling for queued calls", async () => {
    let releaseFirstCall: (() => void) | undefined;
    const firstCallBarrier = new Promise<void>((resolve) => {
      releaseFirstCall = resolve;
    });

    const listProperties = vi
      .fn()
      .mockImplementationOnce(async () => {
        await firstCallBarrier;
        return { data: { properties: [], total: 0 } };
      })
      .mockResolvedValueOnce({ data: { properties: [], total: 0 } });

    const clientFactory = createFactory(() =>
      createHostexClientStub({ listProperties }),
    );
    const gateway = createHostexGateway({
      clientFactory,
      retryOptions: { retries: 0 },
      throttleOptions: { maxConcurrent: 1, minTimeMs: 0 },
      timeoutMs: 200,
    });

    const first = gateway.listProperties({ offset: 0, limit: 1 });
    const second = gateway.listProperties({ offset: 1, limit: 1 });

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    expect(clientFactory).toHaveBeenCalledTimes(1);
    if (releaseFirstCall) {
      releaseFirstCall();
    }

    await Promise.all([first, second]);
    expect(clientFactory).toHaveBeenCalledTimes(2);
  });

  it("applies request timeout handling", async () => {
    const listProperties = vi.fn(
      () =>
        new Promise(() => {
          return undefined;
        }),
    ) as unknown as HostexApiClient["listProperties"];
    const clientFactory = createFactory(() =>
      createHostexClientStub({ listProperties }),
    );
    const gateway = createHostexGateway({
      clientFactory,
      retryOptions: { retries: 0 },
      throttleOptions: { maxConcurrent: 1, minTimeMs: 0 },
      timeoutMs: 10,
    });

    await expect(gateway.listProperties({ offset: 0, limit: 1 })).rejects.toBeInstanceOf(
      TimeoutError,
    );
  });
});
