import { describe, it, expect, vi } from "vitest";
import { autoFix } from "../src/fix.js";
import type { TriageFinding } from "../src/types.js";

describe("autoFix", () => {
  it("should dispatch fix agent only for critical findings up to maxFindings", async () => {
    const findings: TriageFinding[] = [
      { id: "C-01", reviewer: "r1", severity: "critical", category: "a", description: "d1", evidence: "e1", finalSeverity: "critical", rounds: [] },
      { id: "C-02", reviewer: "r1", severity: "critical", category: "a", description: "d2", evidence: "e2", finalSeverity: "critical", rounds: [] },
      { id: "C-03", reviewer: "r1", severity: "critical", category: "a", description: "d3", evidence: "e3", finalSeverity: "critical", rounds: [] },
      { id: "H-01", reviewer: "r1", severity: "high", category: "a", description: "d4", evidence: "e4", finalSeverity: "high", rounds: [] },
    ];

    const mockPiRoles = vi.fn().mockResolvedValue({
      roleId: "codebase-explorer",
      output: JSON.stringify({ fixed: 2, blocked: 0 }),
    });

    const result = await autoFix(
      { enabled: true, roleId: "codebase-explorer", maxFindings: 2, context: "fork" },
      findings,
      mockPiRoles
    );

    expect(mockPiRoles).toHaveBeenCalledTimes(1);
    expect(result.fixed).toBe(2);
    expect(result.blocked).toBe(0);
  });

  it("should return zero when no critical findings", async () => {
    const findings: TriageFinding[] = [
      { id: "H-01", reviewer: "r1", severity: "high", category: "a", description: "d", evidence: "e", finalSeverity: "high", rounds: [] },
    ];

    const mockPiRoles = vi.fn();
    const result = await autoFix(
      { enabled: true, roleId: "codebase-explorer", maxFindings: 10, context: "fork" },
      findings,
      mockPiRoles
    );

    expect(mockPiRoles).not.toHaveBeenCalled();
    expect(result.fixed).toBe(0);
    expect(result.blocked).toBe(0);
  });

  it("should skip auto-fix when autoFix.enabled is false", async () => {
    const findings: TriageFinding[] = [
      { id: "C-01", reviewer: "r1", severity: "critical", category: "a", description: "d", evidence: "e", finalSeverity: "critical", rounds: [] },
    ];

    const mockPiRoles = vi.fn();
    const result = await autoFix(
      { enabled: false, roleId: "codebase-explorer", maxFindings: 10, context: "fork" },
      findings,
      mockPiRoles
    );

    expect(mockPiRoles).not.toHaveBeenCalled();
    expect(result.fixed).toBe(0);
  });
});
