import { describe, expect, it } from "vitest";
import { detectProviders } from "../../../src/providers/core/provider-detection.js";

describe("detectProviders", () => {
  it("marks a provider as detected when its command exists", async () => {
    const results = await detectProviders(
      [
        {
          id: "codex",
          command: "codex"
        }
      ],
      async (command: string) => command === "codex"
    );

    expect(results[0]).toEqual({
      id: "codex",
      command: "codex",
      detected: true
    });
  });
});
