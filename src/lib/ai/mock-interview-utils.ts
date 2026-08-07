// Pure parsing utilities — no server-only code; safe to import from client components.

import type { MockInterviewEvaluation, MockInterviewScores } from "@/types/database";

export interface ParsedFinalReport {
  scores: MockInterviewScores;
  strengths: string[];
  weaknesses: string[];
  coaching_tips: string[];
  ai_summary: string;
  readiness_score: number;
}

export function parseFinalReport(text: string): ParsedFinalReport | null {
  try {
    const idx = text.indexOf("FINAL_REPORT");
    if (idx === -1) return null;
    const jsonStr = text.slice(idx + "FINAL_REPORT".length).trim();
    const parsed = JSON.parse(jsonStr);
    return {
      scores: {
        overall: parsed.overall ?? 0,
        communication: parsed.communication ?? 0,
        confidence: parsed.confidence ?? 0,
        technical: parsed.technical ?? 0,
        grammar: parsed.grammar ?? 0,
        leadership: parsed.leadership ?? 0,
      },
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      coaching_tips: parsed.coaching_tips ?? [],
      ai_summary: parsed.summary ?? "",
      readiness_score: parsed.readiness_score ?? 0,
    };
  } catch {
    return null;
  }
}

export function parseEvalLine(text: string): { evaluation: MockInterviewEvaluation | null; cleanText: string } {
  const evalRegex = /^EVAL:(\{[\s\S]*?\})\n?/m;
  const match = text.match(evalRegex);
  if (!match) return { evaluation: null, cleanText: text };
  try {
    const evaluation = JSON.parse(match[1]) as MockInterviewEvaluation;
    const cleanText = text.replace(match[0], "").trim();
    return { evaluation, cleanText };
  } catch {
    return { evaluation: null, cleanText: text };
  }
}
