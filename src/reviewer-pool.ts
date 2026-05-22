/** Dispatch all reviewers in parallel via pi-agent-roles. */
import type { ReviewConfig, Round, PiRolesDispatch } from "./types.js";

export async function runInitialReview(
  config: ReviewConfig,
  piRoles: PiRolesDispatch
): Promise<Round[]> {
  const rounds: Round[] = [];

  const tasks = config.reviewers.map(async (r) => {
    const prompt = r.prompt ?? buildReviewerPrompt(r, config);
    const result = await piRoles({
      action: "dispatch",
      roleId: r.roleId,
      mode: "blocking",
      task: prompt,
      files: [`.web-studio/review-${r.roleId}.json`],
    });
    return { roleId: result.roleId, output: result.output };
  });

  const results = await Promise.all(tasks);

  for (const result of results) {
    const findings = parseReviewerJson(result.output);
    rounds.push({
      roundNumber: 0,
      actor: result.roleId,
      actorType: "reviewer",
      findings,
    });
  }

  return rounds;
}

function buildReviewerPrompt(reviewer: {
  roleId: string;
  skill?: string;
}, config: ReviewConfig): string {
  const skillRef = reviewer.skill ? `\n
Use your built-in /${reviewer.skill} skill to audit.\n` : "";
  return `You are reviewing ${config.subject.type}: ${config.subject.path}\n${config.contextDocs?.length ? `Context docs: ${config.contextDocs.join(", ")}` : ""}${skillRef}
Write findings as structured JSON:\n[\n  { "id": "${reviewer.roleId.slice(0, 2).toUpperCase()}-01", "severity": "critical|high|medium|low", "category": "...", "file": "...", "line": "...", "description": "...", "evidence": "...", "suggestedFix": "..." }\n]`;
}

function parseReviewerJson(output: string): Round["findings"] {
  try {
    // Extract JSON array from output (handles markdown fences)
    const clean = output.replace(/```[a-z]*\n?/gi, "").trim();
    const match = clean.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  } catch {
    return [];
  }
}
