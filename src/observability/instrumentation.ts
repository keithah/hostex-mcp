import {
  gatewayDurationSeconds,
  gatewayRequestsTotal,
  gatewayRetriesTotal,
  hostexOutboundDurationSeconds,
  rateLimitMetadataModeTotal,
  toolCallsTotal,
  toolDurationSeconds,
  toolErrorsTotal,
} from "./metrics.js";

function classifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.name || "Error";
  }

  return "UnknownError";
}

export function observeToolSuccess(tool: string, durationSeconds: number): void {
  toolCallsTotal.inc({ tool, status: "success" });
  toolDurationSeconds.observe({ tool }, durationSeconds);
}

export function observeToolError(
  tool: string,
  error: unknown,
  durationSeconds: number,
): void {
  const category = classifyError(error);
  toolCallsTotal.inc({ tool, status: "error" });
  toolErrorsTotal.inc({ tool, category });
  toolDurationSeconds.observe({ tool }, durationSeconds);
}

export function observeGatewaySuccess(operation: string, durationSeconds: number): void {
  gatewayRequestsTotal.inc({ operation, status: "success" });
  gatewayDurationSeconds.observe({ operation }, durationSeconds);
}

export function observeGatewayError(
  operation: string,
  _error: unknown,
  durationSeconds: number,
): void {
  gatewayRequestsTotal.inc({ operation, status: "error" });
  gatewayDurationSeconds.observe({ operation }, durationSeconds);
}

export function observeGatewayRetry(operation: string, error: unknown): void {
  gatewayRetriesTotal.inc({ operation, reason: classifyError(error) });
}

export function observeHostexOutboundSuccess(
  operation: string,
  durationSeconds: number,
): void {
  hostexOutboundDurationSeconds.observe({ operation, status: "success" }, durationSeconds);
}

export function observeHostexOutboundError(
  operation: string,
  durationSeconds: number,
): void {
  hostexOutboundDurationSeconds.observe({ operation, status: "error" }, durationSeconds);
}

export function observeRateLimitMetadataMode(
  operation: string,
  mode: "headers" | "fallback",
): void {
  rateLimitMetadataModeTotal.inc({ operation, mode });
}
