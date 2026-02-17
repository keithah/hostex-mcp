import { z } from "zod";

export const toolTextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const toolStructuredContentSchema = z.record(z.string(), z.unknown());

export const validationIssueSummarySchema = z.object({
  path: z.string(),
  code: z.string(),
  message: z.string(),
});

export const sanitizedToolErrorSchema = z.object({
  type: z.enum(["validation_error", "runtime_error"]),
  tool: z.string(),
  category: z.enum(["validation", "runtime"]),
  message: z.string(),
  request_id: z.string().optional(),
  issues: z.array(validationIssueSummarySchema),
});

export type ToolStructuredContent = z.infer<typeof toolStructuredContentSchema>;
export type SanitizedToolError = z.infer<typeof sanitizedToolErrorSchema>;
