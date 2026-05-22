import type { Finding, Round, Ruling, Defense } from "../../src/types.js";

export const mockFindings: Finding[] = [
  {
    id: "FE-01",
    reviewer: "accessibility-auditor",
    severity: "critical",
    category: "frontend",
    file: "src/components/Header.tsx",
    line: "42",
    description: "Nav links have no visible focus indicator",
    evidence: "line 42: <a class=\"nav-link\"... no :focus-visible styles",
    suggestedFix: "Add focus-visible:ring-2 focus-visible:ring-offset-2",
  },
  {
    id: "SEO-01",
    reviewer: "seo-audit",
    severity: "high",
    category: "seo",
    file: "src/pages/index.astro",
    line: "1",
    description: "Missing H1 heading on homepage",
    evidence: "Page has no h1 tag; highest is h2",
    suggestedFix: "Add h1 wrapping the hero headline",
  },
  {
    id: "FE-02",
    reviewer: "accessibility-auditor",
    severity: "medium",
    category: "frontend",
    file: "src/components/Button.tsx",
    line: "12",
    description: "Button text color contrast ratio 3.8:1",
    evidence: "var(--color-primary) on var(--color-bg) = 3.8:1",
    suggestedFix: "Darken --color-primary from #4A90E2 to #2563EB",
  },
];

export const mockRulings: Ruling[] = [
  { findingId: "FE-01", verdict: "SUSTAIN", reason: "Correct - focus is essential for keyboard users" },
  { findingId: "SEO-01", verdict: "DOWNGRADE", newSeverity: "medium", reason: "H1 is missing but page still ranks; not blocking" },
  { findingId: "FE-02", verdict: "OVERRULE", reason: "3.8:1 passes WCAG AA for large text; this is regular text but 18px bold qualifies" },
];

export const mockDefenses: Defense[] = [
  { findingId: "FE-02", verdict: "CHALLENGE", reason: "18px bold is NOT large text per WCAG. Large text is 18pt (24px) or 14pt (18.66px) bold. This is 18px." },
];

export const mockRounds: Round[] = [
  { roundNumber: 0, actor: "accessibility-auditor", actorType: "reviewer", findings: [mockFindings[0], mockFindings[2]] },
  { roundNumber: 0, actor: "seo-audit", actorType: "reviewer", findings: [mockFindings[1]] },
  { roundNumber: 1, actor: "code-reviewer", actorType: "challenger", rulings: mockRulings },
  { roundNumber: 2, actor: "accessibility-auditor", actorType: "defender", defenses: mockDefenses },
];
