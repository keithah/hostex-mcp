import { TimeoutError } from "hostex-ts";

const DEFAULT_TIMEOUT_MS = 15000;

export function resolveTimeoutMs(timeoutMs?: number): number {
  return timeoutMs ?? DEFAULT_TIMEOUT_MS;
}

export async function withTimeout<T>(
  run: () => Promise<T>,
  timeoutMs?: number,
): Promise<T> {
  const effectiveTimeout = resolveTimeoutMs(timeoutMs);
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new TimeoutError(`Hostex request timed out after ${effectiveTimeout}ms`));
      }, effectiveTimeout);
    });

    return await Promise.race([run(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
