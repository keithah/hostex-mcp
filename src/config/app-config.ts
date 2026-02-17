import { z } from "zod";

import { logger } from "../lib/logger.js";
import { configSchema, type AppConfig } from "./config-schema.js";

export function validateAppConfig(config: unknown): AppConfig {
  try {
    const validatedConfig = configSchema.parse(config);
    logger.info({ config: { accessToken: "***" } }, "Configuration validated successfully");
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      logger.error({ validationErrors }, "Configuration validation failed");
      throw new Error(`Configuration validation failed: ${validationErrors.join(", ")}`);
    }

    throw error;
  }
}
