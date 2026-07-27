import type { ParsedResumeData } from "@/types/database";

// Deterministic, non-AI checks -- the "Score & Health" module's structural
// half of Unit A. Runs client- or server-side against data the resume
// pipeline already parsed (raw_text/parsed_data), so it needs no OpenAI call
// and no new columns. Complements ats_scores' AI-judged sub-scores rather
// than replacing them: this catches concrete, always-true facts (is there a
// phone number, are there any numbers in the bullets) the LLM might phrase
// inconsistently between runs.

export type CheckStatus = "pass" | "warning" | "fail";

export type StructuralCheckId =
  | "email"
  | "phone"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "length"
  | "quantified"
  | "weak_phrasing"
  | "action_verbs"
  | "cliches";

export interface StructuralCheck {
  id: StructuralCheckId;
  status: CheckStatus;
  params?: Record<string, string | number>;
}

const WEAK_PHRASES = ["responsible for", "duties included", "worked on", "helped with", "in charge of"];
const ACTION_VERBS = [
  "led", "managed", "built", "designed", "developed", "implemented", "launched", "created",
  "improved", "increased", "reduced", "optimized", "architected", "delivered", "drove",
  "spearheaded", "established", "coordinated", "analyzed", "automated",
];
const CLICHES = [
  "hard worker", "team player", "detail-oriented", "self-starter", "go-getter",
  "results-driven", "think outside the box", "synergy",
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function runStructuralChecks(rawText: string, parsed: ParsedResumeData): StructuralCheck[] {
  const text = rawText ?? "";
  const words = wordCount(text);
  const experienceText = (parsed.experience ?? []).map((e) => e.description ?? "").join(" ");
  const lowerText = text.toLowerCase();
  const lowerExperience = experienceText.toLowerCase();

  const checks: StructuralCheck[] = [
    { id: "email", status: parsed.email ? "pass" : "fail" },
    { id: "phone", status: parsed.phone ? "pass" : "fail" },
    { id: "summary", status: parsed.summary ? "pass" : "warning" },
    { id: "experience", status: parsed.experience?.length ? "pass" : "fail" },
    { id: "education", status: parsed.education?.length ? "pass" : "warning" },
    { id: "skills", status: parsed.skills?.length ? "pass" : "fail" },
  ];

  if (words < 150) checks.push({ id: "length", status: "fail", params: { words } });
  else if (words > 1200) checks.push({ id: "length", status: "warning", params: { words } });
  else checks.push({ id: "length", status: "pass", params: { words } });

  if (!experienceText.trim()) {
    checks.push({ id: "quantified", status: "warning" });
  } else {
    const digitCount = experienceText.match(/\d/g)?.length ?? 0;
    const ratio = digitCount / Math.max(wordCount(experienceText), 1);
    checks.push({ id: "quantified", status: ratio >= 0.02 ? "pass" : "fail" });
  }

  const weakPhrase = WEAK_PHRASES.find((p) => lowerExperience.includes(p));
  checks.push(
    weakPhrase ? { id: "weak_phrasing", status: "warning", params: { phrase: weakPhrase } } : { id: "weak_phrasing", status: "pass" }
  );

  if (experienceText.trim()) {
    const hasActionVerb = ACTION_VERBS.some((v) => lowerExperience.includes(v));
    checks.push({ id: "action_verbs", status: hasActionVerb ? "pass" : "warning" });
  }

  const cliche = CLICHES.find((c) => lowerText.includes(c));
  checks.push(cliche ? { id: "cliches", status: "warning", params: { phrase: cliche } } : { id: "cliches", status: "pass" });

  return checks;
}
