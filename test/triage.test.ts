import { describe, it, expect } from "vitest";
import { triage } from "../src/triage.js";
import { mockRounds, mockFindings } from "./support/fixtures.js";

describe("triage", () => {
  it("should keep SUSTAIN findings at original severity", () => {
    const result = triage(mockRounds, {});
    const fe01 = result.find(f => f.id === "FE-01");
    expect(fe01?.finalSeverity).toBe("critical");
    expect(fe01?.rounds).toHaveLength(2);
  });

  it("should DOWNGRADE according to ruling", () => {
    const result = triage(mockRounds, {});
    const seo01 = result.find(f => f.id === "SEO-01");
    expect(seo01?.finalSeverity).toBe("medium");
  });

  it("should OVERRULE to dismissed", () => {
    const noDefenseRounds = mockRounds.filter(r => r.actorType !== "defender");
    const result = triage(noDefenseRounds, {});
    const fe02 = result.find(f => f.id === "FE-02");
    expect(fe02?.finalSeverity).toBe("dismissed");
  });

  it("should CHALLENGE an OVERRULE → flagged", () => {
    const result = triage(mockRounds, {});
    const fe02 = result.find(f => f.id === "FE-02");
    expect(fe02?.finalSeverity).toBe("flagged");
    expect(fe02?.rounds).toHaveLength(3);
  });

  it("should downgrade single-reviewer findings when rule enabled", () => {
    const result = triage(mockRounds, { downgradeOnSingleReviewer: true });
    const fe01 = result.find(f => f.id === "FE-01");
    expect(fe01?.finalSeverity).toBe("high"); // critical → high
    const seo01 = result.find(f => f.id === "SEO-01");
    expect(seo01?.finalSeverity).toBe("low"); // medium → low
  });

  it("should not downgrade flagged or dismissed findings", () => {
    const result = triage(mockRounds, { downgradeOnSingleReviewer: true });
    const fe02 = result.find(f => f.id === "FE-02");
    expect(fe02?.finalSeverity).toBe("high"); // flagged → high (not low)
  });

  it("should handle missing challenger (no rounds[1])", () => {
    const noChallengeRounds = mockRounds.filter(r => r.actorType === "reviewer");
    const result = triage(noChallengeRounds, {});
    expect(result).toHaveLength(3);
    expect(result.every(f => f.finalSeverity === f.severity)).toBe(true);
  });

  it("should handle empty defense (defender AGREES with all)", () => {
    const agreeRounds = mockRounds.map(r => {
      if (r.actorType === "defender") return { ...r, defenses: [] };
      return r;
    });
    const result = triage(agreeRounds, {});
    const fe02 = result.find(f => f.id === "FE-02");
    expect(fe02?.finalSeverity).toBe("dismissed"); // no CHALLENGE, stays dismissed
  });

  it("should produce round history per finding", () => {
    const result = triage(mockRounds, {});
    const fe02 = result.find(f => f.id === "FE-02");
    expect(fe02?.rounds[0]).toEqual({ round: 0, actor: "accessibility-auditor", action: "found", reason: expect.any(String) });
    expect(fe02?.rounds[1]).toEqual({ round: 1, actor: "challenger", action: "OVERRULE", reason: expect.any(String) });
    expect(fe02?.rounds[2]).toEqual({ round: 2, actor: "accessibility-auditor", action: "CHALLENGE", reason: expect.any(String) });
  });
});
