/** Dispatch original reviewers to defend their findings against challenger rulings. */
import type { ReviewConfig, Round, PiRolesDispatch } from "./types.js";

export async function runDefense(
  config: ReviewConfig,
  rounds: Round[],
  piRoles: PiRolesDispatch
): Promise<Round[]> {
  if (!config.defense) return [];

  const challengerRound = rounds.find(r => r.actorType === "challenger");
  if (!challengerRound) return [];

  const initialRounds = rounds.filter(r => r.actorType === "reviewer");
  const defenseRounds: Round[] = [];

  for (const initial of initialRounds) {
    const myFindings = initial.findings ?? [];
    const myRulings = challengerRound.rulings?.filter(r =>
      myFindings.some(f => f.id === r.findingId) &&
      (r.verdict === "OVERRULE" || r.verdict === "DOWNGRADE")
    ) ?? [];

    if (myRulings.length === 0) continue;

    const prompt = buildDefensePrompt(initial.actor, myRulings, myFindings);
    const result = await piRoles({
      action: "dispatch",
      roleId: initial.actor,
      mode: "blocking",
      task: prompt,
      files: [`.web-studio/review-defense-${initial.actor}.json`],
    });

    defenseRounds.push({
      roundNumber: 2,
      actor: initial.actor,
      actorType: "defender",
      defenses: parseDefenseJson(result.output),
    });
  }

  return defenseRounds;
}

function buildDefensePrompt(
  actor: string,
  rulings: NonNullable<Round["rulings"]>,
  findings: NonNullable<Round["findings"]>
): string {
  return `You are defending YOUR original findings. Read your initial findings + the challenger's rulings.

Your findings:
${JSON.stringify(findings, null, 2)}

Challenger's rulings on your findings:
${JSON.stringify(rulings, null, 2)}

For each finding the challenger OVERRULED or DOWNGRADED:
- AGREE (accept the challenge) OR
- CHALLENGE (defend your finding with additional evidence)

Return:
[
  { "findingId": "...", "verdict": "AGREE|CHALLENGE", "reason": "..." }
]`;
}

function parseDefenseJson(output: string): Round["defenses"] {
  try {
    const clean = output.replace(/```[a-z]*\n?/gi, "").trim();
    const match = clean.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  } catch {
    return [];
  }
}
