import "server-only";

import { AI_MODELS, getOpenAI } from "./openai";
import type { CompetencyRatings, StarEvaluation } from "@/types/database";

const SYSTEM_PROMPT = `You are an AI assistant condensing a recruiter's interview feedback into a short, useful summary for other people on the hiring team who weren't in the interview. Base the summary only on the feedback text, STAR evaluation, and competency ratings given -- do not invent details. 3-4 sentences, plain text, no markdown.`;

function buildFeedbackText(
  feedback: string | null,
  starEvaluation: StarEvaluation | null,
  competencyRatings: CompetencyRatings | null
): string {
  const parts: string[] = [];
  if (feedback) parts.push(`General feedback: ${feedback}`);
  if (starEvaluation) {
    const star = [
      starEvaluation.situation && `Situation: ${starEvaluation.situation}`,
      starEvaluation.task && `Task: ${starEvaluation.task}`,
      starEvaluation.action && `Action: ${starEvaluation.action}`,
      starEvaluation.result && `Result: ${starEvaluation.result}`,
    ].filter(Boolean);
    if (star.length) parts.push(`STAR evaluation:\n${star.join("\n")}`);
  }
  if (competencyRatings && Object.keys(competencyRatings).length) {
    parts.push(
      `Competency ratings (1-5): ${Object.entries(competencyRatings)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}`
    );
  }
  return parts.join("\n\n");
}

/** Summarizes a single completed interview's recruiter-entered feedback.
 * Returns a fallback string if OpenAI is not configured -- never throws. */
export async function summarizeInterview(
  feedback: string | null,
  starEvaluation: StarEvaluation | null,
  competencyRatings: CompetencyRatings | null,
  context: { jobTitle: string; candidateName: string; interviewType: string }
): Promise<string> {
  const feedbackText = buildFeedbackText(feedback, starEvaluation, competencyRatings);
  if (!feedbackText.trim()) {
    return "No feedback has been recorded for this interview yet.";
  }

  const openai = getOpenAI();
  if (!openai) {
    console.warn("OpenAI API not configured. Returning unsummarized interview feedback.");
    return feedbackText;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `${context.interviewType} interview for ${context.jobTitle} with ${context.candidateName}.\n\n${feedbackText}`,
        },
      ],
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content;
    return text?.trim() || feedbackText;
  } catch (err) {
    console.error("summarizeInterview: OpenAI call failed", err);
    return feedbackText;
  }
}
