# pi-review

Adversarial multi-agent review pipeline for Pi.

## What it does

`pi-review` runs quality gates with **multiple reviewers + Devil's Advocate + defense rounds** — a 3-party adversarial review that `execute_workflow` alone cannot do (which only supports task agent → review agent round-trip).

### Pipeline

```
Step 1: Initial Review Team    <- N parallel reviewers dispatch findings
Step 2: Devil's Advocate        <- Single challenger evaluates every finding
Step 3: Defense (optional)     <- Original reviewers respond to challenges
Step 4: Triage                <- Orchestrator merges rounds + rules
Step 5: Auto-fix (optional)   <- Apply critical fixes via agent dispatch
```

## Tool: `pi_review`

### Actions

| Action | Description |
|--------|-------------|
| `audit` | Full pipeline: reviewers → challenger → defense → triage → fix |
| `review` | Reviewers only, no challenger. Fast path. |
| `triage` | Manual triage — pass pre-generated `rounds`. |
| `fix` | Apply fixes to findings via agent dispatch. |

### Examples

**Full audit with defense:**
```typescript
pi_review({
  action: "audit",
  name: "site-reviewer",
  reviewers: [
    { roleId: "accessibility-auditor", skill: "ui-ux-pro-max" },
    { roleId: "seo-audit", skill: "seo-audit" },
    { roleId: "ux-researcher", skill: "impeccable" }
  ],
  challenger: { roleId: "skeptic" },
  defense: true,
  subject: { type: "pr-diff", path: ".web-studio/pr-diff.patch" }
})
```

**Triage only (manual):**
```typescript
pi_review({ action: "triage", rounds: [...] })
```

### Async Mode

```typescript
pi_review({ action: "audit", mode: "async", ... })
// Returns: { handle: "r-abc123" }

// Poll later:
pi_review({ action: "status", handle: "r-abc123" })
pi_review({ action: "result", handle: "r-abc123" })
```

## Architecture

```
src/
├── types.ts          # ReviewConfig, Finding, Round, TriageFinding
├── deduplicate.ts    # Merge same file+line+category across reviewers
├── reviewer-pool.ts  # Parallel reviewer dispatch via pi-agent-roles
├── challenger.ts     # Devil's Advocate single agent
├── defense.ts        # Original reviewers respond to challenges
├── triage.ts         # Merge rounds, apply severity rules
├── fix.ts            # Auto-fix critical findings
└── extension/
    └── index.ts      # pi_review tool registration
```

## Dependencies

| Extension | Required? |
|-----------|-----------|
| `pi-agent-roles` | **Yes** — dispatches all agents |
| `pi-workflows` | Optional — can be used alongside |

## Install

```bash
# As Pi extension
pi package add pi-review

# Or clone locally
git clone https://github.com/dizthewize/pi-review.git
```

## Development

```bash
npm install
npm run build
npm test
```

## Test Suite

| File | Tests |
|------|-------|
| `test/deduplicate.test.ts` | 6 |
| `test/triage.test.ts` | 9 |
| `test/reviewer-pool.test.ts` | 3 |
| `test/challenger.test.ts` | 2 |
| `test/defense.test.ts` | 3 |
| `test/fix.test.ts` | 3 |
| `test/full-pipeline.test.ts` | 3 |
| **Total** | **29** |

## License

MIT
