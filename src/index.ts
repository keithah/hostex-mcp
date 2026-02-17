#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HostexClient } from "hostex-ts";

import { validateAppConfig } from "./config/app-config.js";
import { configSchema, type AppConfig } from "./config/config-schema.js";
import { logger } from "./lib/logger.js";
import { registerAllTools } from "./tools/register-all.js";

export { configSchema };

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

  const hostexClient = new HostexClient({
    accessToken: validatedConfig.accessToken,
  });

  registerAllTools(server, { hostexClient });

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason: String(reason) }, "Unhandled promise rejection");
  });

  return server.server;
}
