import { z } from "zod";

export const configSchema = z.object({
  accessToken: z
    .string()
    .min(1, { error: "Hostex API access token is required" })
    .describe("Your Hostex API access token"),
});

export type AppConfig = z.infer<typeof configSchema>;
