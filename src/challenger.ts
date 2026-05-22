/** Single Devil's Advocate dispatch. */
import type { ReviewConfig, Round, PiRolesDispatch } from "./types.js";

export async function runChallenger(
  config: ReviewConfig,
  rounds: Round[],
  piRoles: PiRolesDispatch
): Promise<Round> {
  const allFindings = rounds.filter(r => r.actorType === "reviewer").flatMap(r => r.findings ?? []);

  const prompt = buildChallengerPrompt(config.challenger, allFindings, config.subject);

  const result = await piRoles({
    action: "dispatch",
    roleId: config.challenger.roleId,
    mode: "blocking",
    task: prompt,
    files: [`.web-studio/review-challenger.json`],
  });

  return {
    roundNumber: 1,
    actor: config.challenger.roleId,
    actorType: "challenger",
    rulings: parseChallengerJson(result.output),
  };
}

function buildChallengerPrompt(challenger: { roleId: string; skill?: string }, findings: import("./types.js").Finding[], subject: ReviewConfig["subject"]): string {
  return `You are the Devil's Advocate. Read ALL initial review findings:
${JSON.stringify(findings, null, 2)}

For EACH finding, challenge it:
1. Is this ACTUALLY a problem in context?
2. Does evidence support the claim?
3. Is severity justified?

Return structured JSON:
[
  { "findingId": "...", "verdict": "SUSTAIN|DOWNGRADE|OVERRULE", "newSeverity": "..." (if DOWNGRADE), "reason": "..." }
]`;
}

function parseChallengerJson(output: string): Round["rulings"] {
  try {
    const clean = output.replace(/```[a-z]*\n?/gi, "").trim();
    const match = clean.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  } catch {
    return [];
  }
}
