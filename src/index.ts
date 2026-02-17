#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createHostexClientFactory } from "./client/hostex-client-factory.js";
import { createHostexGateway } from "./client/hostex-gateway.js";
import { validateAppConfig } from "./config/app-config.js";
import { configSchema, type AppConfig } from "./config/config-schema.js";
import { handleToolError } from "./handlers/tool-error-handler.js";
import {
  createHealthRoutes,
  type DeploymentMode,
  type HealthRoutes,
} from "./http/health-routes.js";
import { logger } from "./lib/logger.js";
import { sanitizedToolErrorSchema } from "./types/tool-contracts.js";
import { registerAllTools } from "./tools/register-all.js";
import { validate } from "./utils/validation-utils.js";
import type { HostexApiClient } from "./types/hostex-client.js";

export { configSchema };

let hasUnhandledRejectionListener = false;

function createGateway(config: AppConfig): HostexApiClient {
  const hostexClientFactory = createHostexClientFactory({
    accessToken: config.accessToken,
  });

  return createHostexGateway({
    clientFactory: hostexClientFactory,
  });
}

export function registerHealthRoutes({
  config,
  gateway,
  deploymentMode,
}: {
  config: AppConfig;
  gateway?: HostexApiClient;
  deploymentMode?: DeploymentMode;
}): HealthRoutes {
  const validatedConfig = validateAppConfig(config);

  return createHealthRoutes({
    gateway: gateway ?? createGateway(validatedConfig),
    deploymentMode: deploymentMode ?? "http",
  });
}

export default function createServer({
  config,
}: {
  config: AppConfig;
}) {
  const validatedConfig = validateAppConfig(config);

  const server = new McpServer({
    name: "hostex-mcp",
    title: "Hostex Property Management",
    version: "0.2.0",
  });
  logger.info("Hostex MCP server initialized");

  const gateway = createGateway(validatedConfig);

  registerAllTools(server, {
    gateway,
    handleToolError,
    toolErrorSchema: sanitizedToolErrorSchema,
    validateSchema: validate,
  });

  if (!hasUnhandledRejectionListener) {
    process.on("unhandledRejection", (reason) => {
      logger.error({ reason: String(reason) }, "Unhandled promise rejection");
    });
    hasUnhandledRejectionListener = true;
  }

  return server.server;
}
