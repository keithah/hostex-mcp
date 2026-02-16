import { z } from "zod";

import {
  toolSchemaMap,
  type HostexToolName,
} from "../validation/hostex-data-schemas.js";
import {
  hostexEnvelopeSchema,
  type HostexEnvelope,
} from "../validation/hostex-envelope.js";

type ToolData<TTool extends HostexToolName> = z.infer<(typeof toolSchemaMap)[TTool]>;

export type ValidationIssueSummary = {
  path: string;
  code: string;
  message: string;
};

export type HostexResponseValidationError = {
  type: "validation_error";
  tool: HostexToolName;
  category: "envelope" | "data";
  message: string;
  request_id?: string;
  issues: ValidationIssueSummary[];
};

export type ValidateHostexResponseResult<TData> =
  | {
      ok: true;
      tool: HostexToolName;
      envelope: HostexEnvelope;
      data: TData;
    }
  | {
      ok: false;
      error: HostexResponseValidationError;
    };

function summarizeIssues(issues: z.core.$ZodIssue[]): ValidationIssueSummary[] {
  return issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    code: issue.code,
    message: issue.message,
  }));
}

export function validateHostexResponse<TTool extends HostexToolName>(
  tool: TTool,
  input: unknown,
): ValidateHostexResponseResult<ToolData<TTool>> {
  const envelopeResult = hostexEnvelopeSchema.safeParse(input);
  if (!envelopeResult.success) {
    return {
      ok: false,
      error: {
        type: "validation_error",
        tool,
        category: "envelope",
        message: "Hostex response envelope did not match expected schema.",
        issues: summarizeIssues(envelopeResult.error.issues),
      },
    };
  }

  const envelope = envelopeResult.data;
  const dataSchema = toolSchemaMap[tool];
  const dataResult = dataSchema.safeParse(envelope.data);

  if (!dataResult.success) {
    return {
      ok: false,
      error: {
        type: "validation_error",
        tool,
        category: "data",
        message: "Hostex response data did not match expected schema.",
        request_id: envelope.request_id,
        issues: summarizeIssues(dataResult.error.issues),
      },
    };
  }

  return {
    ok: true,
    tool,
    envelope,
    data: dataResult.data as ToolData<TTool>,
  };
}
