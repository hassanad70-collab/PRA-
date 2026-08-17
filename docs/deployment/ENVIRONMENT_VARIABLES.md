# Environment Variables

All environment variables for the PRA Talent Intelligence Platform.

---

## Required Variables

### Supabase

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Your Supabase project URL, e.g. `https://xxxx.supabase.co`. Embedded in the client bundle. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon/public key. Embedded in the client bundle. Safe to expose publicly — all access is enforced via RLS policies. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role key. **Bypasses RLS.** Never expose to the client. Used only in Server Actions and API routes that require admin-level DB access. |

### AI (OpenRouter)

| Variable | Scope | Description |
|---|---|---|
| `OPENAI_API_KEY` | Server only | API key for OpenRouter. Despite the name `OPENAI_API_KEY`, this must be your **OpenRouter** key when `AI_BASE_URL` points to OpenRouter. |
| `AI_BASE_URL` | Server only | Base URL for the AI provider. Set to `https://openrouter.ai/api/v1` for OpenRouter. Changing this value swaps the provider without code changes. |
| `AI_MODEL_REASONING` | Server only | Default model identifier, e.g. `openai/gpt-4o-mini`. Must be a model available on the configured provider. |

### Email (Resend)

| Variable | Scope | Description |
|---|---|---|
| `RESEND_API_KEY` | Server only | API key for Resend. Required for all transactional emails (welcome, notifications, job alerts, offers). For local development, emails are skipped silently if this is missing. |

### Application

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Client + Server | Full canonical URL of the deployment, e.g. `https://pra-eta-umber.vercel.app`. Used for email links, OG images, and absolute URL generation. In local dev: `http://localhost:3000`. |
| `CRON_SECRET` | Server only | Random secret (min 32 chars) for authorizing cron job routes. Vercel injects this as the `Authorization: Bearer` header on scheduled calls. Generate with `openssl rand -hex 32`. |

---

## Optional Variables

### Stripe (Billing)

| Variable | Scope | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Server only | Stripe secret key for creating customers, subscriptions, and payment links. Required when billing features are live. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client + Server | Stripe publishable key. Safe to expose. Required for Stripe.js on the client. |
| `STRIPE_WEBHOOK_SECRET` | Server only | Signing secret from the Stripe webhook dashboard. Required for `/api/webhooks/stripe` to validate incoming events. |

---

## Local Development

Create `.env.local` in the project root (this file is gitignored):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
OPENAI_API_KEY=your-openrouter-api-key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL_REASONING=openai/gpt-4o-mini

# Email (optional for local dev)
RESEND_API_KEY=re_your_key

# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=your-random-secret-min-32-chars

# Stripe (optional for local dev)
# STRIPE_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Vercel Configuration

In the Vercel dashboard (Project → Settings → Environment Variables):

1. Add all **Required** variables to **Production**, **Preview**, and **Development** environments
2. `NEXT_PUBLIC_SITE_URL` should differ per environment:
   - Production: `https://pra-eta-umber.vercel.app`
   - Preview: Use the Vercel `VERCEL_URL` system variable or set per-deployment
3. `CRON_SECRET` must match what Vercel uses to call cron routes

### System Variables (Auto-injected by Vercel)

These are available automatically and do not need to be set manually:

| Variable | Description |
|---|---|
| `VERCEL` | Set to `1` when running on Vercel |
| `VERCEL_URL` | Deployment URL (without protocol) |
| `VERCEL_ENV` | `production`, `preview`, or `development` |

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. Guard every usage with role checks in Server Actions.
- `OPENAI_API_KEY` / `RESEND_API_KEY` are secrets. Never log them. Never return them in API responses.
- `CRON_SECRET` must be long and random. Rotating it requires updating both the Vercel env var and `vercel.json` cron configuration.
- All `NEXT_PUBLIC_` variables are embedded in the JavaScript bundle and visible to anyone who inspects the client source. Only put truly public values here.
