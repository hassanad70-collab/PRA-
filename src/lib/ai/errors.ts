import "server-only";

import OpenAI from "openai";

/**
 * Shared OpenAI error classification for every AI wrapper in src/lib/ai/.
 * Before this module existed, every wrapper's catch block logged a generic
 * "OpenAI call failed" and returned the same fallback regardless of *why*
 * the call failed -- a missing key, an expired/invalid key, a rate limit, a
 * timeout, a network blip, and a malformed structured-output response were
 * all indistinguishable in logs and all silently produced the same
 * "not configured"-shaped fallback data. That collapsed distinction is what
 * made a real bug (AI structured resume extraction failing) look identical
 * to a follow-up bug (checklist reporting fields with real values as
 * missing) -- see the resume-parser.ts fallback path for the concrete case.
 */

export type AIErrorReason =
  | "missing_api_key"
  | "invalid_api_key"
  | "authentication_error"
  | "rate_limit"
  | "timeout"
  | "network_error"
  | "invalid_json_response"
  | "unknown_error";

export interface ClassifiedAIError {
  reason: AIErrorReason;
  /** Full diagnostic detail (status/code/request id/message) -- log only, never shown to end users. */
  diagnostic: string;
  /** Safe, generic wording for end users. Never includes provider-specific detail. */
  friendlyMessage: string;
}

/**
 * Thrown by AI wrapper functions when the OpenAI call itself succeeded (HTTP
 * 200) but the response didn't include usable structured output -- the
 * model refused, hit its length limit, or the schema-validated `.parsed`
 * field came back null. Distinct from every APIError subclass below because
 * the request never failed at the transport/auth level; the *content* was
 * unusable. A plain Error would misclassify as "unknown_error".
 */
export class InvalidAIResponseError extends Error {
  constructor(message = "The AI response did not include valid structured output.") {
    super(message);
    this.name = "InvalidAIResponseError";
  }
}

const FRIENDLY_MESSAGES: Record<AIErrorReason, string> = {
  missing_api_key: "AI features aren't enabled for this environment yet.",
  invalid_api_key: "AI features are temporarily unavailable. Our team has been notified.",
  authentication_error: "AI features are temporarily unavailable. Our team has been notified.",
  rate_limit: "AI features are getting a lot of requests right now. Please try again in a few minutes.",
  timeout: "That AI request took too long to respond. Please try again.",
  network_error: "Couldn't reach the AI service right now. Please try again shortly.",
  invalid_json_response: "The AI service returned an unexpected response. Please try again.",
  unknown_error: "Something went wrong processing that with AI. Please try again.",
};

/** True for failures where an immediate retry is worth attempting (transient). */
export function isRetryableAIError(reason: AIErrorReason): boolean {
  return reason === "rate_limit" || reason === "timeout" || reason === "network_error" || reason === "invalid_json_response" || reason === "unknown_error";
}

function classify(err: unknown): { reason: AIErrorReason; diagnostic: string } {
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return { reason: "timeout", diagnostic: err.message };
  }
  if (err instanceof OpenAI.APIConnectionError) {
    // Base class of APIConnectionTimeoutError -- must be checked after it.
    return { reason: "network_error", diagnostic: err.message };
  }
  if (err instanceof OpenAI.RateLimitError) {
    return {
      reason: "rate_limit",
      diagnostic: `status=${err.status} code=${err.code ?? "n/a"} request_id=${err.request_id ?? "n/a"} message=${err.message}`,
    };
  }
  if (err instanceof OpenAI.AuthenticationError) {
    return {
      reason: err.code === "invalid_api_key" ? "invalid_api_key" : "authentication_error",
      diagnostic: `status=${err.status} code=${err.code ?? "n/a"} type=${err.type ?? "n/a"} message=${err.message}`,
    };
  }
  if (err instanceof Error && (err.name === "LengthFinishReasonError" || err.name === "ContentFilterFinishReasonError")) {
    // Thrown by openai's beta .parse() helper for a truncated or
    // safety-refused response -- not part of the SDK's public default-export
    // type surface, so matched by name rather than instanceof.
    return { reason: "invalid_json_response", diagnostic: `${err.name}: ${err.message}` };
  }
  if (err instanceof InvalidAIResponseError) {
    return { reason: "invalid_json_response", diagnostic: err.message };
  }
  if (err instanceof OpenAI.APIError) {
    // Any other API error (400/403/404/409/422/5xx) not special-cased above.
    return {
      reason: "unknown_error",
      diagnostic: `status=${err.status} code=${err.code ?? "n/a"} type=${err.type ?? "n/a"} message=${err.message}`,
    };
  }
  if (err instanceof Error) {
    return { reason: "unknown_error", diagnostic: `${err.name}: ${err.message}` };
  }
  return { reason: "unknown_error", diagnostic: String(err) };
}

export function classifyAIError(err: unknown): ClassifiedAIError {
  const { reason, diagnostic } = classify(err);
  return { reason, diagnostic, friendlyMessage: FRIENDLY_MESSAGES[reason] };
}

/**
 * Classifies and logs an AI call failure with full diagnostic detail
 * (status, code, request id) tagged by calling context, then returns the
 * classification so callers can branch on `.reason` (e.g. to decide whether
 * a retry is worthwhile, or to persist a specific parse_error_code).
 */
export function logAIError(context: string, err: unknown): ClassifiedAIError {
  const classified = classifyAIError(err);
  console.error(`[AI:${context}] ${classified.reason} -- ${classified.diagnostic}`);
  return classified;
}

/** Logs the proactive "no key at all" case -- there's no exception to classify here. */
export function logMissingApiKey(context: string): ClassifiedAIError {
  console.warn(`[AI:${context}] missing_api_key -- OPENAI_API_KEY is not set.`);
  return { reason: "missing_api_key", diagnostic: "OPENAI_API_KEY is not set.", friendlyMessage: FRIENDLY_MESSAGES.missing_api_key };
}
