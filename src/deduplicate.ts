/** Deduplicate findings across reviewers using file + line + category as key. */
import type { Finding } from "./types.js";

export function deduplicateFindings(findings: Finding[]): Finding[] {
  const groups = new Map<string, Finding[]>();

  for (const f of findings) {
    const key = `${f.file ?? "NO_FILE"}:${f.line ?? "NO_LINE"}:${f.category}`;
    const existing = groups.get(key) ?? [];
    existing.push(f);
    groups.set(key, existing);
  }

  const merged: Finding[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }

    const severities = ["low", "medium", "high", "critical"];
    const maxSeverity = group.reduce((max, f) =>
      severities.indexOf(f.severity) > severities.indexOf(max) ? f.severity : max,
      "low" as Finding["severity"]
    );

    merged.push({
      ...group[0],
      severity: maxSeverity,
      reviewer: group.map(g => g.reviewer).join(", "),
      evidence: group.map(g => `[${g.reviewer}] ${g.evidence}`).join("\n\n"),
      suggestedFix: group.find(g => g.suggestedFix)?.suggestedFix ?? group[0].suggestedFix,
    });
  }

  return merged;
}
