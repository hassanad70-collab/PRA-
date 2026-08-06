import { getOpenAI, AI_MODELS } from "./openai";
import type { SectionAiOperation } from "@/types/database";

interface AiOpInput {
  operation: SectionAiOperation;
  sectionType: string;
  currentContent: string;
  jobDescription?: string;
  candidateContext?: string;
}

interface AiOpResult {
  text: string;
  suggestions?: string[];
}

function buildPrompt(input: AiOpInput): string {
  const { operation, sectionType, currentContent, jobDescription, candidateContext } = input;

  const jdContext = jobDescription
    ? `\n\nTarget Job Description:\n${jobDescription.slice(0, 1500)}`
    : "";
  const candContext = candidateContext
    ? `\n\nCandidate Background:\n${candidateContext.slice(0, 1000)}`
    : "";

  const base = `You are an expert resume writer. Section type: ${sectionType}.${jdContext}${candContext}\n\nCurrent content:\n${currentContent}\n\n`;

  switch (operation) {
    case "generate":
      return base + "Generate professional resume content for this section. Return only the content, no headings or meta-commentary.";
    case "rewrite":
      return base + "Completely rewrite this content to be more professional, impactful, and ATS-friendly. Return only the rewritten content.";
    case "improve":
      return base + "Improve this content by strengthening the language, adding impact, and making it more compelling. Keep the same structure. Return only the improved content.";
    case "expand":
      return base + "Expand this content with more detail, context, and specific examples while keeping it relevant and concise. Return only the expanded content.";
    case "shorten":
      return base + "Shorten this content to be more concise while keeping the most impactful information. Return only the shortened content.";
    case "grammar":
      return base + "Fix all grammar, spelling, and punctuation errors. Improve sentence clarity. Return only the corrected content.";
    case "ats_optimize":
      return base + (jobDescription
        ? "Optimize this content for ATS systems using keywords from the job description. Ensure key terms appear naturally. Return only the optimized content."
        : "Optimize this content for ATS systems with strong action verbs and measurable achievements. Return only the optimized content.");
    case "keyword_match":
      return base + (jobDescription
        ? "Identify missing keywords from the job description and suggest how to naturally incorporate them into this section. Return a list of 5-10 specific keyword suggestions, one per line, in format: 'Add [keyword]: [brief reason]'."
        : "Suggest 8-10 high-impact keywords to add to this section for better ATS performance. Return each on its own line.");
    case "professional_tone":
      return base + "Rewrite this content in a confident, professional tone suitable for executive-level communication. Avoid passive voice. Return only the rewritten content.";
    case "achievement_suggestions":
      return base + "Suggest 5-8 specific, quantified achievements that could strengthen this section. Format each as a bullet point starting with an action verb. Return only the bullets.";
    case "action_verbs":
      return base + "Rewrite all bullet points starting with strong action verbs (Led, Achieved, Built, Delivered, etc.). Replace weak verbs. Return only the rewritten content.";
    case "industry_keywords":
      return base + "Suggest 10-15 industry-specific keywords and phrases that would strengthen this section for the target role. Return each on its own line.";
    default:
      return base + "Improve this content. Return only the improved content.";
  }
}

export async function runSectionAiOperation(input: AiOpInput): Promise<AiOpResult> {
  const client = getOpenAI();
  if (!client) return { text: "AI is not available. Please configure OPENAI_API_KEY." };

  const prompt = buildPrompt(input);

  const res = await client.chat.completions.create({
    model: AI_MODELS.reasoning,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 800,
  });

  const text = res.choices[0]?.message?.content?.trim() ?? "";

  if (
    input.operation === "keyword_match" ||
    input.operation === "industry_keywords" ||
    input.operation === "achievement_suggestions"
  ) {
    const suggestions = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
    return { text, suggestions };
  }

  return { text };
}

export async function analyzeJobDescription(jobDescription: string): Promise<{
  skills: string[];
  keywords: string[];
  responsibilities: string[];
  technologies: string[];
  summary: string;
}> {
  const client = getOpenAI();
  if (!client) return { skills: [], keywords: [], responsibilities: [], technologies: [], summary: "" };

  const res = await client.chat.completions.create({
    model: AI_MODELS.reasoning,
    messages: [
      {
        role: "user",
        content: `Analyze this job description and extract key information. Return a JSON object with these fields:
- skills: array of required skills (max 15)
- keywords: array of important ATS keywords (max 20)
- responsibilities: array of main responsibilities (max 8)
- technologies: array of specific technologies/tools mentioned (max 15)
- summary: one sentence summarizing the role

Job Description:
${jobDescription.slice(0, 3000)}

Return only valid JSON, no markdown.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  const raw = res.choices[0]?.message?.content?.trim() ?? "{}";

  try {
    return JSON.parse(raw);
  } catch {
    return { skills: [], keywords: [], responsibilities: [], technologies: [], summary: "" };
  }
}
