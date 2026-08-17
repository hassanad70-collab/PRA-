# PRA Talent Intelligence Platform — API Reference

**Version:** 2.0.0
**Last Updated:** 2026-08-09

---

## Table of Contents

1. [Overview](#1-overview)
2. [REST API Endpoints](#2-rest-api-endpoints)
3. [Server Actions](#3-server-actions)
4. [Streaming Endpoints](#4-streaming-endpoints)
5. [Webhook Endpoints](#5-webhook-endpoints)

---

## 1. Overview

### Base URL

```
https://pra-eta-umber.vercel.app
```

Local development:

```
http://localhost:3000
```

### Authentication

The platform uses **Supabase session cookies** for all user-facing endpoints. The session is established via `signInWithPassword` or OAuth and stored as an HTTP-only cookie named `sb-<project-ref>-auth-token`.

**Server Components** read the session cookie directly via `createClient()` (server-side Supabase client). **API Route Handlers** call `supabase.auth.getUser()` or `getCurrentUser()` to resolve the active session, and return `401` if no valid session exists.

The exception is the **cron worker endpoint**, which accepts a `Bearer <CRON_SECRET>` token in the `Authorization` header instead of a session cookie.

**Stripe webhook verification** uses HMAC-SHA256 signature validation via the `Stripe-Signature` header. No session cookie is involved.

### Error Format

All REST API endpoints return errors as JSON:

```json
{
  "error": "Human-readable error message"
}
```

Server Actions return:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "fieldErrors": {
    "fieldName": "Validation message"
  }
}
```

`fieldErrors` is only present when a Zod schema parse fails; `error` is present for all other failures.

### Rate Limiting

Rate limiting is implemented server-side via `rateLimitByIp` (in-memory sliding window).

| Endpoint | Limit | Window |
|---|---|---|
| `GET /api/search-autocomplete` | 60 requests | 60 seconds |
| `POST /api/web-vitals` | 30 requests | 60 seconds |
| `POST /auth/register` (candidate) | 5 requests | 1 hour |
| `POST /auth/register` (recruiter) | 5 requests | 1 hour |
| `POST /auth/login` (per IP + email) | 15 requests | 5 minutes |
| `POST /auth/password-reset` | 5 requests | 1 hour |
| `POST /auth/phone-otp` (per IP + phone) | 5 requests | 10 minutes |

---

## 2. REST API Endpoints

### 2.1 GET /api/candidate/messages

Fetches all messages within a specific message thread for the authenticated candidate.

**Authentication required:** Yes — candidate session cookie.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `threadId` | `string` (UUID) | Yes | The message thread to fetch |

**Response — 200 OK:**

```json
[
  {
    "id": "uuid",
    "thread_id": "uuid",
    "sender_role": "recruiter" | "candidate",
    "sender_id": "uuid",
    "body": "string",
    "is_read": true,
    "created_at": "ISO8601"
  }
]
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | No valid session |
| `400` | `threadId` query parameter is missing |
| `404` | Thread does not exist or does not belong to the authenticated candidate |

---

### 2.2 GET /api/cron/process-queue

Cron worker endpoint that dequeues and processes up to 5 pending background jobs per invocation. Intended to be called by a scheduler (Vercel Cron or an external service) on a regular cadence.

**Authentication required:** `Authorization: Bearer <CRON_SECRET>` header on all Vercel-hosted environments. On local `next dev` (where `VERCEL_ENV` is not set), the header is not required.

**Supported Job Types:**

| Job Type | Description |
|---|---|
| `email_send` | Sends a queued transactional email via Resend. Payload must contain `email_id`. |
| `job_alert_send` | Sends a job-alert email notification to a candidate. Payload must contain `alert_id`. |
| `weekly_digest_send` | Sends a weekly career digest email. Payload must contain `candidate_id`. |

**Response — 200 OK:**

```json
{
  "processed": ["job-uuid-1", "job-uuid-2"],
  "errors": [
    { "id": "job-uuid-3", "error": "Error message string" }
  ]
}
```

An empty `processed` array means no jobs were queued.

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | `Authorization` header is missing or does not match `CRON_SECRET` |
| `503` | `CRON_SECRET` env var is not configured on a hosted Vercel environment |

---

### 2.3 GET /api/recruiter/candidate-search

Searches the candidate pool visible to the recruiter's company. Returns up to 100 results.

**Authentication required:** Yes — recruiter session cookie. The authenticated user must have a row in the `recruiters` table.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | `string` | No | Free-text search across candidate name, title, skills |
| `location` | `string` | No | Filter by city or country |
| `openToWork` | `"1"` | No | When set to `"1"`, filters to candidates marked as open to work |

**Response — 200 OK:**

```json
[
  {
    "id": "uuid",
    "full_name": "string",
    "current_position": "string",
    "city": "string",
    "country": "string",
    "years_of_experience": 5,
    "skills": ["skill1", "skill2"],
    "is_open_to_work": true,
    "profile_completion_score": 80,
    "avatar_url": "string | null"
  }
]
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | No valid session |
| `403` | Authenticated user is not a recruiter |

---

### 2.4 POST /api/recruiter/comparison-pdf

Generates a multi-candidate comparison PDF and streams it directly to the caller. The PDF is generated on-the-fly and never persisted to storage. Accepts 2 to 4 application IDs.

**Authentication required:** Yes — recruiter session cookie.

**Request Body (JSON):**

```json
{
  "applicationIds": ["uuid", "uuid"]
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `applicationIds` | `string[]` | Yes | Minimum 2, maximum 4 UUIDs |

**Response — 200 OK:**

- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="comparison-<timestamp>.pdf"`
- Body: binary PDF data

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | No valid session |
| `403` | Authenticated user is not a recruiter |
| `400` | Fewer than 2 application IDs provided |
| `404` | Could not load the selected candidates from the database |

---

### 2.5 GET /api/recruiter/messages

Fetches all messages within a specific message thread for the authenticated recruiter.

**Authentication required:** Yes — recruiter session cookie.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `threadId` | `string` (UUID) | Yes | The message thread to fetch |

**Response — 200 OK:**

```json
[
  {
    "id": "uuid",
    "thread_id": "uuid",
    "sender_role": "recruiter" | "candidate",
    "sender_id": "uuid",
    "body": "string",
    "is_read": true,
    "created_at": "ISO8601"
  }
]
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | No valid session |
| `403` | Authenticated user is not a recruiter |
| `400` | `threadId` query parameter is missing |
| `404` | Thread does not exist or does not belong to this recruiter |

---

### 2.6 GET /api/recruiter/resume-intelligence

Fetches a candidate's resumes for review inside the recruiter's Resume Intelligence panel. Only resumes belonging to the specified candidate are returned.

**Authentication required:** Yes — recruiter session cookie.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `candidateId` | `string` (UUID) | Yes | The candidate whose resumes to retrieve |

**Response — 200 OK:**

```json
[
  {
    "id": "uuid",
    "file_name": "string",
    "file_url": "string",
    "is_primary": true,
    "created_at": "ISO8601",
    "parsed_data": { ... }
  }
]
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | No valid session |
| `403` | Authenticated user is not a recruiter |
| `400` | `candidateId` query parameter is missing |

---

### 2.7 GET /api/search-autocomplete

Returns autocomplete suggestions for the job search bar. This endpoint is public (no authentication required) and rate-limited by IP address.

**Authentication required:** No.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `q` | `string` | Yes | — | Search term; must be at least 2 characters |
| `field` | `"title"` \| `"keywords"` \| `"location"` | No | `"title"` | The field to search against |

**Response — 200 OK:**

```json
{
  "suggestions": [
    {
      "text": "Software Engineer",
      "source": "title",
      "count": 42
    }
  ]
}
```

Returns `{ "suggestions": [] }` when `q` is shorter than 2 characters.

**Cache headers:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`

**Error Responses:**

| Status | Condition |
|---|---|
| `429` | Rate limit exceeded (60 req / 60 s per IP) |
| `400` | `field` is not one of `title`, `keywords`, `location` |

---

### 2.8 POST /api/web-vitals

Ingests a single Core Web Vitals metric from the client-side `web-vitals` library. Tracked internally via the platform analytics system. Public endpoint, rate-limited by IP.

**Authentication required:** No.

**Request Body (JSON):**

```json
{
  "name": "LCP",
  "value": 2400,
  "rating": "good",
  "path": "/en/candidate/dashboard"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Metric name (e.g. `LCP`, `CLS`, `FID`, `INP`, `TTFB`) |
| `value` | `number` | Yes | Metric value in milliseconds (or unitless for CLS) |
| `rating` | `string` | No | `"good"`, `"needs-improvement"`, or `"poor"` |
| `path` | `string` | No | The page pathname where the metric was captured |

**Response — 200 OK:**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Condition |
|---|---|
| `429` | Rate limit exceeded (30 req / 60 s per IP) |
| `400` | `name` is not a string or `value` is not a number |

---

### 2.9 POST /api/webhooks/stripe

Handles inbound Stripe webhook events. All events are persisted to the `billing_events` table before processing (idempotent via `stripe_event_id` unique constraint). Implements HMAC-SHA256 signature verification and a 5-minute replay-protection window.

**Authentication required:** `Stripe-Signature` header (HMAC-SHA256 signed by `STRIPE_WEBHOOK_SECRET`). Timestamps older than 300 seconds are rejected.

**Request Body:** Raw Stripe event JSON (must not be parsed before delivery; Stripe signs the raw bytes).

**Headers:**

| Header | Required | Description |
|---|---|---|
| `Stripe-Signature` | Yes (when `STRIPE_WEBHOOK_SECRET` is set) | Stripe webhook signature |

**Handled Event Types:**

| Event | Action |
|---|---|
| `customer.subscription.created` | Updates `subscriptions` table; syncs plan/status to `companies` |
| `customer.subscription.updated` | Updates `subscriptions` table; syncs plan/status to `companies` |
| `customer.subscription.deleted` | Marks subscription and company as `cancelled` |
| `invoice.paid` | Upserts invoice record in `invoices` table |
| `invoice.payment_failed` | Upserts invoice record; queues `payment_failed` email to billing contact |

All other event types are logged to `billing_events` but not processed.

**Response — 200 OK:**

```json
{ "received": true }
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Invalid JSON body, missing `Stripe-Signature` header, or signature/timestamp validation failure |

---

### 2.10 GET /auth/callback

OAuth and email magic-link callback handler. Exchanges the `code` parameter for a Supabase session, resolves the user's role, and redirects to the appropriate dashboard. For brand-new OAuth candidates, a `candidates` row is created and a welcome email is queued.

**Authentication required:** No — this route is the landing point for external redirects.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | Yes | One-time OAuth authorization code from Supabase |
| `next` | `string` | No | Relative path for post-reset redirects (e.g. `/reset-password`). Only same-site paths accepted. |

**Response:** HTTP 302 redirect.

| Condition | Redirect destination |
|---|---|
| `next` param present and starts with `/` | `{origin}{next}` |
| New OAuth candidate | `/{locale}/complete-profile` |
| Candidate | `/{locale}/candidate/dashboard` |
| Recruiter or HR Manager | `/{locale}/recruiter/dashboard` |
| Super Admin | `/admin` |
| Error or missing code | `/login?error=auth_callback_failed` |

---

## 3. Server Actions

Server Actions are Next.js 14 "use server" functions invoked directly from React Server Components and Client Components. They run on the server and use the same Supabase session cookie as REST routes. They are not callable over HTTP from external clients.

All actions share the `ActionResult<T>` return type:

```typescript
interface ActionResult<T = void> {
  success: boolean;
  error?: string;         // present on all non-field failures
  fieldErrors?: Record<string, string>; // present only on schema validation failure
  data?: T;
}
```

---

### 3.1 Auth Actions (`src/actions/auth.ts`)

| Action | Description | Auth Required | Key Parameters |
|---|---|---|---|
| `registerCandidate(formData)` | Creates a new candidate account (pre-confirmed via admin API), signs in, queues welcome email, redirects to dashboard. Rate limited: 5/hour per IP. | None | `fullName`, `email`, `password`, `confirmPassword`, `locale?` |
| `registerRecruiter(formData)` | Creates a new recruiter account, creates the associated company record, signs in, queues welcome email, redirects to dashboard. Rate limited: 5/hour per IP. | None | `fullName`, `email`, `companyName`, `jobTitle`, `password`, `confirmPassword` |
| `login(formData)` | Authenticates with email/password. Checks account is active and not soft-deleted. Redirects to role dashboard or a `redirect` param. Rate limited: 15 attempts per 5 minutes per IP+email pair. | None | `email`, `password`, `locale?`, `redirect?` |
| `logout()` | Signs out the current session, redirects to locale-prefixed `/login`. | Any role | — |
| `requestPasswordReset(formData)` | Sends a Supabase password-reset email. Always reports success to avoid leaking registered emails. Rate limited: 5/hour per IP. | None | `email` |
| `resetPassword(formData)` | Updates the authenticated user's password using an active recovery session. | Recovery session | `password`, `confirmPassword` |
| `signInWithOAuth(provider)` | Initiates a Google OAuth redirect flow. Redirects to `/auth/callback` on completion. | None | `provider: "google"` |
| `sendPhoneOtp(formData)` | Sends an SMS OTP to the provided phone number. Rate limited: 5/10 min per IP+phone. | None | `phone` (E.164 format) |
| `verifyPhoneOtp(formData)` | Verifies the SMS OTP. Creates a `candidates` row for first-time users; redirects to `/complete-profile` or dashboard. | None | `phone`, `token` |
| `completeProfile(formData)` | Saves onboarding fields (name, city, country, position, experience, phone) and recomputes profile completion score. | Candidate | `fullName`, `city`, `country`, `currentPosition`, `yearsOfExperience`, `phone?` |

---

### 3.2 Jobs Actions (`src/actions/jobs.ts`)

| Action | Description | Auth Required | Key Parameters |
|---|---|---|---|
| `draftJobDescription(input)` | Calls OpenAI to generate a job description draft. Returns draft only — nothing is saved. | Recruiter | `title`, `department?`, `employmentType`, `experienceLevel`, `keyPoints` |
| `createJob(formData)` | Validates the job form, generates a vector embedding, saves the job posting as published, kicks off AI candidate matching. | Recruiter | Full job form fields (title, description, skills, salary range, location, etc.) |

---

### 3.3 Applications Actions (`src/actions/applications.ts`)

| Action | Description | Auth Required | Returns |
|---|---|---|---|
| `applyToJob(jobId, resumeId, coverLetterText?)` | Submits an application. Immediately kicks off an async AI screening pipeline (ATS score, skills match, culture fit, etc.) that updates application status and rank. | Candidate | `ApplyResult { success, applicationId? }` |
| `withdrawApplication(applicationId)` | Sets application status to `withdrawn`. Scoped to the authenticated candidate. | Candidate | `ActionResult` |
| `updateApplicationStatus(applicationId, status, reason?)` | Recruiter moves an application through the pipeline. Sends a real-time in-app notification to the candidate. | Recruiter | `ActionResult` |
| `generateCandidateInsight(applicationId)` | On-demand AI analysis of a candidate for recruiter interview prep: risks, red flags, confidence score, interview focus areas, suggested questions. Stored in `screening_results`. | Recruiter | `GenerateInsightResult { insight? }` |

**Application Status Values:** `submitted`, `screening`, `shortlisted`, `interview`, `offer`, `hired`, `rejected`, `withdrawn`

---

### 3.4 Resume Actions (`src/actions/resume.ts`)

| Action | Description | Auth Required | Returns |
|---|---|---|---|
| `uploadResume(formData)` | Full resume pipeline: upload to Supabase Storage (private), create `resumes` row, extract text, AI parse, generate embedding, run ATS score, kick off job matching. Accepts PDF and Word documents up to 10 MB. | Candidate | `UploadResumeResult { resumeId? }` |

---

### 3.5 Offers Actions (`src/actions/offers.ts`)

| Action | Description | Auth Required | Returns |
|---|---|---|---|
| `createOfferAction(input)` | Creates or upserts an offer record. Sends a fire-and-forget email + in-app notification to the candidate. | Recruiter | `{ id: string }` |
| `generateOfferLetterAction(input)` | AI-generates offer letter prose. Does not persist to the database; caller decides whether to save. | Recruiter | `string` (letter text) |
| `withdrawOfferAction(offerId)` | Marks a pending offer as `withdrawn`. Only the offer's company can withdraw it. | Recruiter | `void` (throws on error) |
| `respondToOfferAction(offerId, status, note?)` | Candidate accepts or declines a pending offer. Sends notification to the recruiter. | Candidate | `void` (throws on error) |
| `saveOfferTemplateAction(name, body)` | Saves a reusable offer letter template scoped to the recruiter's company. | Recruiter | `void` |
| `deleteOfferTemplateAction(templateId)` | Deletes a company-scoped offer template. | Recruiter | `void` |

**Offer Status Values:** `pending`, `accepted`, `declined`, `withdrawn`

---

### 3.6 Interviews Actions (`src/actions/interviews.ts`)

| Action | Description | Auth Required | Returns |
|---|---|---|---|
| `generateInterviewQuestionsForJob(jobId)` | AI-generates a categorized question bank for a job (technical, behavioral, situational, etc.). Replaces any existing questions for the job. | Recruiter | `ActionResult` |
| `scheduleInterview(applicationId, jobId, formData)` | Creates an interview record, advances the application to `interview` status, sends a calendar-style notification to the candidate. | Recruiter | `ActionResult` |

---

### 3.7 Messaging Actions (`src/actions/messaging.ts`)

| Action | Description | Auth Required | Returns |
|---|---|---|---|
| `recruiterSendMessageAction(candidateId, body, jobId?)` | Finds or creates a message thread between recruiter and candidate, inserts the message, increments the candidate's unread count, fires an email + in-app notification. | Recruiter | `{ threadId: string }` |
| `candidateSendMessageAction(threadId, body)` | Inserts a reply in an existing thread. Verifies thread ownership. Fires an email + in-app notification to the recruiter. | Candidate | `void` (throws on error) |
| `markThreadReadAction(threadId, role)` | Zeroes the unread count for the given role and marks the opposite side's messages as read. | Candidate or Recruiter | `void` |

---

### 3.8 Admin Actions (`src/actions/admin-users.ts`)

**Authentication required for all actions in this group:** `super_admin` role.

| Action | Description | Returns |
|---|---|---|
| `createUserAction(input)` | Creates a Supabase Auth user (pre-confirmed) with the specified role, updates the profile, optionally associates with a company, logs an audit event, and optionally sends an invitation email. | `ActionResult<{ userId: string }>` |

**`CreateUserInput` schema:**

```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyId?: string;
  department?: string;
  role: "recruiter" | "hr_manager" | "super_admin";
  status: "active" | "disabled";
  temporaryPassword: string;  // min 8 characters
  sendInvitation: boolean;
}
```

---

### 3.9 Workspace Actions (`src/actions/workspace.ts`)

The AI Career Workspace provides a set of actions for candidate-facing AI tools. All require a candidate session.

**Authentication required:** Candidate session for all actions.

| Action | Description | Returns |
|---|---|---|
| `uploadWorkspaceResumeAction(formData)` | Uploads a temporary resume for use in AI workspace tools. Extracts raw text. Rate limited: 20/min per IP. | `WorkspaceActionResult<{ rawText, fileName }>` |
| `generateCoverLetterAction(input)` | AI-generates a cover letter from resume text and job description. Saves result. | `WorkspaceActionResult<AiCoverLetter>` |
| `generateInterviewPrepAction(input)` | AI-generates interview preparation content for a given role. | `WorkspaceActionResult<AiInterviewSession>` |
| `generateCareerAdviceAction(input)` | AI-generates personalized career advice. | `WorkspaceActionResult<AiCareerReport>` |
| `getSalaryEstimateAction(input)` | AI-estimates salary range for a given role and location. | `WorkspaceActionResult<AiSalaryEstimate>` |
| `generatePortfolioDescriptionAction(input)` | AI-generates a portfolio item description. | `WorkspaceActionResult<string>` |
| `optimizeLinkedInAction(input)` | AI-optimizes a LinkedIn profile section. Saves suggestion. | `WorkspaceActionResult<AiLinkedInSuggestion>` |
| `getApplicationAnalyticsAction()` | Returns funnel metrics and AI win-probability for the candidate's applications. | `WorkspaceActionResult<ApplicationAnalytics>` |
| `createMockInterviewSessionAction(input)` | Saves a new mock interview session record. | `WorkspaceActionResult<MockInterviewSession>` |
| `updateMockInterviewSessionAction(id, updates)` | Saves AI scores and transcript after a mock interview completes. | `WorkspaceActionResult` |
| `deleteMockInterviewSessionAction(id)` | Deletes a mock interview session. | `WorkspaceActionResult` |

---

### 3.10 Bulk Application Actions (`src/actions/bulk-applications.ts`)

**Authentication required:** Recruiter session for all actions.

| Action | Description | Returns |
|---|---|---|
| `bulkUpdateApplicationStatus(applicationIds, status)` | Updates pipeline status for multiple applications in a single query. Authorization is enforced by Supabase RLS (company-scoped). | `ActionResult` |
| `bulkAssignRecruiter(applicationIds, recruiterId)` | Assigns a specific recruiter (or clears assignment with `null`) across multiple applications. | `ActionResult` |
| `bulkTagCandidates(candidateIds, tags)` | Applies one or more tags to multiple candidates' profiles. | `ActionResult` |

---

## 4. Streaming Endpoints

### POST /api/mock-interview

Conducts a streamed AI mock interview session. Each invocation represents one exchange: the client sends the current conversation history and the server streams back the AI's next response as plain text chunks.

When `isFinalize` is `true`, the AI produces a structured feedback report (scoring, strengths, areas for improvement) instead of the next question.

**Authentication required:** Yes — any authenticated session (candidate).

**Runtime:** Node.js. Max duration: 60 seconds.

**Request Body (JSON):**

```json
{
  "interviewType": "behavioral",
  "targetRole": "Senior Software Engineer",
  "company": "Acme Corp",
  "jobDescription": "Optional JD text...",
  "experienceLevel": "senior",
  "messages": [
    { "role": "assistant", "content": "Tell me about yourself." },
    { "role": "user", "content": "I have 8 years of experience..." }
  ],
  "isFinalize": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `interviewType` | `MockInterviewType` | Yes | One of: `behavioral`, `technical`, `situational`, `competency`, `case_study`, `panel` |
| `targetRole` | `string` | Yes | The role being practiced for |
| `company` | `string` | No | Target company name for context |
| `jobDescription` | `string` | No | JD text for more targeted questions |
| `experienceLevel` | `string` | No | `"entry"`, `"mid"`, `"senior"`, `"executive"` |
| `messages` | `MockInterviewMessage[]` | Yes | Full conversation history so far (may be empty for the first turn) |
| `isFinalize` | `boolean` | No | `true` to request the final scoring report instead of the next question |

**Response — 200 OK (streaming):**

- Content-Type: `text/plain; charset=utf-8`
- Transfer-Encoding: `chunked`
- Cache-Control: `no-cache, no-transform`
- X-Accel-Buffering: `no`

The response body is a stream of UTF-8 text chunks. The client should concatenate all chunks to form the complete assistant turn. There is no structured JSON framing — each chunk is a raw text delta as received from the OpenAI streaming API.

**Example stream (concatenated):**

```
That's a strong background. Let me ask you about a time when you had to...
```

When `isFinalize` is `true`, the concatenated response is a structured plain-text report covering overall performance, per-answer scores, strengths, and improvement areas.

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | No valid session (plain text response body) |
| `400` | Malformed JSON request body |
| `503` | OpenAI API key is not configured |
| `502` | OpenAI API error during streaming |

---

## 5. Webhook Endpoints

### POST /api/webhooks/stripe

Receives webhook events from the Stripe Dashboard. Configure this URL in your Stripe Dashboard's Webhook settings. All events are logged to the `billing_events` table with idempotency enforced via the `stripe_event_id` unique constraint.

**Signature Verification:**

The handler uses Web Crypto (no Stripe SDK dependency) to verify the `Stripe-Signature` HMAC-SHA256 signature. Webhooks with timestamps older than 300 seconds are rejected to prevent replay attacks.

**Configure in Stripe Dashboard:**

```
https://pra-eta-umber.vercel.app/api/webhooks/stripe
```

**Environment Variables:**

| Variable | Description |
|---|---|
| `STRIPE_WEBHOOK_SECRET` | The signing secret from the Stripe Dashboard webhook configuration (starts with `whsec_`) |
| `STRIPE_PRICE_ID_STARTER` | Maps the Stripe price ID to the `starter` internal plan slug |
| `STRIPE_PRICE_ID_PROFESSIONAL` | Maps to the `professional` plan slug |
| `STRIPE_PRICE_ID_ENTERPRISE` | Maps to the `enterprise` plan slug |

**Handled Events:**

### `customer.subscription.created` / `customer.subscription.updated`

Updates the matching `subscriptions` row (plan, status, billing period, trial end, cancel flag) and syncs denormalized `subscription_plan` and `subscription_status` onto the `companies` row for fast plan-gating.

**Internal plan status mapping:**

| Stripe status | Internal status |
|---|---|
| `active` | `active` |
| `trialing` | `trialing` |
| `past_due` | `past_due` |
| `canceled` / `cancelled` | `cancelled` |
| `unpaid` / `incomplete` | `past_due` |
| `incomplete_expired` | `cancelled` |
| `paused` | `suspended` |

### `customer.subscription.deleted`

Sets `subscriptions.status = 'cancelled'` and `companies.subscription_status = 'cancelled'`.

### `invoice.paid`

Upserts an invoice record into the `invoices` table with amount, currency, status, and a link to the Stripe-hosted invoice URL.

### `invoice.payment_failed`

Upserts the invoice record (as above) and queues a `payment_failed` email to the subscription's billing contact. The email is non-blocking (fire-and-forget).

**All Other Events:**

Logged to `billing_events` with `processed = false`. No further action is taken. This is the recommended Stripe pattern — subscribe only to what you need, log everything.

**Response — 200 OK:**

```json
{ "received": true }
```

Stripe expects a `2xx` response within a few seconds. The handler always returns `200` after logging, even if downstream processing encounters a non-fatal error, to avoid Stripe retrying the event.
