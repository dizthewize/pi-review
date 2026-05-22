import { describe, it, expect, vi } from "vitest";
import { runDefense } from "../src/defense.js";
import { mockRounds } from "./support/fixtures.js";

describe("runDefense", () => {
  it("should defend only challenged findings", async () => {
    const mockPiRoles = vi.fn().mockImplementation((params) => {
      if (params.roleId === "accessibility-auditor") {
        return Promise.resolve({
          roleId: "accessibility-auditor",
          output: JSON.stringify([{ findingId: "FE-02", verdict: "CHALLENGE", reason: "18px is not large text" }]),
        });
      }
      // seo-audit defending SEO-01
      return Promise.resolve({
        roleId: "seo-audit",
        output: JSON.stringify([{ findingId: "SEO-01", verdict: "AGREE", reason: "Fair downgrade" }]),
      });
    });

    // seo-audit had SEO-01, which was DOWNGRADED — should also defend
    const roundsWithSeo = mockRounds.map(r => {
      if (r.actor === "seo-audit" && r.actorType === "reviewer") {
        return { ...r };
      }
      return r;
    });

    const defenseRounds = await runDefense(
      { name: "test", reviewers: [], challenger: { roleId: "code-reviewer" }, defense: true, maxDefenseRounds: 1, subject: { type: "pr-diff", path: ".web-studio/pr-diff.patch" } },
      mockRounds,
      mockPiRoles
    );

    // Both accessibility-auditor and seo-audit have challenged findings
    expect(mockPiRoles).toHaveBeenCalledTimes(2);
    expect(defenseRounds).toHaveLength(2);
  });

  it("should skip defense when defense: false", async () => {
    const mockPiRoles = vi.fn();
    const result = await runDefense(
      { name: "test", reviewers: [], challenger: { roleId: "code-reviewer" }, defense: false, maxDefenseRounds: 1, subject: { type: "pr-diff", path: ".web-studio/pr-diff.patch" } },
      mockRounds,
      mockPiRoles
    );
    expect(mockPiRoles).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });

  it("should skip reviewers with no challenged findings", async () => {
    // Create rounds where only one reviewer was challenged
    const limitedRounds = [
      { roundNumber: 0, actor: "accessibility-auditor", actorType: "reviewer" as const, findings: [{ id: "FE-01", reviewer: "accessibility-auditor", severity: "critical", category: "frontend", file: "a.tsx", line: "1", description: "d", evidence: "e" }] },
      { roundNumber: 1, actor: "challenger", actorType: "challenger" as const, rulings: [{ findingId: "FE-01", verdict: "SUSTAIN", reason: "confirmed" }] },
    ];

    const mockPiRoles = vi.fn();
    const result = await runDefense(
      { name: "test", reviewers: [], challenger: { roleId: "code-reviewer" }, defense: true, maxDefenseRounds: 1, subject: { type: "pr-diff", path: ".web-studio/pr-diff.patch" } },
      limitedRounds,
      mockPiRoles
    );

    // FE-01 was SUSTAINED, nothing to defend
    expect(mockPiRoles).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});
