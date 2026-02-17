import Bottleneck from "bottleneck";

export interface HostexRateLimitMetadata {
  limit?: number;
  remaining?: number;
  resetAtEpochSeconds?: number;
  retryAfterSeconds?: number;
}

export interface HostexThrottleOptions {
  maxConcurrent?: number;
  minTimeMs?: number;
}

const DEFAULT_THROTTLE_OPTIONS: Required<HostexThrottleOptions> = {
  maxConcurrent: 3,
  minTimeMs: 150,
};

function parseNumericHeader(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readHeaderValue(headers: Headers | Record<string, unknown>, key: string): string | null {
  if (headers instanceof Headers) {
    return headers.get(key);
  }

  const normalizedKey = key.toLowerCase();
  const match = Object.entries(headers).find(([headerKey]) => headerKey.toLowerCase() === normalizedKey);
  if (!match) {
    return null;
  }

  const value = match[1];
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

export function parseRateLimitMetadata(
  headers: Headers | Record<string, unknown> | undefined,
): HostexRateLimitMetadata | null {
  if (!headers) {
    return null;
  }

  const limit = parseNumericHeader(readHeaderValue(headers, "x-ratelimit-limit"));
  const remaining = parseNumericHeader(readHeaderValue(headers, "x-ratelimit-remaining"));
  const resetAtEpochSeconds = parseNumericHeader(readHeaderValue(headers, "x-ratelimit-reset"));
  const retryAfterSeconds = parseNumericHeader(readHeaderValue(headers, "retry-after"));

  if (
    limit === undefined &&
    remaining === undefined &&
    resetAtEpochSeconds === undefined &&
    retryAfterSeconds === undefined
  ) {
    return null;
  }

  return {
    limit,
    remaining,
    resetAtEpochSeconds,
    retryAfterSeconds,
  };
}

export function createHostexLimiter(options: HostexThrottleOptions = {}): Bottleneck {
  return new Bottleneck({
    maxConcurrent: options.maxConcurrent ?? DEFAULT_THROTTLE_OPTIONS.maxConcurrent,
    minTime: options.minTimeMs ?? DEFAULT_THROTTLE_OPTIONS.minTimeMs,
  });
}

export async function scheduleHostex<T>(
  limiter: Bottleneck,
  run: () => Promise<T>,
): Promise<T> {
  return limiter.schedule(run);
}
