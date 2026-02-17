#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createHostexClientFactory } from "./client/hostex-client-factory.js";
import { createHostexGateway } from "./client/hostex-gateway.js";
import { validateAppConfig } from "./config/app-config.js";
import { configSchema, type AppConfig } from "./config/config-schema.js";
import { handleToolError } from "./handlers/tool-error-handler.js";
import { logger } from "./lib/logger.js";
import { sanitizedToolErrorSchema } from "./types/tool-contracts.js";
import { registerAllTools } from "./tools/register-all.js";
import { validate } from "./utils/validation-utils.js";

export { configSchema };

let hasUnhandledRejectionListener = false;

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

  const hostexClientFactory = createHostexClientFactory({
    accessToken: validatedConfig.accessToken,
  });
  const gateway = createHostexGateway({
    clientFactory: hostexClientFactory,
  });

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
