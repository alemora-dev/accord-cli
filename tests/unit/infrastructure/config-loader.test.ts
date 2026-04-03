import { describe, expect, it } from "vitest";
import { parseAccordConfig } from "../../../src/infrastructure/config/config-loader.js";

describe("parseAccordConfig", () => {
  it("loads provider defaults and storage paths", () => {
    const config = parseAccordConfig({
      storageDir: ".accord/sessions",
      providers: {
        codex: { command: "codex", enabled: true }
      }
    });

    expect(config.storageDir).toBe(".accord/sessions");
    expect(config.providers.codex.command).toBe("codex");
  });
});
