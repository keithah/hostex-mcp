import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "hostex_mcp_",
});

const durationBucketsSeconds = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export const toolCallsTotal = new Counter({
  name: "hostex_mcp_tool_calls_total",
  help: "Total number of MCP tool calls by tool and status",
  labelNames: ["tool", "status"] as const,
  registers: [metricsRegistry],
});

export const toolDurationSeconds = new Histogram({
  name: "hostex_mcp_tool_duration_seconds",
  help: "End-to-end MCP tool execution duration in seconds",
  labelNames: ["tool"] as const,
  buckets: durationBucketsSeconds,
  registers: [metricsRegistry],
});

export const toolErrorsTotal = new Counter({
  name: "hostex_mcp_tool_errors_total",
  help: "Total number of MCP tool errors grouped by category",
  labelNames: ["tool", "category"] as const,
  registers: [metricsRegistry],
});

export const gatewayRequestsTotal = new Counter({
  name: "hostex_mcp_gateway_requests_total",
  help: "Total gateway requests by operation and outcome",
  labelNames: ["operation", "status"] as const,
  registers: [metricsRegistry],
});

export const gatewayDurationSeconds = new Histogram({
  name: "hostex_mcp_gateway_duration_seconds",
  help: "Gateway request duration including throttling/retries in seconds",
  labelNames: ["operation"] as const,
  buckets: durationBucketsSeconds,
  registers: [metricsRegistry],
});

export const gatewayRetriesTotal = new Counter({
  name: "hostex_mcp_gateway_retries_total",
  help: "Retry attempts triggered by gateway error classification",
  labelNames: ["operation", "reason"] as const,
  registers: [metricsRegistry],
});

export const hostexOutboundDurationSeconds = new Histogram({
  name: "hostex_mcp_hostex_request_duration_seconds",
  help: "Hostex outbound request attempt duration in seconds",
  labelNames: ["operation", "status"] as const,
  buckets: durationBucketsSeconds,
  registers: [metricsRegistry],
});

export const rateLimitMetadataModeTotal = new Counter({
  name: "hostex_mcp_rate_limit_metadata_mode_total",
  help: "Rate limit metadata source mode observed by gateway",
  labelNames: ["operation", "mode"] as const,
  registers: [metricsRegistry],
});
