import { describe, expect, it } from "vitest";

import vitestConfig from "../../../vitest.config.ts";

describe("coverage regression policy", () => {
  it("keeps minimum coverage thresholds at 80 percent", () => {
    const coverageConfig = vitestConfig.test?.coverage as
      | {
          thresholds?: {
            lines?: number;
            functions?: number;
            branches?: number;
            statements?: number;
          };
        }
      | undefined;
    const thresholds = coverageConfig?.thresholds;

    expect(thresholds).toBeDefined();
    expect(thresholds?.lines).toBe(80);
    expect(thresholds?.functions).toBe(80);
    expect(thresholds?.branches).toBe(80);
    expect(thresholds?.statements).toBe(80);
  });
});
