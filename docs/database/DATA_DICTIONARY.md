# PRA Talent Intelligence Platform — Data Dictionary

**Version:** 1.8  
**Database:** Supabase-hosted PostgreSQL  
**Last updated:** 2026-08-09

Tables are organized by the same logical groups as the ERD document. For each table: description, column definitions, keys, indexes, and RLS status.

---

## Group 1: Identity & Auth

---

### `profiles`

Extended identity record for every authenticated user. Created automatically by trigger on `auth.users` insert. One row per user; `id` is the Supabase Auth UUID.

**Migrations:** 0002, 0012 (deleted_at), 0029 (company_id), 0043 (department, is_locked, locked_at, force_password_reset)

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | — | Primary key; equals `auth.users.id` |
| `role` | user_role | NO | 'candidate' | Platform-level role gate for routing and existing RLS |
| `full_name` | text | NO | — | Display name |
| `email` | text | YES | — | Email address; nullable after migration 0040 (phone auth support) |
| `avatar_url` | text | YES | — | URL to profile picture |
| `phone` | text | YES | — | E.164 phone number |
| `company_id` | uuid | YES | — | Direct company association; used for super_admin; candidates are NULL |
| `department` | text | YES | — | User's department or team |
| `is_active` | boolean | NO | true | Whether account is enabled |
| `is_locked` | boolean | NO | false | Hard-locked account; blocks login regardless of is_active |
| `locked_at` | timestamptz | YES | — | Timestamp when the account was locked |
| `force_password_reset` | boolean | NO | false | Cleared once user resets; set on admin-created accounts |
| `last_seen_at` | timestamptz | YES | — | Last activity timestamp |
| `deleted_at` | timestamptz | YES | — | Soft-delete timestamp; NULL = not deleted |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp (maintained by trigger) |

**Primary Key:** `id`  
**Foreign Keys:** `id` → `auth.users(id)` ON DELETE CASCADE; `company_id` → `companies(id)` ON DELETE SET NULL  
**Indexes:** `profiles_role_idx (role)`, `profiles_email_idx (email)`, `profiles_company_id_idx (company_id)` (partial, not null), `profiles_is_locked_idx (is_locked)` (partial, true only)  
**RLS:** Enabled. Users read own row; staff read all; admin has full access.

---

## Group 2: Company & Team

---

### `companies`

Root tenant entity. Each company has one subscription and is the scope boundary for all recruiter-side data.

**Migrations:** 0003, 0012 (is_active, deleted_at), 0019 (pending_owner_id), 0029 (country, timezone, subscription_plan, subscription_status)

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `name` | text | NO | — | Company display name |
| `slug` | text | NO | — | URL-safe unique identifier |
| `logo_url` | text | YES | — | Company logo image URL |
| `website` | text | YES | — | Company website URL |
| `industry` | text | YES | — | Industry classification |
| `company_size` | text | YES | — | Size bucket (e.g., "51-200") |
| `description` | text | YES | — | Company description |
| `headquarters` | text | YES | — | HQ city/address |
| `founded_year` | int | YES | — | Year the company was founded |
| `country` | text | YES | — | Company country |
| `timezone` | text | NO | 'UTC' | IANA timezone string |
| `subscription_plan` | text | NO | 'free' | One of: free, starter, professional, enterprise |
| `subscription_status` | text | NO | 'active' | One of: active, trialing, past_due, cancelled, suspended |
| `is_verified` | boolean | NO | false | Whether PRA staff verified the company |
| `is_active` | boolean | NO | true | Soft-disable toggle |
| `deleted_at` | timestamptz | YES | — | Soft-delete timestamp |
| `created_by` | uuid | YES | — | Profile who created the company |
| `pending_owner_id` | uuid | YES | — | Proposed new owner in an in-flight ownership transfer |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `slug`  
**Foreign Keys:** `created_by` → `profiles(id)` ON DELETE SET NULL; `pending_owner_id` → `recruiters(id)` ON DELETE SET NULL  
**Indexes:** `companies_slug_idx (slug)`, `companies_subscription_plan_idx`, `companies_subscription_status_idx`, `companies_is_active_idx`  
**RLS:** Enabled. Public read. Staff insert. Company scoped update (capability: manage_org_settings); admin full access.

---

### `recruiters`

Links a `profiles` row to a `companies` row with a per-company role. A recruiter IS a profile — same UUID.

**Migrations:** 0003, 0019 (role column replaced is_company_admin)

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | — | Primary key; equals profiles.id |
| `company_id` | uuid | NO | — | Company this recruiter belongs to |
| `job_title` | text | YES | — | Job title within the company |
| `department` | text | YES | — | Department within the company |
| `role` | recruiter_role | NO | 'recruiter' | Per-company role: owner / admin / recruiter / viewer |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `id` → `profiles(id)` ON DELETE CASCADE; `company_id` → `companies(id)` ON DELETE CASCADE  
**Indexes:** `recruiters_company_id_idx (company_id)`, `recruiters_one_owner_per_company (company_id) WHERE role = 'owner'` (unique partial)  
**RLS:** Enabled. Recruiter reads own row and same-company rows. Admin reads all.

---

### `role_capabilities`

Data-driven mapping of `recruiter_role` to capability strings. Checked via `has_capability()` RPC. Add a row to grant a capability; remove it to revoke.

**Migration:** 0019

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `role` | recruiter_role | NO | — | Company-level role (owner/admin/recruiter/viewer) |
| `capability` | text | NO | — | Capability string (e.g., 'manage_billing', 'invite_members') |

**Primary Key:** `(role, capability)`  
**RLS:** Enabled. Public read; no writes via RLS (admin only).

---

### `recruiter_invites`

Token-based teammate invite. The inviter generates a link; the recipient uses the token UUID to accept. No email is sent by this table — the inviter shares the link out-of-band.

**Migration:** 0019

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `company_id` | uuid | NO | — | Company issuing the invite |
| `email` | text | NO | — | Email address of the invitee |
| `role` | recruiter_role | NO | 'recruiter' | Role to assign on acceptance |
| `token` | uuid | NO | uuid_generate_v4() | Unique URL token sent to invitee |
| `invited_by` | uuid | YES | — | Profile who created the invite |
| `status` | text | NO | 'pending' | One of: pending, accepted, revoked, expired |
| `expires_at` | timestamptz | NO | now() + 7 days | Invite expiry timestamp |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `accepted_at` | timestamptz | YES | — | Timestamp when invite was accepted |

**Primary Key:** `id`  
**Unique:** `token`; `(company_id, email) WHERE status = 'pending'` (partial)  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE CASCADE; `invited_by` → `profiles(id)` ON DELETE SET NULL  
**Indexes:** `recruiter_invites_company_idx`, `recruiter_invites_token_idx`, `recruiter_invites_one_pending_per_email`  
**RLS:** Enabled. Requires `has_capability('invite_members')` and same company.

---

### `company_profiles`

Extended brand and culture information for a company's public-facing profile page.

**Migration:** 0048

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_id` | uuid | NO | — | Company this profile belongs to (unique) |
| `about` | text | YES | — | Company about/mission statement |
| `culture` | text | YES | — | Culture and values description |
| `banner_url` | text | YES | — | Banner image URL |
| `website` | text | YES | — | Company website |
| `headquarters` | text | YES | — | HQ location |
| `company_size` | text | YES | — | Size description |
| `founded_year` | integer | YES | — | Year founded |
| `benefits` | text[] | NO | '{}' | List of employee benefits |
| `social_links` | jsonb | NO | '{}' | Map of social network → URL |
| `tech_stack` | text[] | NO | '{}' | Technologies used |
| `is_published` | boolean | NO | false | Whether profile is publicly visible |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `company_id`  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE CASCADE  
**RLS:** Enabled. Public read when `is_published = true`. Company recruiters manage.

---

## Group 3: Job Management

---

### `jobs`

Job postings. Carries a `vector(1536)` embedding for semantic candidate matching. Status drives visibility via RLS.

**Migration:** 0006

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `company_id` | uuid | NO | — | Company posting the job |
| `recruiter_id` | uuid | NO | — | Recruiter who owns the posting |
| `title` | text | NO | — | Job title |
| `slug` | text | NO | — | URL slug (unique per company) |
| `department` | text | YES | — | Department or team |
| `description` | text | NO | — | Full job description |
| `responsibilities` | text[] | YES | — | Bullet list of responsibilities |
| `requirements` | text[] | YES | — | Bullet list of requirements |
| `benefits` | text[] | YES | — | Bullet list of benefits |
| `employment_type` | employment_type | NO | 'full_time' | Type of employment |
| `experience_level` | experience_level | NO | 'mid' | Required experience level |
| `min_experience_years` | numeric(4,1) | YES | 0 | Minimum years of experience |
| `education_requirement` | text | YES | — | Education requirement description |
| `required_skills` | text[] | NO | '{}' | Skills required (GIN-indexed) |
| `nice_to_have_skills` | text[] | YES | '{}' | Optional desirable skills |
| `location` | text | YES | — | Job location |
| `is_remote` | boolean | NO | false | Whether job is remote |
| `salary_min` | numeric(12,2) | YES | — | Minimum salary |
| `salary_max` | numeric(12,2) | YES | — | Maximum salary |
| `salary_currency` | text | YES | 'USD' | Salary currency code |
| `headcount` | int | NO | 1 | Number of open positions |
| `status` | job_status | NO | 'draft' | One of: draft, published, closed, archived |
| `is_archived` | boolean | NO | false | Soft-archive flag |
| `duplicated_from` | uuid | YES | — | Source job if duplicated |
| `embedding` | vector(1536) | YES | — | AI embedding for semantic search |
| `views_count` | int | NO | 0 | Total view counter |
| `applications_count` | int | NO | 0 | Maintained by trigger on applications table |
| `published_at` | timestamptz | YES | — | When the job was published |
| `closes_at` | timestamptz | YES | — | When the job closes |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `(company_id, slug)`  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE CASCADE; `recruiter_id` → `recruiters(id)` ON DELETE SET NULL; `duplicated_from` → `jobs(id)` ON DELETE SET NULL  
**Indexes:** `jobs_company_idx`, `jobs_recruiter_idx`, `jobs_status_idx`, `jobs_skills_idx (required_skills GIN)`, `jobs_embedding_idx (ivfflat, cosine)`, `jobs_title_trgm_idx (title GIN trgm)`, `jobs_location_idx`  
**RLS:** Enabled. Published jobs are public. Staff can manage same-company jobs. Admin sees all.

---

### `saved_jobs`

Candidate bookmarks on internal PRA-hosted job listings.

**Migration:** 0004 (created), 0006 (FK wired)

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Candidate who saved the job |
| `job_id` | uuid | NO | — | Job that was saved |
| `created_at` | timestamptz | NO | now() | When the job was saved |

**Primary Key:** `id`  
**Unique:** `(candidate_id, job_id)`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE; `job_id` → `jobs(id)` ON DELETE CASCADE  
**Indexes:** `saved_jobs_job_idx`, `saved_jobs_candidate_idx`  
**RLS:** Enabled. Candidate owns their own rows.

---

### `candidate_search_history`

Deduplicated log of a candidate's job searches. Upserted via `upsert_search_history()` RPC which increments `search_count` atomically.

**Migration:** 0036

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `query_key` | text | NO | — | Deduplication key (hash of search params) |
| `query` | text | NO | '' | Human-readable query string |
| `keywords` | text | NO | '' | Keyword portion of the search |
| `location` | text | NO | '' | Location filter |
| `experience_level` | text | NO | 'any' | Experience level filter |
| `filters` | text[] | NO | '{}' | Additional filter tags |
| `search_source` | text | NO | 'manual' | Origin of the search |
| `search_count` | integer | NO | 1 | Number of times this search was run |
| `last_used_at` | timestamptz | NO | now() | Last time this search was used |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Unique:** `(candidate_id, query_key)`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `candidate_search_history_candidate_idx (candidate_id, last_used_at DESC)`  
**RLS:** Enabled. Candidate owns; admin reads all.

---

### `candidate_saved_searches`

Named search presets. Candidates create these to re-run searches quickly and optionally attach job alerts.

**Migration:** 0036

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `name` | text | NO | — | Human-readable name for the search |
| `query` | text | NO | '' | Query string |
| `keywords` | text | NO | '' | Keywords |
| `location` | text | NO | '' | Location filter |
| `experience_level` | text | NO | 'any' | Experience level filter |
| `filters` | text[] | NO | '{}' | Additional filters |
| `platforms` | text[] | NO | '{google,linkedin,...}' | Target job board platforms |
| `is_active` | boolean | NO | true | Whether this saved search is active |
| `alert_enabled` | boolean | NO | false | Whether a job alert is attached |
| `alert_frequency` | text | NO | 'weekly' | One of: instant, daily, weekly |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `candidate_saved_searches_candidate_idx`, `candidate_saved_searches_alert_idx (candidate_id) WHERE alert_enabled = true`  
**RLS:** Enabled. Candidate owns; admin reads all.

---

### `candidate_job_alerts`

Scheduled alert definitions that drive the job-alert cron worker. May be derived from a saved search.

**Migration:** 0036

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `saved_search_id` | uuid | YES | — | Source saved search if created from one |
| `name` | text | NO | — | Alert name |
| `query` | text | NO | '' | Search query |
| `keywords` | text | NO | '' | Keywords |
| `location` | text | NO | '' | Location filter |
| `experience_level` | text | NO | 'any' | Experience level filter |
| `filters` | text[] | NO | '{}' | Additional filters |
| `platforms` | text[] | NO | '{google,...}' | Target platforms |
| `frequency` | text | NO | 'weekly' | One of: instant, daily, weekly |
| `min_ats_score` | integer | NO | 0 | Minimum ATS score threshold for alerts |
| `salary_min` | integer | YES | — | Minimum salary filter |
| `salary_max` | integer | YES | — | Maximum salary filter |
| `is_active` | boolean | NO | true | Whether the alert is active |
| `last_sent_at` | timestamptz | YES | — | When the last alert email was sent |
| `next_send_at` | timestamptz | YES | — | Scheduled next send time |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE; `saved_search_id` → `candidate_saved_searches(id)` ON DELETE SET NULL  
**Indexes:** `candidate_job_alerts_candidate_idx`, `candidate_job_alerts_active_next_idx (next_send_at) WHERE is_active = true`  
**RLS:** Enabled. Candidate owns; admin reads all.

---

### `candidate_recent_views`

Tracks which PRA-hosted jobs a candidate has viewed. Deduplicated; `view_count` increments on repeat visits.

**Migration:** 0036

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `candidate_id` | uuid | NO | — | Viewing candidate |
| `job_id` | uuid | NO | — | Job that was viewed |
| `view_count` | integer | NO | 1 | Number of times this job was viewed |
| `viewed_at` | timestamptz | NO | now() | Last view timestamp |
| `created_at` | timestamptz | NO | now() | First view timestamp |

**Primary Key:** `id`  
**Unique:** `(candidate_id, job_id)`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE; `job_id` → `jobs(id)` ON DELETE CASCADE  
**Indexes:** `candidate_recent_views_candidate_idx (candidate_id, viewed_at DESC)`  
**RLS:** Enabled. Candidate owns; admin reads all.

---

### `candidate_ai_recommendations`

Cached AI career recommendation cards. Records expire after a TTL (typically 24 hours); the application checks `expires_at` before serving.

**Migration:** 0036

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `recommendation_type` | text | NO | — | Category of recommendation |
| `title` | text | NO | — | Recommendation headline |
| `description` | text | NO | '' | Recommendation detail |
| `confidence_score` | integer | NO | 0 | AI confidence 0–100 |
| `metadata` | jsonb | NO | '{}' | Additional structured data |
| `position_order` | integer | NO | 0 | Display order |
| `generated_at` | timestamptz | NO | now() | When the recommendation was generated |
| `expires_at` | timestamptz | NO | — | Cache expiry timestamp |
| `is_accepted` | boolean | YES | — | Whether candidate accepted the recommendation |
| `accepted_at` | timestamptz | YES | — | When candidate accepted it |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `candidate_ai_recs_lookup_idx (candidate_id, recommendation_type)`, `candidate_ai_recs_expiry_idx (candidate_id, expires_at)`  
**RLS:** Enabled. Candidate owns; admin reads all.

---

## Group 4: Candidate & Applications

---

### `candidates`

Core job-seeker profile. One row per candidate user; `id` is the same UUID as `profiles.id`.

**Migrations:** 0004, 0046 (portfolio_is_public, portfolio_slug)

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | — | Primary key; equals profiles.id |
| `headline` | text | YES | — | Professional headline |
| `summary` | text | YES | — | Career summary |
| `current_position` | text | YES | — | Current job title |
| `current_company` | text | YES | — | Current employer |
| `years_of_experience` | numeric(4,1) | YES | 0 | Total years of professional experience |
| `expected_salary_min` | numeric(12,2) | YES | — | Minimum expected salary |
| `expected_salary_max` | numeric(12,2) | YES | — | Maximum expected salary |
| `salary_currency` | text | YES | 'USD' | Currency for salary expectations |
| `location` | text | YES | — | Current location |
| `address` | text | YES | — | Street address |
| `city` | text | YES | — | City |
| `country` | text | YES | — | Country |
| `date_of_birth` | date | YES | — | Date of birth |
| `nationality` | text | YES | — | Nationality |
| `willing_to_relocate` | boolean | YES | false | Relocation openness |
| `notice_period_days` | int | YES | — | Notice period in days |
| `linkedin_url` | text | YES | — | LinkedIn profile URL |
| `github_url` | text | YES | — | GitHub profile URL |
| `portfolio_url` | text | YES | — | Portfolio website URL |
| `website_url` | text | YES | — | Personal website URL |
| `primary_resume_id` | uuid | YES | — | Currently active resume |
| `profile_completion_percent` | int | NO | 0 | Computed profile completeness 0–100 |
| `is_open_to_work` | boolean | NO | true | Open-to-work signal |
| `portfolio_is_public` | boolean | NO | false | Whether portfolio page is publicly accessible |
| `portfolio_slug` | text | YES | — | URL slug for public portfolio page |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `portfolio_slug` (when not null)  
**Foreign Keys:** `id` → `profiles(id)` ON DELETE CASCADE; `primary_resume_id` → `resumes(id)` ON DELETE SET NULL (deferred FK added in 0005)  
**Indexes:** `candidates_location_idx`, `candidates_years_experience_idx`, `candidates_portfolio_slug_idx (portfolio_slug) WHERE not null`  
**RLS:** Enabled. Candidate owns; staff can read.

---

### `candidate_experience`

Work history entries for a candidate.

**Migration:** 0004

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `company_name` | text | NO | — | Employer name |
| `job_title` | text | NO | — | Role held |
| `location` | text | YES | — | Work location |
| `employment_type` | employment_type | YES | — | Type of employment |
| `start_date` | date | YES | — | Start date |
| `end_date` | date | YES | — | End date (null if current) |
| `is_current` | boolean | NO | false | Whether this is the current position |
| `description` | text | YES | — | Role description / achievements |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `candidate_experience_candidate_idx`  
**RLS:** Enabled. Candidate owns; staff read.

---

### `candidate_education`

Educational background entries.

**Migration:** 0004

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `institution` | text | NO | — | School or university name |
| `degree` | text | YES | — | Degree type (e.g., "Bachelor's") |
| `field_of_study` | text | YES | — | Major or field |
| `start_date` | date | YES | — | Start date |
| `end_date` | date | YES | — | End date |
| `grade` | text | YES | — | Grade or GPA |
| `description` | text | YES | — | Additional details |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `candidate_education_candidate_idx`  
**RLS:** Enabled. Candidate owns; staff read.

---

### `candidate_skills`

Skill entries with proficiency. AI-extracted skills are flagged. Unique per candidate+skill_name.

**Migration:** 0004

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `skill_name` | text | NO | — | Skill name |
| `proficiency` | proficiency_level | YES | 'intermediate' | One of: beginner, intermediate, advanced, expert |
| `years_experience` | numeric(4,1) | YES | — | Years of experience with this skill |
| `is_ai_extracted` | boolean | NO | false | Whether extracted by AI from a resume |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Unique:** `(candidate_id, skill_name)`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `candidate_skills_candidate_idx`, `candidate_skills_name_idx (skill_name GIN trgm)`  
**RLS:** Enabled. Candidate owns; staff read.

---

### `candidate_certificates`

Professional certification records.

**Migration:** 0004

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `name` | text | NO | — | Certificate name |
| `issuing_organization` | text | YES | — | Organization that issued the certificate |
| `issue_date` | date | YES | — | Date issued |
| `expiry_date` | date | YES | — | Expiry date (null if no expiry) |
| `credential_id` | text | YES | — | Certificate credential ID |
| `credential_url` | text | YES | — | Verification URL |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `candidate_certificates_candidate_idx`  
**RLS:** Enabled. Candidate owns; staff read.

---

### `candidate_languages`

Language proficiency records. Unique per candidate+language.

**Migration:** 0004

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `language` | text | NO | — | Language name |
| `proficiency` | language_proficiency | NO | 'conversational' | One of: basic, conversational, fluent, native |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Unique:** `(candidate_id, language)`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**RLS:** Enabled. Candidate owns; staff read.

---

### `candidate_projects`

Portfolio project entries attached to a candidate profile.

**Migration:** 0004

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `name` | text | NO | — | Project name |
| `description` | text | YES | — | Project description |
| `project_url` | text | YES | — | Project live URL or repository |
| `technologies` | text[] | YES | — | Technologies used |
| `start_date` | date | YES | — | Project start date |
| `end_date` | date | YES | — | Project end date |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `candidate_projects_candidate_idx`  
**RLS:** Enabled. Candidate owns; staff read.

---

### `candidate_achievements`

Awards and achievements attached to a candidate profile.

**Migration:** 0004

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `title` | text | NO | — | Achievement title |
| `description` | text | YES | — | Description |
| `achieved_on` | date | YES | — | Date of achievement |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**RLS:** Enabled. Candidate owns; staff read.

---

### `candidate_social_links`

Platform-specific social profile URLs. Unique per candidate+platform.

**Migration:** 0004

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `platform` | text | NO | — | Platform name (e.g., "twitter", "behance") |
| `url` | text | NO | — | Profile URL |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Unique:** `(candidate_id, platform)`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**RLS:** Enabled. Candidate owns; staff read.

---

### `resumes`

Uploaded resume files with AI parse results and a 1536-dimension vector embedding for semantic matching.

**Migrations:** 0005, 0028 (parse_error_code)

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `file_name` | text | NO | — | Original filename |
| `file_url` | text | YES | null | Stored signed URL — **nullable since migration 0050**. Never served to UI; fresh signed URL generated from `file_path` at render time. |
| `file_path` | text | NO | — | Storage bucket path in the `resumes` private bucket — format `{user_id}/{uuid}_{timestamp}.{ext}` since v1.9 |
| `file_type` | text | YES | — | MIME type |
| `file_size_bytes` | bigint | YES | — | File size in bytes |
| `raw_text` | text | YES | — | Extracted plain text |
| `parsed_data` | jsonb | YES | — | Structured AI-parsed data |
| `parse_status` | text | NO | 'pending' | One of: pending, processing, completed, completed_partial, failed |
| `parse_error` | text | YES | — | Human-readable parse error message |
| `parse_error_code` | text | YES | — | Machine-readable error code |
| `embedding` | vector(1536) | YES | — | AI text embedding for cosine similarity |
| `is_primary` | boolean | NO | false | Whether this is the candidate's active resume |
| `uploaded_at` | timestamptz | NO | now() | Upload timestamp |
| `parsed_at` | timestamptz | YES | — | When AI parsing completed |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `resumes_candidate_idx`, `resumes_embedding_idx (embedding ivfflat cosine, lists=100)`, `resumes_candidate_id_idx`  
**RLS:** Enabled. Candidate owns; staff read.

---

### `cover_letters`

Uploaded or text-based cover letters associated with a candidate.

**Migration:** 0005

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `file_name` | text | YES | — | Filename (null for text-only) |
| `file_url` | text | YES | — | File URL (null for text-only) |
| `file_path` | text | YES | — | Storage path (null for text-only) |
| `content` | text | YES | — | Text content |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**RLS:** Enabled. Candidate owns; staff read.

---

### `portfolio_items`

Portfolio media items displayed on the candidate's public portfolio page.

**Migrations:** 0005, 0046 (type, technologies, thumbnail_url, display_order)

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `title` | text | NO | — | Item title |
| `description` | text | YES | — | Item description |
| `file_url` | text | YES | — | Uploaded file URL |
| `link_url` | text | YES | — | External link URL |
| `type` | text | NO | 'project' | One of: project, publication, design, other |
| `technologies` | text[] | NO | '{}' | Technologies used |
| `thumbnail_url` | text | YES | — | Thumbnail image URL |
| `display_order` | integer | NO | 0 | Sort order on portfolio page |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**RLS:** Enabled. Candidate owns; staff read; public read when `candidates.portfolio_is_public = true`.

---

### `resume_drafts`

Candidate-owned resume builder working copies. A draft has sections (see `resume_draft_sections`) and can be finalized to PDF/DOCX.

**Migrations:** 0017, 0020 (version), 0044 (template, job_description_text, archived)

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `title` | text | NO | 'My Resume' | User-assigned name for the draft |
| `status` | resume_draft_status | NO | 'draft' | One of: draft, finalized |
| `source_resume_id` | uuid | YES | — | Uploaded resume used as import source |
| `finalized_pdf_url` | text | YES | — | URL of exported PDF |
| `finalized_docx_url` | text | YES | — | URL of exported DOCX |
| `version` | int | NO | 1 | Monotonic version counter incremented on section changes |
| `template` | text | NO | 'modern' | Visual template identifier |
| `job_description_text` | text | YES | — | Target job description for AI tailoring |
| `archived` | boolean | NO | false | Soft-archive flag |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE; `source_resume_id` → `resumes(id)` ON DELETE SET NULL  
**Indexes:** `resume_drafts_candidate_idx`  
**RLS:** Enabled. Candidate owns; staff read.

---

### `resume_draft_sections`

Individual sections of a resume draft. Each draft has at most one row per section type. Content schema varies by `section_type`.

**Migration:** 0017

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `draft_id` | uuid | NO | — | Parent draft |
| `section_type` | resume_section_type | NO | — | Section category (e.g., summary, experience) |
| `content` | jsonb | NO | '{}' | Accepted section content; shape depends on section_type |
| `ai_suggestion` | jsonb | YES | — | Pending AI-generated suggestion not yet reviewed |
| `status` | resume_section_status | NO | 'empty' | One of: empty, ai_suggested, accepted, edited |
| `order_index` | int | NO | 0 | Section display order in the draft |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `(draft_id, section_type)`  
**Foreign Keys:** `draft_id` → `resume_drafts(id)` ON DELETE CASCADE  
**Indexes:** `resume_draft_sections_draft_idx`  
**RLS:** Enabled. Candidate owns via draft membership check; staff read.

---

### `resume_draft_versions`

Point-in-time content snapshots of a resume draft. Used for version restore without full diff storage.

**Migration:** 0044

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `draft_id` | uuid | NO | — | Parent draft |
| `candidate_id` | uuid | NO | — | Owning candidate (for RLS) |
| `label` | text | YES | — | Human-readable version label |
| `sections_snapshot` | jsonb | NO | '[]' | Full snapshot of all section rows at save time |
| `template` | text | NO | 'modern' | Template at time of snapshot |
| `created_at` | timestamptz | NO | now() | Snapshot timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `draft_id` → `resume_drafts(id)` ON DELETE CASCADE; `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `resume_draft_versions_draft_created (draft_id, created_at DESC)`  
**RLS:** Enabled. Candidate owns; staff read.

---

### `resume_suggestion_events`

Append-only audit log of every AI writing suggestion shown to a candidate. Immutable except `outcome` and `decided_at` (enforced by trigger).

**Migration:** 0020

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Owning candidate |
| `source` | text | NO | — | Tool that generated the suggestion (unconstrained; validated at app layer) |
| `draft_id` | uuid | YES | — | Associated resume draft (if applicable) |
| `section_id` | uuid | YES | — | Specific section within the draft |
| `suggestion_type` | text | NO | — | Type of suggestion (unconstrained) |
| `target_id` | uuid | YES | — | Non-FK reference to target row (varies by suggestion_type) |
| `before_value` | jsonb | YES | — | Content before the suggestion was applied |
| `after_value` | jsonb | NO | — | The suggested new content |
| `outcome` | text | NO | 'pending' | One of: pending, accepted, rejected |
| `ai_model` | text | YES | — | AI model that generated the suggestion |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `decided_at` | timestamptz | YES | — | When the candidate made a decision |

**Primary Key:** `id`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE; `draft_id` → `resume_drafts(id)` ON DELETE CASCADE; `section_id` → `resume_draft_sections(id)` ON DELETE CASCADE  
**Indexes:** `resume_suggestion_events_candidate_idx`, `resume_suggestion_events_draft_idx`, `resume_suggestion_events_outcome_idx (candidate_id, outcome)`  
**RLS:** Enabled. Candidate owns; admin reads all.

---

### `applications`

Job application records linking a candidate, a job, and a resume. Unique per (job, candidate) pair.

**Migration:** 0007

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `job_id` | uuid | NO | — | Job applied to |
| `candidate_id` | uuid | NO | — | Applying candidate |
| `resume_id` | uuid | NO | — | Resume submitted with application |
| `cover_letter_id` | uuid | YES | — | Optional cover letter |
| `status` | application_status | NO | 'submitted' | Lifecycle stage |
| `status_reason` | text | YES | — | Human-readable reason for current status |
| `applied_at` | timestamptz | NO | now() | Application submission timestamp |
| `updated_at` | timestamptz | NO | now() | Last status change timestamp |

**Primary Key:** `id`  
**Unique:** `(job_id, candidate_id)`  
**Foreign Keys:** `job_id` → `jobs(id)` ON DELETE CASCADE; `candidate_id` → `candidates(id)` ON DELETE CASCADE; `resume_id` → `resumes(id)` ON DELETE RESTRICT; `cover_letter_id` → `cover_letters(id)` ON DELETE SET NULL  
**Indexes:** `applications_job_idx`, `applications_candidate_idx`, `applications_status_idx`, `applications_applied_at_idx`  
**RLS:** Enabled. Candidate reads/inserts own; company staff reads applications for their jobs; admin sees all.

---

### `ats_scores`

AI-generated ATS compatibility scores for a resume. Multiple scores can exist per resume (e.g., one per ATS run).

**Migration:** 0007

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `resume_id` | uuid | NO | — | Scored resume |
| `candidate_id` | uuid | NO | — | Owning candidate (denormalized for RLS) |
| `overall_score` | int | NO | — | Overall ATS score 0–100 |
| `experience_score` | int | YES | — | Experience section score 0–100 |
| `skills_score` | int | YES | — | Skills section score 0–100 |
| `formatting_score` | int | YES | — | Formatting quality score 0–100 |
| `education_score` | int | YES | — | Education section score 0–100 |
| `achievements_score` | int | YES | — | Achievements section score 0–100 |
| `keyword_density` | jsonb | YES | — | Map of keyword → frequency |
| `recruiter_readability_score` | int | YES | — | Readability for human reviewers 0–100 |
| `weaknesses` | text[] | YES | — | Identified weaknesses |
| `suggestions` | text[] | YES | — | Improvement suggestions |
| `ai_model` | text | YES | — | AI model used |
| `ai_raw_response` | jsonb | YES | — | Full raw AI response |
| `created_at` | timestamptz | NO | now() | Score generation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `resume_id` → `resumes(id)` ON DELETE CASCADE; `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `ats_scores_resume_idx`, `ats_scores_candidate_idx`  
**RLS:** Enabled. Candidate reads own; staff reads all.

---

### `job_matches`

AI-generated match scores between a resume and a job posting. Unique per (job, candidate) pair.

**Migration:** 0007

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `job_id` | uuid | NO | — | Matched job |
| `candidate_id` | uuid | NO | — | Matched candidate |
| `resume_id` | uuid | NO | — | Resume used for matching |
| `match_score` | numeric(5,2) | NO | — | Overall match score 0–100 |
| `semantic_similarity` | numeric(6,5) | YES | — | Cosine similarity between embeddings 0–1 |
| `strengths` | text[] | YES | — | Matching strengths |
| `weaknesses` | text[] | YES | — | Match gaps |
| `missing_skills` | text[] | YES | — | Skills in job not found in resume |
| `recommended_skills` | text[] | YES | — | Skills recommended for improvement |
| `match_reasons` | text[] | YES | — | Explanations for the score |
| `interview_probability` | numeric(5,2) | YES | — | Estimated probability of interview 0–100 |
| `ai_summary` | text | YES | — | Natural-language match summary |
| `ai_model` | text | YES | — | AI model used |
| `created_at` | timestamptz | NO | now() | Match generation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `(job_id, candidate_id)`  
**Foreign Keys:** `job_id` → `jobs(id)` ON DELETE CASCADE; `candidate_id` → `candidates(id)` ON DELETE CASCADE; `resume_id` → `resumes(id)` ON DELETE CASCADE  
**Indexes:** `job_matches_job_idx`, `job_matches_candidate_idx`, `job_matches_score_idx (match_score DESC)`  
**RLS:** Enabled. Candidate reads own; staff reads matches for their company's jobs; admin sees all.

---

### `screening_results`

Deep AI screening of a specific application. One row per application.

**Migration:** 0007

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `application_id` | uuid | NO | — | Screened application (unique) |
| `overall_score` | int | YES | — | Overall fit score 0–100 |
| `experience_score` | int | YES | — | Experience fit 0–100 |
| `skill_match_score` | int | YES | — | Skill alignment 0–100 |
| `education_match_score` | int | YES | — | Education fit 0–100 |
| `culture_fit_score` | int | YES | — | Culture fit estimate 0–100 |
| `leadership_score` | int | YES | — | Leadership signal 0–100 |
| `communication_score` | int | YES | — | Communication signal 0–100 |
| `technical_score` | int | YES | — | Technical depth 0–100 |
| `ai_summary` | text | YES | — | Natural-language screening summary |
| `interview_recommendation` | hiring_recommendation | YES | — | AI recommendation |
| `rank_position` | int | YES | — | Rank among applicants for this job |
| `ai_model` | text | YES | — | AI model used |
| `created_at` | timestamptz | NO | now() | Screening timestamp |

**Primary Key:** `id`  
**Unique:** `application_id`  
**Foreign Keys:** `application_id` → `applications(id)` ON DELETE CASCADE  
**Indexes:** `screening_results_application_idx`  
**RLS:** Enabled. Staff write/read; candidates read their own.

---

## Group 5: Communication

---

### `message_threads`

One thread per recruiter–candidate pair within a company context. Tracks unread counts per side.

**Migration:** 0049

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_id` | uuid | NO | — | Company context |
| `recruiter_id` | uuid | NO | — | Recruiter participant |
| `candidate_id` | uuid | NO | — | Candidate participant |
| `job_id` | uuid | YES | — | Associated job (optional context) |
| `subject` | text | YES | — | Thread subject line |
| `last_message_at` | timestamptz | NO | now() | Timestamp of the most recent message |
| `recruiter_unread_count` | int | NO | 0 | Unread message count for recruiter |
| `candidate_unread_count` | int | NO | 0 | Unread message count for candidate |
| `created_at` | timestamptz | NO | now() | Thread creation timestamp |

**Primary Key:** `id`  
**Unique:** `(recruiter_id, candidate_id)`  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE CASCADE; `recruiter_id` → `recruiters(id)` ON DELETE CASCADE; `candidate_id` → `candidates(id)` ON DELETE CASCADE; `job_id` → `jobs(id)` ON DELETE SET NULL  
**Indexes:** `message_threads_recruiter_idx (recruiter_id, last_message_at DESC)`, `message_threads_candidate_idx (candidate_id, last_message_at DESC)`, `message_threads_company_idx`  
**RLS:** Enabled. Recruiter owns; candidate select-only on their threads.

---

### `messages`

Individual messages within a thread. `sender_id` is the auth UUID of the sender.

**Migration:** 0049

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `thread_id` | uuid | NO | — | Parent thread |
| `sender_role` | text | NO | — | One of: recruiter, candidate |
| `sender_id` | uuid | NO | — | Auth UUID of sender (no FK; matches recruiter.id or candidate.id) |
| `body` | text | NO | — | Message body (must be non-empty) |
| `is_read` | boolean | NO | false | Whether the recipient has read this message |
| `created_at` | timestamptz | NO | now() | Message send timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `thread_id` → `message_threads(id)` ON DELETE CASCADE  
**Indexes:** `messages_thread_idx (thread_id, created_at)`  
**RLS:** Enabled. Thread participants (recruiter or candidate) have full access.

---

### `notifications`

In-app notification records for all user types.

**Migrations:** 0008, 0037 (read_at, data columns; extended enum)

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `user_id` | uuid | NO | — | Recipient user |
| `type` | notification_type | NO | — | Notification category |
| `title` | text | NO | — | Short notification title |
| `message` | text | NO | — | Notification body |
| `link` | text | YES | — | Deep link URL |
| `is_read` | boolean | NO | false | Whether the notification has been seen |
| `read_at` | timestamptz | YES | — | Timestamp when notification was marked read |
| `metadata` | jsonb | YES | — | Additional structured data |
| `data` | jsonb | NO | '{}' | Extended payload data |
| `created_at` | timestamptz | NO | now() | Creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `user_id` → `profiles(id)` ON DELETE CASCADE  
**Indexes:** `notifications_user_idx (user_id, is_read)`, `notifications_created_idx (created_at DESC)`, `notifications_user_unread_idx (user_id, created_at DESC) WHERE is_read = false`  
**RLS:** Enabled. User reads and updates own; system insert allowed.

---

### `notification_preferences`

Per-user opt-in/opt-out settings for each notification type. One row per user.

**Migration:** 0037

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | Owning user (unique) |
| `job_alert` | boolean | NO | true | Receive job alert notifications |
| `job_match` | boolean | NO | true | Receive job match notifications |
| `interview` | boolean | NO | true | Receive interview notifications |
| `offer` | boolean | NO | true | Receive offer notifications |
| `digest` | boolean | NO | true | Receive weekly digest |
| `ai_rec` | boolean | NO | true | Receive AI recommendation notifications |
| `email_alerts` | boolean | NO | true | Receive email versions of alerts |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `user_id`  
**Foreign Keys:** `user_id` → `profiles(id)` ON DELETE CASCADE  
**RLS:** Enabled. User owns; admin reads all.

---

## Group 6: Intelligence & Hiring

---

### `interviews`

Scheduled interviews linked to an application. Stores feedback, STAR evaluation, and competency ratings inline as jsonb.

**Migration:** 0008

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `application_id` | uuid | NO | — | Parent application |
| `scheduled_at` | timestamptz | NO | — | When the interview is scheduled |
| `duration_minutes` | int | NO | 45 | Expected duration in minutes |
| `interview_type` | interview_type | NO | 'video' | One of: phone, video, onsite, technical, panel, final |
| `location_or_link` | text | YES | — | Physical location or video link |
| `interviewer_ids` | uuid[] | YES | '{}' | Array of interviewer profile UUIDs |
| `status` | interview_status | NO | 'scheduled' | One of: scheduled, completed, cancelled, no_show, rescheduled |
| `feedback` | text | YES | — | Free-text interview feedback |
| `star_evaluation` | jsonb | YES | — | Structured STAR method evaluation |
| `competency_ratings` | jsonb | YES | — | Per-competency rating map |
| `hiring_recommendation` | hiring_recommendation | YES | — | Interviewer's hire recommendation |
| `created_by` | uuid | YES | — | Profile who created the interview |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `application_id` → `applications(id)` ON DELETE CASCADE; `created_by` → `profiles(id)` ON DELETE SET NULL  
**Indexes:** `interviews_application_idx`, `interviews_scheduled_idx (scheduled_at)`  
**RLS:** Enabled. Staff full management; candidate read-only on their applications.

---

### `interview_questions`

AI-generated or manually created question bank per job.

**Migration:** 0008

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `job_id` | uuid | NO | — | Associated job |
| `category` | text | NO | — | One of: technical, behavioral, situational, case_study |
| `question` | text | NO | — | The interview question |
| `expected_answer` | text | YES | — | Model expected answer |
| `evaluation_criteria` | text | YES | — | How to score the answer |
| `created_at` | timestamptz | NO | now() | Creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `job_id` → `jobs(id)` ON DELETE CASCADE  
**Indexes:** `interview_questions_job_idx`  
**RLS:** Enabled. Staff only.

---

### `offers`

Formal job offer records. Unique per (job, candidate) pair.

**Migration:** 0049

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_id` | uuid | NO | — | Issuing company |
| `job_id` | uuid | NO | — | Job the offer is for |
| `candidate_id` | uuid | NO | — | Candidate receiving the offer |
| `recruiter_id` | uuid | NO | — | Recruiter who created the offer |
| `offer_title` | text | NO | — | Position title in the offer |
| `salary_min` | integer | YES | — | Offered salary minimum |
| `salary_max` | integer | YES | — | Offered salary maximum |
| `currency` | text | NO | 'USD' | Salary currency code |
| `start_date` | date | YES | — | Proposed start date |
| `expiry_date` | date | YES | — | Offer expiry date |
| `offer_letter` | text | YES | — | Full offer letter text |
| `status` | text | NO | 'pending' | One of: pending, accepted, declined, expired, withdrawn |
| `candidate_note` | text | YES | — | Note from candidate on acceptance/decline |
| `sent_at` | timestamptz | NO | now() | When the offer was sent |
| `responded_at` | timestamptz | YES | — | When the candidate responded |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Unique:** `(job_id, candidate_id)`  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE CASCADE; `job_id` → `jobs(id)` ON DELETE CASCADE; `candidate_id` → `candidates(id)` ON DELETE CASCADE; `recruiter_id` → `recruiters(id)` ON DELETE CASCADE  
**Indexes:** `offers_candidate_idx (candidate_id, status)`, `offers_company_idx (company_id, status)`, `offers_job_idx`  
**RLS:** Enabled. Company recruiters manage; candidates view and respond to their own.

---

### `offer_templates`

Reusable offer letter templates per company.

**Migration:** 0049

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_id` | uuid | NO | — | Owning company |
| `name` | text | NO | — | Template name |
| `body` | text | NO | — | Template body text |
| `created_at` | timestamptz | NO | now() | Creation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE CASCADE  
**RLS:** Enabled. Company recruiters manage.

---

### `talent_pool`

Recruiter-curated lists of candidates saved to a company's talent pool. Unique per (candidate, company) pair.

**Migration:** 0008

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `candidate_id` | uuid | NO | — | Pooled candidate |
| `saved_by` | uuid | NO | — | Profile who added the candidate |
| `company_id` | uuid | NO | — | Company's talent pool |
| `tags` | text[] | YES | '{}' | Custom tags |
| `notes` | text | YES | — | Internal notes |
| `is_favorite` | boolean | NO | false | Starred/favorite flag |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Unique:** `(candidate_id, company_id)`  
**Foreign Keys:** `candidate_id` → `candidates(id)` ON DELETE CASCADE; `saved_by` → `profiles(id)` ON DELETE CASCADE; `company_id` → `companies(id)` ON DELETE CASCADE  
**Indexes:** `talent_pool_company_idx`, `talent_pool_candidate_idx`  
**RLS:** Enabled. Company-scoped staff access.

---

### `saved_candidates`

Recruiter-level bookmarks on candidate profiles (separate from the company talent pool).

**Migration:** 0048

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `recruiter_id` | uuid | NO | — | Recruiter who saved the candidate |
| `candidate_id` | uuid | NO | — | Saved candidate |
| `notes` | text | YES | — | Private notes |
| `tags` | text[] | NO | '{}' | Custom tags |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Unique:** `(recruiter_id, candidate_id)`  
**Foreign Keys:** `recruiter_id` → `recruiters(id)` ON DELETE CASCADE; `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `saved_candidates_recruiter_idx (recruiter_id, created_at DESC)`  
**RLS:** Enabled. Recruiter profile assertion.

---

### `recruiter_candidate_labels`

Color-coded labels a recruiter applies to a candidate profile within their context.

**Migration:** 0048

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `recruiter_id` | uuid | NO | — | Labelling recruiter |
| `candidate_id` | uuid | NO | — | Labelled candidate |
| `label` | text | NO | — | Label text |
| `color` | text | NO | '#6366f1' | Hex color for the label |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |

**Primary Key:** `id`  
**Unique:** `(recruiter_id, candidate_id, label)`  
**Foreign Keys:** `recruiter_id` → `recruiters(id)` ON DELETE CASCADE; `candidate_id` → `candidates(id)` ON DELETE CASCADE  
**Indexes:** `rcl_recruiter_candidate_idx (recruiter_id, candidate_id)`  
**RLS:** Enabled. Recruiter profile assertion.

---

## Group 7: AI Workspace

---

### `ai_workspace_resumes`

One active resume text context per user for the Global AI Workspace. Replaced on new upload (upsert on `user_id`).

**Migration:** 0042

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | Owning auth user (unique) |
| `file_name` | text | YES | — | Original filename if uploaded |
| `raw_text` | text | NO | — | Extracted or pasted resume text |
| `parsed_json` | jsonb | YES | — | AI-structured parse result (null until AI parse completes) |
| `source` | text | NO | 'paste' | One of: paste, upload |
| `created_at` | timestamptz | NO | now() | Row creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `user_id`  
**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE  
**RLS:** Enabled. User owns only their own row.

---

### `ai_cover_letters`

Saved AI-generated cover letter projects.

**Migration:** 0042

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | Owning auth user |
| `title` | text | NO | 'Untitled Cover Letter' | Project title |
| `company_name` | text | YES | — | Target company |
| `position` | text | YES | — | Target role |
| `hiring_manager` | text | YES | — | Hiring manager name |
| `tone` | text | YES | — | One of: professional, enthusiastic, executive, conversational |
| `length` | text | YES | — | One of: short, medium, long |
| `job_description` | text | YES | — | Job description used as context |
| `result_json` | jsonb | NO | — | Full CoverLetterResult structure |
| `is_favorite` | boolean | NO | false | Starred flag |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE  
**Indexes:** `idx_ai_cover_letters_user_id (user_id, created_at DESC)`  
**RLS:** Enabled. User owns only their own rows.

---

### `ai_interview_sessions`

Saved AI interview preparation session results.

**Migration:** 0042

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | Owning auth user |
| `title` | text | NO | 'Untitled Session' | Session title |
| `position` | text | YES | — | Target job title |
| `company` | text | YES | — | Target company |
| `experience_level` | text | YES | — | Experience level context |
| `job_description` | text | YES | — | Job description context |
| `result_json` | jsonb | NO | — | Full GuestInterviewResult structure |
| `is_favorite` | boolean | NO | false | Starred flag |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE  
**Indexes:** `idx_ai_interview_sessions_user_id (user_id, created_at DESC)`  
**RLS:** Enabled. User owns only their own rows.

---

### `ai_career_reports`

Saved AI career gap analysis and path reports.

**Migration:** 0042

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | Owning auth user |
| `title` | text | NO | 'Career Report' | Report title |
| `current_job_role` | text | YES | — | User's current role at report time |
| `target_role` | text | YES | — | Target role at report time |
| `result_json` | jsonb | NO | — | Full GuestCareerResult structure |
| `is_favorite` | boolean | NO | false | Starred flag |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE  
**Indexes:** `idx_ai_career_reports_user_id (user_id, created_at DESC)`  
**RLS:** Enabled. User owns only their own rows.

---

### `ai_salary_estimates`

AI-generated salary estimate results. Each row is one query result; multiple estimates per user are allowed.

**Migration:** 0045

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | Owning auth user |
| `target_role` | text | NO | — | Role queried |
| `location` | text | YES | — | Location context |
| `years_experience` | integer | YES | — | Experience level context |
| `result` | jsonb | NO | — | Full AI salary estimate result |
| `created_at` | timestamptz | NO | now() | Query timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE  
**Indexes:** `idx_salary_estimates_user_id (user_id, created_at DESC)`  
**RLS:** Enabled. User owns only their own rows.

---

### `ai_linkedin_suggestions`

Saved AI LinkedIn section optimization suggestions.

**Migration:** 0046

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | Owning auth user |
| `target_type` | text | NO | — | One of: about, headline, experience, skills_summary |
| `original_text` | text | NO | — | Original LinkedIn text |
| `target_role` | text | YES | — | Role context for the optimization |
| `result_json` | jsonb | NO | — | AI suggestion result |
| `created_at` | timestamptz | NO | now() | Generation timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE  
**Indexes:** `idx_linkedin_suggestions_user_id (user_id, created_at DESC)`  
**RLS:** Enabled. User owns only their own rows.

---

### `ai_mock_interview_sessions`

Live mock interview sessions with full conversation history and per-answer scoring. Status transitions: active → completed.

**Migration:** 0047

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | Owning auth user |
| `interview_type` | text | NO | — | One of: hr, technical, behavioral, star, case_study, company |
| `target_role` | text | NO | — | Role being interviewed for |
| `company_name` | text | YES | — | Target company |
| `job_description` | text | YES | — | Job description context |
| `experience_level` | text | YES | — | User's experience level |
| `messages` | jsonb | NO | '[]' | Full Q&A conversation history with per-answer evaluation |
| `scores` | jsonb | YES | — | Final dimension scores (overall, communication, confidence, etc.) |
| `strengths` | text[] | YES | — | Identified strengths |
| `weaknesses` | text[] | YES | — | Identified weaknesses |
| `coaching_tips` | text[] | YES | — | AI coaching recommendations |
| `ai_summary` | text | YES | — | Overall session summary |
| `readiness_score` | integer | YES | — | Interview readiness score 0–100 |
| `question_count` | integer | NO | 0 | Number of questions asked |
| `status` | text | NO | 'active' | One of: active, completed |
| `created_at` | timestamptz | NO | now() | Session start timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE  
**Indexes:** `idx_mock_sessions_user_time (user_id, created_at DESC)`  
**RLS:** Enabled. User owns only their own rows.

---

## Group 8: Platform Admin

---

### `feature_flags`

Master registry of all feature toggles. Add a row here to introduce a new feature gate.

**Migration:** 0032

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `key` | text | NO | — | Unique feature key (primary key) |
| `name` | text | NO | — | Human-readable feature name |
| `description` | text | YES | — | What the feature does |
| `category` | text | NO | 'general' | Grouping category (ai, platform, team, enterprise, limits) |
| `default_enabled` | boolean | NO | false | Default state when no plan or company override exists |
| `created_at` | timestamptz | NO | now() | Creation timestamp |

**Primary Key:** `key`  
**RLS:** Enabled. Public read; admin write.

---

### `plan_features`

Default feature entitlements per subscription plan. Rows here define what each plan includes before company overrides.

**Migration:** 0032

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `plan` | text | NO | — | One of: free, starter, professional, enterprise |
| `feature_key` | text | NO | — | References feature_flags.key |
| `enabled` | boolean | NO | true | Whether this feature is enabled for this plan |
| `numeric_limit` | int | YES | — | Numeric cap (null = unlimited) |

**Primary Key:** `(plan, feature_key)`  
**Foreign Keys:** `feature_key` → `feature_flags(key)` ON DELETE CASCADE  
**RLS:** Enabled. Public read.

---

### `company_features`

Per-company overrides on feature flags. Super-admin only writes; company members can read.

**Migration:** 0032

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `company_id` | uuid | NO | — | Company receiving the override |
| `feature_key` | text | NO | — | Feature being overridden |
| `enabled` | boolean | NO | — | Override enabled state |
| `numeric_limit` | int | YES | — | Override numeric cap |
| `overridden_by` | uuid | YES | — | Admin who set this override |
| `override_note` | text | YES | — | Reason for the override |
| `created_at` | timestamptz | NO | now() | Override creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `(company_id, feature_key)`  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE CASCADE; `feature_key` → `feature_flags(key)` ON DELETE CASCADE; `overridden_by` → `profiles(id)` ON DELETE SET NULL  
**RLS:** Enabled. Admin writes; company members read.

---

### `subscriptions`

Stripe subscription metadata. One row per company. The denormalized `companies.subscription_plan` / `subscription_status` is the fast-path truth; this table holds the full Stripe record.

**Migration:** 0033

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_id` | uuid | NO | — | Subscribed company (unique) |
| `stripe_customer_id` | text | YES | — | Stripe customer ID |
| `stripe_subscription_id` | text | YES | — | Stripe subscription ID (unique) |
| `plan` | text | NO | 'free' | One of: free, starter, professional, enterprise |
| `status` | text | NO | 'active' | One of: active, trialing, past_due, cancelled, suspended, incomplete, incomplete_expired |
| `trial_ends_at` | timestamptz | YES | — | Trial end timestamp |
| `current_period_start` | timestamptz | YES | — | Current billing period start |
| `current_period_end` | timestamptz | YES | — | Current billing period end |
| `cancel_at_period_end` | boolean | NO | false | Whether subscription cancels at period end |
| `billing_email` | text | YES | — | Billing contact email |
| `billing_name` | text | YES | — | Billing contact name |
| `created_at` | timestamptz | NO | now() | Record creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `company_id`; `stripe_subscription_id`  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE CASCADE  
**Indexes:** `subscriptions_stripe_customer_idx`, `subscriptions_stripe_subscription_idx`, `subscriptions_status_idx`, `subscriptions_plan_idx`  
**RLS:** Enabled. Admin full access; company members read own.

---

### `invoices`

Billing invoice records synced from Stripe webhooks.

**Migration:** 0033

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_id` | uuid | NO | — | Associated company |
| `stripe_invoice_id` | text | YES | — | Stripe invoice ID (unique) |
| `amount_due` | int | NO | 0 | Amount due in cents |
| `amount_paid` | int | NO | 0 | Amount paid in cents |
| `currency` | text | NO | 'usd' | Currency code |
| `status` | text | NO | 'draft' | One of: draft, open, paid, uncollectible, void |
| `description` | text | YES | — | Invoice description |
| `invoice_url` | text | YES | — | Hosted Stripe invoice URL |
| `due_date` | timestamptz | YES | — | Payment due date |
| `paid_at` | timestamptz | YES | — | Payment received timestamp |
| `period_start` | timestamptz | YES | — | Billing period start |
| `period_end` | timestamptz | YES | — | Billing period end |
| `created_at` | timestamptz | NO | now() | Record creation timestamp |

**Primary Key:** `id`  
**Unique:** `stripe_invoice_id`  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE CASCADE  
**Indexes:** `invoices_company_id_idx`, `invoices_stripe_invoice_idx`, `invoices_status_idx`  
**RLS:** Enabled. Admin full access; company members read own.

---

### `billing_events`

Immutable log of all Stripe webhook events. Append-only; used for idempotent webhook processing.

**Migration:** 0033

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_id` | uuid | YES | — | Associated company (null if not resolvable) |
| `event_type` | text | NO | — | Stripe event type (e.g., customer.subscription.updated) |
| `stripe_event_id` | text | YES | — | Stripe event ID for idempotency (unique) |
| `payload` | jsonb | NO | '{}' | Full Stripe event payload |
| `processed` | boolean | NO | false | Whether the event has been processed |
| `error` | text | YES | — | Processing error if any |
| `processed_at` | timestamptz | YES | — | When processing completed |
| `created_at` | timestamptz | NO | now() | Record creation timestamp |

**Primary Key:** `id`  
**Unique:** `stripe_event_id`  
**Foreign Keys:** `company_id` → `companies(id)` ON DELETE SET NULL  
**Indexes:** `billing_events_company_idx`, `billing_events_type_idx`, `billing_events_processed_idx (processed) WHERE NOT processed`  
**RLS:** Enabled. Admin only.

---

### `job_queue`

Database-backed async job queue for Vercel cron workers. `claim_next_job()` uses `FOR UPDATE SKIP LOCKED` for concurrency safety.

**Migration:** 0034

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `type` | text | NO | — | Job type (e.g., resume_parse, ats_score, email_send) |
| `payload` | jsonb | NO | '{}' | Job-specific input data |
| `status` | text | NO | 'pending' | One of: pending, running, completed, failed, cancelled |
| `priority` | int | NO | 0 | Higher value = processed sooner |
| `attempts` | int | NO | 0 | Number of processing attempts made |
| `max_attempts` | int | NO | 3 | Maximum allowed attempts |
| `last_error` | text | YES | — | Error from the last failed attempt |
| `context` | jsonb | NO | '{}' | Correlation IDs and trace context |
| `scheduled_at` | timestamptz | NO | now() | Earliest time to process |
| `started_at` | timestamptz | YES | — | When current/last run started |
| `completed_at` | timestamptz | YES | — | When successfully completed |
| `created_at` | timestamptz | NO | now() | Enqueue timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Indexes:** `job_queue_pending_idx (priority DESC, scheduled_at ASC) WHERE status = 'pending'`, `job_queue_type_idx`, `job_queue_status_idx`  
**RLS:** Enabled. Admin only.

---

### `email_templates`

HTML email templates with `{{variable}}` placeholder syntax. Active templates are publicly readable for rendering.

**Migration:** 0035

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `key` | text | NO | — | Unique template identifier (primary key) |
| `name` | text | NO | — | Human-readable template name |
| `subject` | text | NO | — | Email subject line (may contain variables) |
| `html_body` | text | NO | — | HTML email body |
| `text_body` | text | YES | — | Plaintext fallback |
| `variables` | jsonb | NO | '[]' | Array of variable name strings |
| `category` | text | NO | 'transactional' | Template category (transactional, billing, job_discovery, marketing) |
| `is_active` | boolean | NO | true | Whether template is available for use |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `key`  
**RLS:** Enabled. Active templates public read; admin full access.

---

### `email_queue`

Outbound email jobs with retry logic and provider tracking.

**Migration:** 0035

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `template_key` | text | YES | — | Source template (null if body was pre-rendered) |
| `to_email` | text | NO | — | Recipient email address |
| `to_name` | text | YES | — | Recipient display name |
| `from_email` | text | NO | 'noreply@pra-talent.com' | Sender email address |
| `from_name` | text | NO | 'PRA Talent Intelligence' | Sender display name |
| `subject` | text | NO | — | Rendered email subject |
| `html_body` | text | NO | — | Rendered HTML body |
| `text_body` | text | YES | — | Rendered plaintext body |
| `status` | text | NO | 'pending' | One of: pending, sent, failed, cancelled |
| `attempts` | int | NO | 0 | Send attempts made |
| `max_attempts` | int | NO | 3 | Maximum send attempts |
| `last_error` | text | YES | — | Last send error |
| `provider_id` | text | YES | — | External message ID from email provider |
| `metadata` | jsonb | NO | '{}' | Additional context |
| `scheduled_at` | timestamptz | NO | now() | Earliest send time |
| `sent_at` | timestamptz | YES | — | Actual send timestamp |
| `created_at` | timestamptz | NO | now() | Enqueue timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `template_key` → `email_templates(key)` ON DELETE SET NULL  
**Indexes:** `email_queue_status_idx (status, scheduled_at) WHERE status = 'pending'`, `email_queue_to_email_idx`, `email_queue_template_idx`  
**RLS:** Enabled. Admin only.

---

### `email_events`

Delivery event tracking records (sent, opened, clicked, bounced, etc.).

**Migration:** 0035

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `email_id` | uuid | YES | — | Associated email queue entry |
| `event_type` | text | NO | — | Event type string (e.g., sent, opened, bounced) |
| `metadata` | jsonb | NO | '{}' | Event-specific data |
| `occurred_at` | timestamptz | NO | now() | When the event occurred |

**Primary Key:** `id`  
**Foreign Keys:** `email_id` → `email_queue(id)` ON DELETE CASCADE  
**Indexes:** `email_events_email_id_idx`, `email_events_type_idx`  
**RLS:** Enabled. Admin only.

---

### `audit_logs`

Append-only platform audit trail. Records every significant action with actor, entity, and metadata.

**Migration:** 0008

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `actor_id` | uuid | YES | — | Profile who performed the action |
| `action` | text | NO | — | Action string (e.g., "job.published", "user.suspended") |
| `entity_type` | text | NO | — | Type of entity affected (e.g., "job", "candidate") |
| `entity_id` | uuid | YES | — | ID of the affected entity |
| `metadata` | jsonb | YES | — | Additional context |
| `ip_address` | text | YES | — | Requester IP address |
| `created_at` | timestamptz | NO | now() | Event timestamp |

**Primary Key:** `id`  
**Foreign Keys:** `actor_id` → `profiles(id)` ON DELETE SET NULL  
**Indexes:** `audit_logs_actor_idx`, `audit_logs_entity_idx (entity_type, entity_id)`, `audit_logs_created_idx (created_at DESC)`  
**RLS:** Enabled. Admin read; system insert (service role).

---

## Group 9: RBAC (Fine-Grained Permissions)

---

### `roles`

Named role definitions. System roles (`is_system = true`) cannot be deleted or deactivated through the UI.

**Migration:** 0041

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `name` | text | NO | — | Unique machine name (e.g., "super_admin") |
| `display_name` | text | NO | — | Human-readable name |
| `description` | text | YES | — | Role description |
| `is_system` | boolean | NO | false | Whether this is a built-in role |
| `is_active` | boolean | NO | true | Whether role is usable |
| `color` | text | NO | '#6366f1' | UI badge color |
| `icon` | text | NO | 'Shield' | Lucide icon name |
| `sort_order` | int | NO | 0 | Display order |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Primary Key:** `id`  
**Unique:** `name`  
**Indexes:** `roles_name_idx`, `roles_is_active_idx (is_active) WHERE is_active = true`  
**RLS:** Enabled. Public read; admin write.

---

### `permissions`

Atomic permission slugs. Organized into categories matching the admin panel sections.

**Migration:** 0041

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `slug` | text | NO | — | Unique dot-notation identifier (e.g., "jobs.create") |
| `name` | text | NO | — | Human-readable name |
| `description` | text | YES | — | What this permission grants access to |
| `category` | text | NO | — | Grouping category (platform, companies, users, etc.) |
| `is_active` | boolean | NO | true | Whether permission is enforced |
| `sort_order` | int | NO | 0 | Display order within category |
| `created_at` | timestamptz | NO | now() | Creation timestamp |

**Primary Key:** `id`  
**Unique:** `slug`  
**Indexes:** `permissions_category_idx`, `permissions_slug_idx`  
**RLS:** Enabled. Public read; admin write.

---

### `role_permissions`

Many-to-many junction table granting permissions to roles. Admin-only writes; public read.

**Migration:** 0041

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `role_id` | uuid | NO | — | Role receiving the permission |
| `permission_id` | uuid | NO | — | Permission being granted |
| `granted_at` | timestamptz | NO | now() | When the grant was made |
| `granted_by` | uuid | YES | — | Admin who made the grant |

**Primary Key:** `(role_id, permission_id)`  
**Foreign Keys:** `role_id` → `roles(id)` ON DELETE CASCADE; `permission_id` → `permissions(id)` ON DELETE CASCADE; `granted_by` → `profiles(id)` ON DELETE SET NULL  
**Indexes:** `role_permissions_role_id_idx`, `role_permissions_permission_id_idx`  
**RLS:** Enabled. Public read; admin write.

---

### `user_roles`

Assigns roles to users. `company_id = NULL` means a platform-level (global) assignment; `company_id IS NOT NULL` means the assignment is scoped to that company only. Supports expiry.

**Migration:** 0041

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | Profile receiving the role |
| `role_id` | uuid | NO | — | Role being assigned |
| `company_id` | uuid | YES | — | Company scope (null = platform-level) |
| `assigned_by` | uuid | YES | — | Admin who made the assignment |
| `assigned_at` | timestamptz | NO | now() | Assignment timestamp |
| `expires_at` | timestamptz | YES | — | Optional expiry (null = permanent) |

**Primary Key:** `id`  
**Unique:** `(user_id, role_id) WHERE company_id IS NULL` (platform-level); `(user_id, role_id, company_id) WHERE company_id IS NOT NULL` (company-scoped)  
**Foreign Keys:** `user_id` → `profiles(id)` ON DELETE CASCADE; `role_id` → `roles(id)` ON DELETE CASCADE; `company_id` → `companies(id)` ON DELETE CASCADE; `assigned_by` → `profiles(id)` ON DELETE SET NULL  
**Indexes:** `user_roles_user_id_idx`, `user_roles_role_id_idx`, `user_roles_company_id_idx`, `user_roles_platform_unique_idx`, `user_roles_company_unique_idx`  
**RLS:** Enabled. Admin full access; users read own assignments.

---

*End of Data Dictionary*
