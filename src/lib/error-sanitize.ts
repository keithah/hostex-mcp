import type {
  HostexResponseValidationError,
  ValidationIssueSummary,
} from "./response-validation.js";

export type SanitizedToolError = {
  type: "validation_error" | "runtime_error";
  tool: string;
  category: "validation" | "runtime";
  message: string;
  request_id?: string;
  issues: ValidationIssueSummary[];
};

function sanitizeMessage(input: unknown): string {
  const base = input instanceof Error ? input.message : String(input);
  return base
    .replace(/bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/authorization\s*[:=]\s*[^\n,;]+/gi, "authorization=[REDACTED]")
    .replace(/\bauthorization\b/gi, "[REDACTED]")
    .replace(/hostex-access-token\s*[:=]\s*[^\s,;]+/gi, "hostex-access-token=[REDACTED]")
    .replace(/\bhostex-access-token\b/gi, "[REDACTED]")
    .replace(/cookie\s*[:=]\s*[^\n]+/gi, "cookie=[REDACTED]")
    .replace(/\bcookie\b/gi, "[REDACTED]")
    .replace(/\braw_payload\b/gi, "[REDACTED]")
    .replace(/\b(token|access_token|api_key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/[?&](token|access_token|api_key)=[^&\s]+/gi, "?$1=[REDACTED]")
    .split("\n")[0]
    .slice(0, 240);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidationError(
  value: unknown,
): value is HostexResponseValidationError {
  if (!isObjectRecord(value)) {
    return false;
  }

  return value.type === "validation_error";
}

function summarizeIssues(issues: ValidationIssueSummary[]): ValidationIssueSummary[] {
  return issues.slice(0, 5).map((issue) => ({
    path: issue.path
      .replace(/authorization/gi, "[REDACTED]")
      .replace(/hostex-access-token/gi, "[REDACTED]")
      .replace(/cookie/gi, "[REDACTED]")
      .replace(/raw_payload/gi, "[REDACTED]"),
    code: issue.code,
    message: sanitizeMessage(issue.message),
  }));
}

export function toSanitizedToolError(tool: string, error: unknown): SanitizedToolError {
  if (isValidationError(error)) {
    return {
      type: "validation_error",
      tool,
      category: "validation",
      message: sanitizeMessage(error.message),
      request_id: error.request_id,
      issues: summarizeIssues(error.issues),
    };
  }

  return {
    type: "runtime_error",
    tool,
    category: "runtime",
    message: sanitizeMessage(error),
    issues: [],
  };
}
