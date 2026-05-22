import { describe, it, expect, vi } from "vitest";
import { runChallenger } from "../src/challenger.js";
import { mockRounds } from "./support/fixtures.js";

describe("runChallenger", () => {
  it("should dispatch challenger with all findings", async () => {
    const mockPiRoles = vi.fn().mockResolvedValue({
      roleId: "code-reviewer",
      output: JSON.stringify([
        { findingId: "FE-01", verdict: "SUSTAIN", reason: "Correct" },
        { findingId: "SEO-01", verdict: "OVERRULE", reason: "Not significant" },
      ]),
    });

    const round = await runChallenger(
      {
        name: "test",
        reviewers: [],
        challenger: { roleId: "code-reviewer" },
        defense: false,
        maxDefenseRounds: 1,
        subject: { type: "pr-diff", path: ".web-studio/pr-diff.patch" },
      },
      mockRounds,
      mockPiRoles
    );

    expect(mockPiRoles).toHaveBeenCalledTimes(1);
    expect(round.actor).toBe("code-reviewer");
    expect(round.rulings).toHaveLength(2);
    expect(round.rulings![0].verdict).toBe("SUSTAIN");
  });

  it("should handle empty findings (nothing to challenge)", async () => {
    const mockPiRoles = vi.fn().mockResolvedValue({
      roleId: "code-reviewer",
      output: "[]",
    });

    const round = await runChallenger(
      {
        name: "test",
        reviewers: [],
        challenger: { roleId: "code-reviewer" },
        defense: false,
        maxDefenseRounds: 1,
        subject: { type: "pr-diff", path: ".web-studio/pr-diff.patch" },
      },
      [], // no reviewer rounds
      mockPiRoles
    );

    expect(mockPiRoles).toHaveBeenCalledTimes(1);
    expect(round.rulings).toHaveLength(0);
  });
});
