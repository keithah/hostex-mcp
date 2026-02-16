import { z } from "zod";

export const hostexEnvelopeSchema = z.strictObject({
  request_id: z.string(),
  error_code: z.number(),
  error_msg: z.string(),
  data: z.unknown().optional(),
});

export type HostexEnvelope = z.infer<typeof hostexEnvelopeSchema>;

export function parseHostexEnvelope(input: unknown) {
  return hostexEnvelopeSchema.safeParse(input);
}
