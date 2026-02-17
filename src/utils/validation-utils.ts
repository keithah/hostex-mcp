import { z } from "zod";

export function validate<TSchema extends z.ZodTypeAny>(schema: TSchema, value: unknown): z.infer<TSchema> {
  return schema.parse(value);
}

export function toStructuredContent(value: unknown): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return { result: value };
}
