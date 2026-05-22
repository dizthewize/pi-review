import { describe, it, expect, vi } from "vitest";
import { runInitialReview } from "../src/reviewer-pool.js";
import { mockFindings } from "./support/fixtures.js";

describe("runInitialReview", () => {
  it("should dispatch all reviewers in parallel", async () => {
    const mockPiRoles = vi.fn().mockImplementation((params: any) => {
      if (params.roleId === "accessibility-auditor") {
        return Promise.resolve({ roleId: "accessibility-auditor", output: JSON.stringify(mockFindings) });
      }
      return Promise.resolve({ roleId: "seo-audit", output: "[]" });
    });

    const rounds = await runInitialReview({
      name: "test",
      reviewers: [
        { roleId: "accessibility-auditor", skill: "ui-ux-pro-max" },
        { roleId: "seo-audit", skill: "seo-audit" },
      ],
      challenger: { roleId: "code-reviewer" },
      defense: false,
      maxDefenseRounds: 1,
      subject: { type: "pr-diff", path: ".web-studio/pr-diff.patch" },
    }, mockPiRoles);

    expect(mockPiRoles).toHaveBeenCalledTimes(2);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].actor).toBe("accessibility-auditor");
    expect(rounds[1].actor).toBe("seo-audit");
    expect(rounds[0].actorType).toBe("reviewer");
  });

  it("should handle empty reviewer output (no findings)", async () => {
    const mockPiRoles = vi.fn().mockResolvedValue({
      roleId: "seo-audit",
      output: "[]",
    });

    const rounds = await runInitialReview({
      name: "test",
      reviewers: [{ roleId: "seo-audit" }],
      challenger: { roleId: "code-reviewer" },
      defense: false,
      maxDefenseRounds: 1,
      subject: { type: "pr-diff", path: ".web-studio/pr-diff.patch" },
    }, mockPiRoles);

    expect(rounds).toHaveLength(1);
    expect(rounds[0].findings).toHaveLength(0);
  });

  it("should handle malformed JSON gracefully", async () => {
    const mockPiRoles = vi.fn().mockResolvedValue({
      roleId: "accessibility-auditor",
      output: "not json at all",
    });

    const rounds = await runInitialReview({
      name: "test",
      reviewers: [{ roleId: "accessibility-auditor" }],
      challenger: { roleId: "code-reviewer" },
      defense: false,
      maxDefenseRounds: 1,
      subject: { type: "pr-diff", path: ".web-studio/pr-diff.patch" },
    }, mockPiRoles);

    expect(rounds[0].findings).toHaveLength(0);
  });
});
