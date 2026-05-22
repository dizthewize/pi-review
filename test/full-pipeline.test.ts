import { describe, it, expect, vi } from "vitest";
import piReviewExtension from "../src/extension/index.js";
import { mockFindings, mockRounds } from "./support/fixtures.js";

describe("pi-review full pipeline", () => {
  const mockPi = {
    registerTool: vi.fn().mockReturnValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register pi_review tool", () => {
    piReviewExtension(mockPi as any);
    expect(mockPi.registerTool).toHaveBeenCalledTimes(1);
    const toolConfig = mockPi.registerTool.mock.calls[0][0];
    expect(toolConfig.name).toBe("pi_review");
    expect(toolConfig.label).toBe("Pi Review");
  });

  it("should run triage action end-to-end", async () => {
    // Use the extension's internal execute handler via reflection
    piReviewExtension(mockPi as any);
    const handler = mockPi.registerTool.mock.calls[0][0].execute;

    const result = await handler(0, {
      action: "triage",
      name: "triage-test",
      rounds: mockRounds,
    }, null, null, null);

    expect(result.content[0].type).toBe("text");
    expect(result.details.status).toBe("ok");
    const data = JSON.parse(result.content[0].text);
    expect(data.findings).toHaveLength(3);
    expect(data.totalRounds).toBe(4);
  });

  it("should return error for triage without rounds", async () => {
    piReviewExtension(mockPi as any);
    const handler = mockPi.registerTool.mock.calls[0][0].execute;

    const result = await handler(0, { action: "triage", name: "error-test" }, null, null, null);
    expect(result.details.status).toBe("error");
    expect(result.content[0].text).toContain("rounds required");
  });
});
