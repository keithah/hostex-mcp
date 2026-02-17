import {
  HostexClient,
  type HostexClientConfig,
} from "hostex-ts";

import type { HostexApiClient } from "../types/hostex-client.js";

type HostexClientConstructor = (config: HostexClientConfig) => HostexApiClient;

export interface HostexClientFactoryOptions {
  accessToken: string;
  baseUrl?: string;
  timeoutMs?: number;
  createClient?: HostexClientConstructor;
}

export interface HostexClientRequestOptions {
  timeoutMs?: number;
}

export type HostexClientFactory = (
  request?: HostexClientRequestOptions,
) => HostexApiClient;

export function createHostexClientFactory(
  options: HostexClientFactoryOptions,
): HostexClientFactory {
  const {
    accessToken,
    baseUrl,
    timeoutMs,
    createClient = (config) => new HostexClient(config),
  } = options;

  return (request = {}) =>
    createClient({
      accessToken,
      baseUrl,
      timeout: request.timeoutMs ?? timeoutMs,
    });
}
