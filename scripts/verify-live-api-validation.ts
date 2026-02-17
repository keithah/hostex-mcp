import { HostexClient } from "hostex-ts";

import { toSanitizedToolError } from "../src/lib/error-sanitize.js";
import { validateHostexResponse } from "../src/lib/response-validation.js";

const TOOL_NAME = "hostex_list_properties" as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function hasForbiddenLeak(serialized: string): boolean {
  const forbiddenPatterns = [
    /authorization/i,
    /bearer\s+[A-Za-z0-9._-]+/i,
    /hostex-access-token/i,
    /cookie\s*[:=]/i,
    /stack/i,
    /raw_payload/i,
  ];

  return forbiddenPatterns.some((pattern) => pattern.test(serialized));
}

async function main(): Promise<void> {
  const accessToken = process.env.HOSTEX_ACCESS_TOKEN;
  assert(
    accessToken,
    "Missing HOSTEX_ACCESS_TOKEN. Set HOSTEX_ACCESS_TOKEN from Hostex Dashboard before running this script.",
  );

  const hostexClient = new HostexClient({ accessToken });
  const liveResponse = await hostexClient.listProperties({ offset: 0, limit: 1 });

  const liveValidation = validateHostexResponse(TOOL_NAME, liveResponse);
  if (!liveValidation.ok) {
    throw new Error(`Live response validation failed: ${JSON.stringify(liveValidation.error)}`);
  }

  const tamperedResponse = {
    ...liveResponse,
    data: {
      properties: "invalid-shape",
      total: 1,
      Authorization: "Bearer super-secret-token",
      raw_payload: {
        cookie: "session=abcdef",
      },
    },
  };

  const mismatchValidation = validateHostexResponse(TOOL_NAME, tamperedResponse);
  assert(!mismatchValidation.ok, "Expected tampered response validation to fail closed.");

  const sanitizedMismatch = toSanitizedToolError(TOOL_NAME, mismatchValidation.error);
  const serializedMismatch = JSON.stringify(sanitizedMismatch);

  assert(!hasForbiddenLeak(serializedMismatch), "Sanitized mismatch payload leaked sensitive data.");

  assert(sanitizedMismatch.tool === TOOL_NAME, "Sanitized mismatch payload missing stable tool identifier.");
  assert(sanitizedMismatch.category === "validation", "Mismatch should be categorized as validation error.");

  console.log("Live response validation passed.");
  console.log("Tampered response failed closed with sanitized structured output.");
}

void main();
