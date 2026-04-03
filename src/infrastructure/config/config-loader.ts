import { accordConfigSchema, type AccordConfig } from "./config-schema.js";

export function parseAccordConfig(input: unknown): AccordConfig {
  return accordConfigSchema.parse(input);
}
