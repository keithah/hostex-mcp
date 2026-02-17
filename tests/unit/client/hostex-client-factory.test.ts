import type { HostexClientConfig } from "hostex-ts";
import { describe, expect, it, vi } from "vitest";

import {
  createHostexClientFactory,
  type HostexClientFactoryOptions,
} from "../../../src/client/hostex-client-factory.js";
import type { HostexApiClient } from "../../../src/types/hostex-client.js";

function createFactoryOptions(overrides: Partial<HostexClientFactoryOptions> = {}) {
  return {
    accessToken: "test-token",
    ...overrides,
  } satisfies HostexClientFactoryOptions;
}

describe("createHostexClientFactory", () => {
  it("builds clients with configured base options", () => {
    const createClient = vi.fn((config: HostexClientConfig): HostexApiClient => {
      return { config } as unknown as HostexApiClient;
    });
    const factory = createHostexClientFactory(
      createFactoryOptions({
        baseUrl: "https://example.hostex.test",
        timeoutMs: 15000,
        createClient,
      }),
    );

    factory();

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith({
      accessToken: "test-token",
      baseUrl: "https://example.hostex.test",
      timeout: 15000,
    });
  });

  it("allows request timeout overrides", () => {
    const createClient = vi.fn((config: HostexClientConfig): HostexApiClient => {
      return { config } as unknown as HostexApiClient;
    });
    const factory = createHostexClientFactory(
      createFactoryOptions({ timeoutMs: 15000, createClient }),
    );

    factory({ timeoutMs: 2500 });

    expect(createClient).toHaveBeenCalledWith({
      accessToken: "test-token",
      baseUrl: undefined,
      timeout: 2500,
    });
  });

  it("creates a new client instance for each request", () => {
    const createClient = vi
      .fn<(config: HostexClientConfig) => HostexApiClient>()
      .mockReturnValueOnce({ marker: 1 } as unknown as HostexApiClient)
      .mockReturnValueOnce({ marker: 2 } as unknown as HostexApiClient);
    const factory = createHostexClientFactory(
      createFactoryOptions({ createClient }),
    );

    const first = factory();
    const second = factory();

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(first).not.toBe(second);
  });
});
