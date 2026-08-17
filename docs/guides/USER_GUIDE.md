# User Guide

## Overview

This guide covers the core workflows for all three user types on the PRA Talent Intelligence Platform.

**Production URL:** https://pra-eta-umber.vercel.app

---

## Getting Started

### Creating an account

1. Navigate to the platform homepage
2. Click **Get Started** or **Sign Up**
3. Enter your email and a strong password
4. Verify your email via the confirmation link
5. Complete your profile (name, role selection)

### Signing in

Navigate to `/[locale]/login` or click **Sign In** from the homepage.

---

## Candidate Workspace

### Dashboard

The candidate dashboard (`/[locale]/candidate/dashboard`) provides:
- Quick-access cards for all AI workspace tools
- Application tracking summary
- Unread notification count

### Resume Studio

The Resume Studio (`/[locale]/candidate/resume-studio`) is a 3-panel enterprise editor:

| Panel | Purpose |
|---|---|
| Left: Sections | Drag-and-drop section ordering, add/remove sections |
| Center: Editor | Live editing with rich controls per section |
| Right: Preview | Real-time resume preview |

**To create a resume:**
1. Click **New Resume**
2. Enter basic information (name, contact, headline)
3. Add sections: Experience, Education, Skills, Projects, etc.
4. Use **AI Rewrite** to improve any section
5. Use **ATS Optimize** to tailor for a specific job description
6. Export as **PDF** or **DOCX**

**Version history:** Every save creates a version. Click the history icon to view, compare, or restore previous versions.

### Resume Intelligence Hub

Located at `/[locale]/candidate/resume-intelligence`:

- **ATS Score** — compatibility score with detailed breakdown
- **Structural Health** — checks for common resume mistakes
- **AI Suggestions** — prioritized improvement recommendations
- **Resume Heatmap** — visual strength analysis per section

### AI Career Workspace

Access all AI tools from the left navigation under **AI Career Workspace**:

| Tool | What it does |
|---|---|
| **Career Advisor** | Personalized career coaching and path recommendations |
| **Cover Letter Generator** | Tailored cover letters for specific roles |
| **Interview Prep** | AI practice questions and model answers |
| **Skills Gap Analyzer** | Gap analysis vs. target role requirements |
| **Salary Insights** | AI-estimated compensation ranges by role and market |
| **LinkedIn Optimizer** | AI headline, summary, and skills section suggestions |
| **Portfolio Generator** | Public portfolio page with AI content assistance |

### Job Search

Browse jobs at `/[locale]/jobs`:
- Search by title, company, or keyword
- Filter by location, salary range, experience level
- Save searches and set up **Job Alerts** for automatic email notifications
- **AI Career Intelligence** — AI insights about the job market for your target role

### Applications

Track your applications at `/[locale]/candidate/applications`:
- View all applications and their current status
- Application funnel visualization (applied → screening → interview → offer)
- **Win Probability** — AI-estimated likelihood of progressing
- Application timeline with recruiter activity

### Interview Preparation

Mock interview at `/[locale]/candidate/interview-prep`:
1. Select interview type (Behavioral, Technical, STAR, etc.)
2. Choose your target role
3. Complete the mock interview (AI streams responses in real time)
4. Receive **per-answer scoring** and improvement suggestions
5. Get a **final interview report** with overall assessment

---

## Recruiter Portal

### Dashboard

The recruiter dashboard (`/[locale]/recruiter/dashboard`) shows:
- Open jobs count, active pipeline, upcoming interviews
- Monthly application trend chart
- Recent activity feed (last 24 hours)
- Top required skills across open positions

### Posting a Job

1. Navigate to **Jobs** in the left nav
2. Click **Post New Job**
3. Fill in job details, or use **AI Job Description Generator** for a draft
4. Set location, salary range, and required skills
5. Publish — the job appears on the public board immediately

### Managing the Pipeline

The hiring pipeline (`/[locale]/recruiter/pipeline`) shows all active applications:

**Kanban view:** Drag candidates between stages (Applied → Screening → Interview → Offer → Hired)

**List view:** Sort and filter across all applications

**Bulk operations:**
- Select multiple candidates
- Bulk move to a new stage
- Bulk assign to a recruiter
- Bulk archive

### Candidate Evaluation

On any candidate's profile:
- **AI Candidate Insights** — suitability score, strengths, concerns, recommendation
- **Resume Intelligence** — AI-parsed resume with enriched fields
- **AI Shortlisting** — ranked comparison against all other applicants for the same role

**Side-by-side comparison:** Select 2–5 candidates and click **Compare** for a detailed AI-powered comparison with PDF export.

### Messaging

The Messaging Hub (`/[locale]/recruiter/messages`) is a split-panel inbox:
- Left: conversation list (all candidate conversations)
- Right: message thread
- **AI Message Drafting** — click the AI icon to draft a contextual message

All messages are visible to the candidate in their own messaging view.

### Offers

Creating an offer (`/[locale]/recruiter/offers/new`):
1. Select the candidate and job position
2. Fill in compensation, start date, and expiry
3. Use **AI Offer Letter Generator** for a professional letter
4. Send — the candidate receives an email notification and can accept or decline in their portal

### Analytics

Hiring analytics at `/[locale]/recruiter/analytics`:
- Full hiring funnel by stage
- Time-to-hire breakdown
- Recruiter workload distribution
- Export to CSV

### Recruiter Copilot

The AI assistant at `/[locale]/recruiter/copilot` handles natural language queries:
- "Show me all software engineers in the screening stage"
- "How many offers did we send this month?"
- "Draft a message to Sarah about her interview next Tuesday"

---

## Admin Portal

The Admin Portal (`/admin`) is accessible only to `super_admin` accounts.

### View As Switcher

Super Admins can preview the Candidate or Recruiter UI using the amber **View as…** dropdown in the top navigation bar. This navigates to the target portal without changing the admin's actual role. All RBAC remains enforced.

### Platform Diagnostics

`/admin/diagnostics` shows live health status for:
- Database (Supabase connection + query latency)
- AI (OpenRouter availability and model response)
- Job Queue (pending job count, last run)
- Email (Resend API status)
- Billing (Stripe connection status)

### User Management

`/admin/users`:
- Create new users with role assignment
- Lock/unlock accounts
- Force password reset
- Bulk operations (lock, unlock, delete)

### Company Management

`/admin/companies`:
- Create and manage tenant companies
- Assign recruiters to companies
- Set company subscription plan

### Feature Flags

`/admin/feature-flags`: Toggle features on/off without redeployment.

### Billing

`/admin/billing`: Subscription management dashboard (Stripe-connected).

---

## Internationalization

The platform supports English and Arabic. Switch languages using the language selector in the top navigation bar. Arabic activates right-to-left (RTL) layout automatically across all pages.

---

## Notifications

The notification bell in the top navigation shows unread counts. Notification types include:
- New job match for a saved search (candidates)
- Application status change (candidates)
- New application received (recruiters)
- Message received (both)
- Offer accepted/declined (recruiters)

Email notifications are sent for all the above. Unsubscribe from any notification type in **Account Settings**.
