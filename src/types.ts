/**
 * Core types for pi-review.
 */

export interface ReviewConfig {
  name: string;
  reviewers: Reviewer[];
  challenger: Reviewer;
  defense: boolean;
  maxDefenseRounds: number;
  subject: Subject;
  contextDocs?: string[];
  triageRules?: TriageRules;
  autoFix?: AutoFixConfig;
  mode?: "blocking" | "async";
}

export interface Reviewer {
  roleId: string;
  skill?: string;
  prompt?: string;
}

export interface Subject {
  type: "pr-diff" | "file" | "codebase" | "screenshots" | "task-output";
  path: string;
  description?: string;
}

export interface Finding {
  id: string;
  reviewer: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  file?: string;
  line?: string;
  description: string;
  evidence: string;
  suggestedFix?: string;
}

export interface Round {
  roundNumber: number;
  actor: string;
  actorType: "reviewer" | "challenger" | "defender";
  findings?: Finding[];
  rulings?: Ruling[];
  defenses?: Defense[];
}

export interface Ruling {
  findingId: string;
  verdict: "SUSTAIN" | "DOWNGRADE" | "OVERRULE";
  newSeverity?: "critical" | "high" | "medium" | "low";
  reason: string;
}

export interface Defense {
  findingId: string;
  verdict: "AGREE" | "CHALLENGE";
  reason: string;
}

export interface TriageRules {
  downgradeOnSingleReviewer?: boolean;
  overrideThreshold?: number;
}

export interface AutoFixConfig {
  enabled: boolean;
  roleId: string;
  maxFindings: number;
  context: "fork" | "fresh";
}

export interface ReviewResult {
  name: string;
  totalRounds: number;
  findings: TriageFinding[];
  mergedAt: string;
  asyncHandle?: string;
}

export interface TriageFinding extends Finding {
  finalSeverity: "critical" | "high" | "medium" | "low" | "dismissed" | "flagged";
  rounds: { round: number; actor: string; action: string; reason: string }[];
}

export type ReviewAction =
  | "audit"
  | "review"
  | "triage"
  | "fix";

export interface PiReviewParams {
  action: ReviewAction;
  name?: string;
  reviewers?: Reviewer[];
  challenger?: Reviewer;
  defense?: boolean;
  maxDefenseRounds?: number;
  subject?: Subject;
  contextDocs?: string[];
  triageRules?: TriageRules;
  autoFix?: AutoFixConfig;
  rounds?: Round[];
  findings?: Finding[];
  roleId?: string;
  mode?: "blocking" | "async";
}

export interface PiReviewResult {
  status: "ok" | "error";
  message?: string;
  data?: ReviewResult | { handle: string };
}

export interface DispatchResult {
  roleId: string;
  output: string;
}

export type PiRolesDispatch = (params: {
  action: string;
  roleId: string;
  mode: string;
  task: string;
  files?: string[];
  context?: string;
}) => Promise<DispatchResult>;
