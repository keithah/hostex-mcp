import {
  AuthenticationError,
  ConnectionError,
  HostexAPIError,
  PermissionError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from "hostex-ts";
import pRetry, { AbortError, type Options as PRetryOptions } from "p-retry";

const DEFAULT_RETRY_OPTIONS: PRetryOptions = {
  retries: 3,
  factor: 2,
  minTimeout: 250,
  maxTimeout: 5000,
  randomize: true,
};

export function isRetryableHostexError(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }

  if (error instanceof TimeoutError || error instanceof ConnectionError) {
    return true;
  }

  if (error instanceof ValidationError) {
    return false;
  }

  if (error instanceof AuthenticationError || error instanceof PermissionError) {
    return false;
  }

  if (error instanceof HostexAPIError) {
    return error.error_code >= 500;
  }

  return false;
}

function toAbortError(error: unknown): AbortError {
  const message = error instanceof Error ? error.message : String(error);
  return new AbortError(message);
}

export function callWithRetry<T>(
  run: () => Promise<T>,
  options?: Partial<PRetryOptions>,
): Promise<T> {
  return pRetry(async () => {
    try {
      return await run();
    } catch (error) {
      if (!isRetryableHostexError(error)) {
        throw toAbortError(error);
      }

      throw error;
    }
  }, { ...DEFAULT_RETRY_OPTIONS, ...options });
}
