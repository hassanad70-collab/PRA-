# ADR-003: OpenRouter as AI Provider

**Status:** Accepted  
**Date:** 2026-Q1  
**Deciders:** Hassan Ahmed

---

## Context

The platform requires AI inference for 29 distinct capabilities across resume processing, candidate matching, interview intelligence, career coaching, and recruiter tools. We needed an AI provider that:
- Supports a wide range of models
- Has an OpenAI-compatible API (to avoid SDK fragmentation)
- Allows model swapping without code changes
- Provides reasonable pricing for a startup budget

Options considered:
1. **OpenRouter** — aggregated AI gateway, OpenAI-compatible API
2. **OpenAI directly** — single provider, official SDK
3. **Anthropic directly** — Claude models, separate SDK
4. **Azure OpenAI** — enterprise offering, requires Azure subscription

---

## Decision

We chose **OpenRouter** with the **OpenAI SDK** pointed at OpenRouter's base URL.

---

## Rationale

### Model agnosticism via environment variable

The model is configured in `AI_MODEL_REASONING` environment variable. Changing from `openai/gpt-4o-mini` to `anthropic/claude-3-haiku` (or any other OpenRouter-supported model) requires no code changes. This future-proofs the AI layer against model deprecations and price changes.

### OpenAI SDK compatibility

OpenRouter exposes an OpenAI-compatible REST API. The same `OpenAI` SDK instance that works against `api.openai.com` works against `openrouter.ai/api/v1` — the only difference is the `baseURL` parameter. All 29 AI modules use one shared client (`src/lib/ai/openai.ts`) without modification.

### Access to multiple model families

OpenRouter provides access to GPT-4o, Claude, Llama, Mistral, and others through a single API key. This is useful for choosing the right model per capability (e.g., a cheaper model for simple formatting tasks, a stronger model for complex reasoning).

### Cost control

`gpt-4o-mini` via OpenRouter provides excellent capability at low cost, which is appropriate for a platform where AI features are not individually billed.

---

## Implementation

`src/lib/ai/openai.ts`:
```typescript
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_BASE_URL,
});

export const MODEL = process.env.AI_MODEL_REASONING ?? "openai/gpt-4o-mini";
```

All AI modules import `{ openai, MODEL }` from this file. No AI module knows which provider it's actually calling.

---

## Consequences

### Positive
- Changing the AI model is a single environment variable change
- All 29 capabilities use a unified client — one place to add auth headers, retries, or logging
- OpenRouter's routing handles availability fallbacks between providers

### Negative / Watch points
- **OpenRouter is an intermediary** — if OpenRouter has an outage, all AI features fail simultaneously. Direct provider keys would give independent fallback paths.
- **Streaming format differences**: some models on OpenRouter stream differently than OpenAI's native format. The mock interview streaming endpoint was designed for the OpenAI format; switching models requires verifying streaming compatibility.
- **Model capability gaps**: prompts engineered for GPT-4o-mini may need adjustment if switched to a significantly different model family.
- The `OPENAI_API_KEY` environment variable name is misleading when pointing at OpenRouter. This is a known naming awkwardness and is documented in `docs/deployment/ENVIRONMENT_VARIABLES.md`.

---

## Related

- ADR-001: Next.js App Router (streaming in API routes)
- `src/lib/ai/openai.ts`
