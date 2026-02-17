import type { Registry } from "prom-client";

import type { HostexApiClient } from "../types/hostex-client.js";
import { metricsRegistry } from "../observability/metrics.js";

export type DeploymentMode = "http" | "smithery-managed";

export interface HealthRouteResult {
  status: number;
  headers?: Record<string, string>;
  body: string;
}

export interface HealthRoutes {
  healthz: () => Promise<HealthRouteResult>;
  readyz: () => Promise<HealthRouteResult>;
  metrics: () => Promise<HealthRouteResult>;
  handle: (path: string) => Promise<HealthRouteResult | null>;
}

export interface HealthRouteOptions {
  gateway: HostexApiClient;
  deploymentMode?: DeploymentMode;
  registry?: Registry;
}

function toJson(status: number, payload: Record<string, unknown>): HealthRouteResult {
  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function formatErrorReason(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

export function createHealthRoutes(options: HealthRouteOptions): HealthRoutes {
  const deploymentMode = options.deploymentMode ?? "http";
  const registry = options.registry ?? metricsRegistry;

  return {
    async healthz() {
      return toJson(200, {
        status: "ok",
        service: "hostex-mcp",
        deploymentMode,
        uptimeSeconds: Math.floor(process.uptime()),
      });
    },

    async readyz() {
      try {
        await options.gateway.listProperties({ offset: 0, limit: 1 });

        return toJson(200, {
          status: "ready",
          dependency: {
            hostex: {
              status: "up",
            },
          },
        });
      } catch (error) {
        return toJson(503, {
          status: "degraded",
          dependency: {
            hostex: {
              status: "down",
              reason: formatErrorReason(error),
            },
          },
        });
      }
    },

    async metrics() {
      if (deploymentMode !== "http") {
        return toJson(404, {
          status: "unavailable",
          route: "/metrics",
          deploymentMode,
          reason: "Metrics endpoint is only exposed in http deployment mode",
        });
      }

      return {
        status: 200,
        headers: {
          "content-type": registry.contentType,
          "cache-control": "no-store",
        },
        body: await registry.metrics(),
      };
    },

    async handle(path: string) {
      if (path === "/healthz") {
        return this.healthz();
      }

      if (path === "/readyz") {
        return this.readyz();
      }

      if (path === "/metrics") {
        return this.metrics();
      }

      return null;
    },
  };
}
