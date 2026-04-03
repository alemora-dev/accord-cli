import { z } from "zod";

export const providerConfigSchema = z.object({
  command: z.string(),
  enabled: z.boolean().default(false)
});

export const accordConfigSchema = z.object({
  storageDir: z.string().default(".accord/sessions"),
  providers: z.record(providerConfigSchema).default({})
});

export type AccordConfig = z.infer<typeof accordConfigSchema>;
