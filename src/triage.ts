/** Merge adversarial review rounds into triaged findings. */
import type { Finding, Round, TriageFinding, TriageRules } from "./types.js";

export function triage(rounds: Round[], rules: TriageRules = {}): TriageFinding[] {
  // Deduplicate initial findings across reviewers
  const initialFindings = rounds
    .filter(r => r.actorType === "reviewer")
    .flatMap(r => r.findings ?? []);

  const challengerRulings = rounds
    .filter(r => r.actorType === "challenger")
    .flatMap(r => r.rulings ?? []);

  const defenses = rounds
    .filter(r => r.actorType === "defender")
    .flatMap(r => r.defenses ?? []);

  const triaged: TriageFinding[] = [];

  for (const finding of initialFindings) {
    const ruling = challengerRulings.find(r => r.findingId === finding.id);
    const defense = defenses.find(d => d.findingId === finding.id);

    let finalSeverity: TriageFinding["finalSeverity"];
    const history: { round: number; actor: string; action: string; reason: string }[] = [];

    history.push({ round: 0, actor: finding.reviewer, action: "found", reason: finding.description });

    if (!ruling) {
      finalSeverity = finding.severity;
    } else {
      history.push({ round: 1, actor: "challenger", action: ruling.verdict, reason: ruling.reason });

      if (ruling.verdict === "OVERRULE") {
        finalSeverity = "dismissed";
      } else if (ruling.verdict === "DOWNGRADE") {
        finalSeverity = ruling.newSeverity ?? finding.severity;
      } else {
        finalSeverity = finding.severity;
      }

      if (defense) {
        history.push({ round: 2, actor: finding.reviewer, action: defense.verdict, reason: defense.reason });
        if (defense.verdict === "CHALLENGE" && ruling.verdict === "OVERRULE") {
          finalSeverity = "flagged";
        }
      }
    }

    if (rules.downgradeOnSingleReviewer && finalSeverity !== "dismissed") {
      const countForFinding = initialFindings.filter(f => f.id === finding.id).length;
      if (countForFinding === 1) {
        finalSeverity = downgradeOneLevel(finalSeverity);
      }
    }

    triaged.push({ ...finding, finalSeverity, rounds: history });
  }

  return triaged;
}

function downgradeOneLevel(severity: TriageFinding["finalSeverity"]): TriageFinding["finalSeverity"] {
  const levels = ["dismissed", "low", "medium", "high", "critical"];
  if (severity === "flagged") return "high"; // flagged is above high, downgrade to high
  const idx = levels.indexOf(severity);
  if (idx <= 1) return "low"; // dismissed or low stays low
  return levels[idx - 1] as TriageFinding["finalSeverity"];
}
