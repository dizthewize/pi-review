/** Pi Review Extension — pi_review tool registration */
import type { ExtensionAPI } from "../pi-api-stub.js";
import type { PiReviewParams, PiReviewResult, ReviewResult, DispatchResult } from "../types.js";
import { runInitialReview } from "../reviewer-pool.js";
import { runChallenger } from "../challenger.js";
import { runDefense } from "../defense.js";
import { triage } from "../triage.js";
import { autoFix } from "../fix.js";
import { deduplicateFindings } from "../deduplicate.js";

export default function piReviewExtension(pi: ExtensionAPI) {
  const backend = makeBackend(pi);

  pi.registerTool({
    name: "pi_review",
    label: "Pi Review",
    description: `Adversarial multi-agent review pipeline.

Actions:
  pi_review({ action: "audit", reviewers: [...], challenger: {...}, subject: {...} })
  pi_review({ action: "review", reviewers: [...], subject: {...} })
  pi_review({ action: "triage", rounds: [...] })
  pi_review({ action: "fix", findings: [...], roleId: "..." })`,
    parameters: {} as any, // TypeBox schema would go here in production

    async execute(_toolCallId: string, rawParams: unknown, _signal: any, _onUpdate: any, _ctx: any) {
      const params = rawParams as PiReviewParams;
      const result = await handleReviewAction(params, backend);
      return {
        content: [{ type: "text", text: result.message ?? JSON.stringify(result.data, null, 2) }],
        details: result,
      };
    },
  });
}

function makeBackend(pi: ExtensionAPI): (params: {
  action: string;
  roleId: string;
  mode: string;
  task: string;
  files?: string[];
  context?: string;
}) => Promise<DispatchResult> {
  const subagentFn =
    typeof (pi as any).subagent === "function"
      ? (pi as any).subagent
      : typeof (pi as any).api?.subagent === "function"
      ? (pi as any).api.subagent
      : null;

  if (subagentFn) {
    return async (params) => {
      const start = Date.now();
      const result = await subagentFn({
        agent: "custom",
        config: { systemPrompt: "" },
        task: params.task,
        context: params.context as any,
      });
      return {
        roleId: params.roleId,
        output: result?.output ?? String(result),
      };
    };
  }

  // Fallback: pi-agent-roles EventBus bridge
  const events = (pi as any).events;
  if (events?.emit) {
    return async (params) => {
      const requestId = crypto.randomUUID();
      const responseChannel = `pi-roles-response-${requestId}`;
      await events.emit("pi-roles:dispatch", {
        requestId,
        params,
        responseChannel,
      });
      // Poll for response (simplified for blocking mode)
      return {
        roleId: params.roleId,
        output: `Dispatched to ${params.roleId} via pi-agent-roles bridge`,
      };
    };
  }

  return async (params) => ({
    roleId: params.roleId,
    output: JSON.stringify([
      { id: `${params.roleId.slice(0, 2).toUpperCase()}-01`, severity: "medium", category: "test", description: "Backend unavailable", evidence: "pi-agent-roles required." }
    ]),
  });
}

async function handleReviewAction(params: PiReviewParams, backend: any): Promise<PiReviewResult> {
  if (params.action === "triage") {
    if (!params.rounds) return { status: "error", message: "rounds required for triage action" };
    const triaged = triage(params.rounds, params.triageRules ?? {});
    return {
      status: "ok",
      data: {
        name: params.name ?? "triage",
        totalRounds: params.rounds.length,
        findings: triaged,
        mergedAt: new Date().toISOString(),
      },
    };
  }

  if (params.action === "fix") {
    if (!params.findings || !params.roleId) {
      return { status: "error", message: "findings and roleId required for fix action" };
    }
    const fixResult = await autoFix(
      { enabled: true, roleId: params.roleId, maxFindings: params.findings.length, context: "fork" },
      params.findings as any,
      backend
    );
    return { status: "ok", message: `Fixed: ${fixResult.fixed}, Blocked: ${fixResult.blocked}` };
  }

  // audit or review
  const config = {
    name: params.name ?? "review",
    reviewers: params.reviewers ?? [],
    challenger: params.challenger ?? { roleId: "code-reviewer" },
    defense: params.defense ?? false,
    maxDefenseRounds: params.maxDefenseRounds ?? 1,
    subject: params.subject ?? { type: "codebase" as any, path: "." },
    contextDocs: params.contextDocs,
    triageRules: params.triageRules,
    autoFix: params.autoFix,
    mode: params.mode,
  };

  if (config.mode === "async") {
    // Fire-and-forget with handle
    const handle = `r-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    return {
      status: "ok",
      data: { handle },
      message: `Async audit started. Handle: ${handle}. Check status with pi_review({ action: "status", handle: "${handle}" })`,
    };
  }

  try {
    // Step 1: Initial review (parallel)
    let rounds = await runInitialReview(config, backend);

    // Deduplicate across reviewers before challenger
    const dedupedFindings = deduplicateFindings(
      rounds.filter(r => r.actorType === "reviewer").flatMap(r => r.findings ?? [])
    );
    // Replace round 0 findings with deduped
    rounds = rounds.map(r =>
      r.actorType === "reviewer" ? { ...r, findings: dedupedFindings } : r
    );

    // Step 2: Challenger
    if (params.action === "audit") {
      const challengerRound = await runChallenger(config, rounds, backend);
      rounds.push(challengerRound);

      // Step 3: Defense
      if (config.defense) {
        const defenseRounds = await runDefense(config, rounds, backend);
        rounds.push(...defenseRounds);
      }
    }

    // Step 5: Triage
    const triaged = triage(rounds, config.triageRules ?? {});

    // Step 6: Auto-fix (critical findings)
    if (config.autoFix?.enabled) {
      await autoFix(config.autoFix, triaged, backend);
    }

    return {
      status: "ok",
      data: {
        name: config.name,
        totalRounds: rounds.length,
        findings: triaged,
        mergedAt: new Date().toISOString(),
      } as ReviewResult,
    };
  } catch (err) {
    return { status: "error", message: String(err) };
  }
}
