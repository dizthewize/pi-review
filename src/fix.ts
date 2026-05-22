/** Auto-fix critical findings via pi-agent-roles. */
import type { AutoFixConfig, TriageFinding, PiRolesDispatch } from "./types.js";

export interface FixResult {
  fixed: number;
  blocked: number;
}

export async function autoFix(
  config: AutoFixConfig,
  findings: TriageFinding[],
  piRoles: PiRolesDispatch
): Promise<FixResult> {
  if (!config.enabled) return { fixed: 0, blocked: 0 };

  const criticals = findings
    .filter(f => f.finalSeverity === "critical")
    .slice(0, config.maxFindings);

  if (criticals.length === 0) return { fixed: 0, blocked: 0 };

  const result = await piRoles({
    action: "dispatch",
    roleId: config.roleId,
    mode: "blocking",
    task: `Fix these critical findings:\n${JSON.stringify(criticals, null, 2)}\n\nApply fixes via Edit tool. Commit each with message "fix: [description]". Flag unfixable as blocked.\nReturn JSON: { "fixed": N, "blocked": N }`,
    files: [".web-studio/review-fixed.json"],
    context: config.context,
  });

  return parseFixJson(result.output);
}

function parseFixJson(output: string): FixResult {
  try {
    const clean = output.replace(/```[a-z]*\n?/gi, "").trim();
    const match = clean.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { fixed: Number(parsed.fixed ?? 0), blocked: Number(parsed.blocked ?? 0) };
    }
  } catch { /* ignore */ }
  return { fixed: 0, blocked: 0 };
}
