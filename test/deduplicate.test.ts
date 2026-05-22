import { describe, it, expect } from "vitest";
import { deduplicateFindings } from "../src/deduplicate.js";

describe("deduplicateFindings", () => {
  it("should return findings unchanged when no duplicates", () => {
    const findings = [
      { id: "A", reviewer: "r1", severity: "high", category: "frontend", file: "a.tsx", line: "1", description: "d", evidence: "e" },
      { id: "B", reviewer: "r2", severity: "medium", category: "seo", file: "b.tsx", line: "2", description: "d", evidence: "e" },
    ];

    const result = deduplicateFindings(findings);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("A");
    expect(result[1].id).toBe("B");
  });

  it("should merge findings from different reviewers with same file+line+category", () => {
    const findings = [
      { id: "A", reviewer: "r1", severity: "high", category: "frontend", file: "f.tsx", line: "10", description: "d", evidence: "e1" },
      { id: "B", reviewer: "r2", severity: "critical", category: "frontend", file: "f.tsx", line: "10", description: "d", evidence: "e2" },
    ];

    const result = deduplicateFindings(findings);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("critical"); // highest wins
    expect(result[0].reviewer).toBe("r1, r2");
    expect(result[0].evidence).toContain("e1");
    expect(result[0].evidence).toContain("e2");
  });

  it("should keep lower severity when both are same", () => {
    const findings = [
      { id: "A", reviewer: "r1", severity: "medium", category: "a", file: "f.tsx", line: "10", description: "d", evidence: "e1" },
      { id: "B", reviewer: "r2", severity: "medium", category: "a", file: "f.tsx", line: "10", description: "d", evidence: "e2" },
    ];

    const result = deduplicateFindings(findings);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("medium");
  });

  it("should merge evidence from both reviewers", () => {
    const findings = [
      { id: "A", reviewer: "r1", severity: "high", category: "a", file: "f.tsx", line: "10", description: "d", evidence: "Evidence from r1" },
      { id: "B", reviewer: "r2", severity: "high", category: "a", file: "f.tsx", line: "10", description: "d", evidence: "Evidence from r2" },
    ];

    const result = deduplicateFindings(findings);
    expect(result[0].evidence).toContain("[r1] Evidence from r1");
    expect(result[0].evidence).toContain("[r2] Evidence from r2");
  });

  it("should use the first reviewer's description as base", () => {
    const findings = [
      { id: "A", reviewer: "r1", severity: "high", category: "a", file: "f.tsx", line: "10", description: "desc1", evidence: "e1" },
      { id: "B", reviewer: "r2", severity: "high", category: "a", file: "f.tsx", line: "10", description: "desc2", evidence: "e2" },
    ];

    const result = deduplicateFindings(findings);
    expect(result[0].description).toBe("desc1");
  });

  it("should use the suggestedFix from the finding that has one", () => {
    const findings = [
      { id: "A", reviewer: "r1", severity: "high", category: "a", file: "f.tsx", line: "10", description: "d", evidence: "e1" },
      { id: "B", reviewer: "r2", severity: "high", category: "a", file: "f.tsx", line: "10", description: "d", evidence: "e2", suggestedFix: "fix it" },
    ];

    const result = deduplicateFindings(findings);
    expect(result[0].suggestedFix).toBe("fix it");
  });
});
