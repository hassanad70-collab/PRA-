# Documentation Index

**PRA Talent Intelligence Platform — v2.0**  
Production: https://pra-eta-umber.vercel.app

---

## Architecture

| Document | Description |
|---|---|
| [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) | Full architecture with Mermaid diagrams: high-level overview, auth flow, middleware chain, background jobs, deployment flow, request lifecycle |
| [Codebase Overview](architecture/CODEBASE_OVERVIEW.md) | Developer guide: App Router route trees, Server Actions patterns, query layer, component directories, AI services, middleware, i18n, testing |
| [C4 Context Diagram](architecture/c4-context.md) | Level 1: system as a black box — users and external dependencies |
| [C4 Container Diagram](architecture/c4-container.md) | Level 2: major deployable units and how they communicate |
| [C4 Component Diagram](architecture/c4-component.md) | Level 3: internal components of the Next.js application |

---

## Database

| Document | Description |
|---|---|
| [Database ERD](database/DATABASE_ERD.md) | Entity-relationship diagrams (Mermaid), table groups, RLS summary, key enums |
| [Data Dictionary](database/DATA_DICTIONARY.md) | Complete reference for all 55 tables: columns, types, defaults, foreign keys, indexes, RLS status |

---

## API

| Document | Description |
|---|---|
| [API Reference](api/API_REFERENCE.md) | REST API endpoints, Server Actions catalog, streaming endpoints, webhook endpoints |
| [OpenAPI Specification](api/openapi.yaml) | OpenAPI 3.1.0 spec — import into Postman, Insomnia, or Swagger UI |

---

## Deployment

| Document | Description |
|---|---|
| [Deployment Guide](deployment/DEPLOYMENT_GUIDE.md) | How to deploy to Vercel, database setup, cron jobs, post-deployment checklist, rollback |
| [Environment Variables](deployment/ENVIRONMENT_VARIABLES.md) | Every environment variable: purpose, scope (client/server), required vs. optional |

---

## Security

| Document | Description |
|---|---|
| [Security](security/SECURITY.md) | Authentication model, three-layer RBAC, View As Switcher security, data handling, HTTP headers, API security, vulnerability reporting |

---

## Guides

| Document | Description |
|---|---|
| [User Guide](guides/USER_GUIDE.md) | End-user workflows for candidates, recruiters, and admins |
| [Contributing](guides/CONTRIBUTING.md) | Development setup, coding standards, database conventions, testing, PR process |

---

## Release

| Document | Description |
|---|---|
| [Changelog](release/CHANGELOG.md) | Complete history of all 82 commits, organized by version/milestone |
| [Roadmap](release/ROADMAP.md) | v2.1 Employer Workspace → v2.2 Recruiter Intelligence → v2.3 Enterprise RBAC → v2.4 Billing → v3.0 AI Talent Intelligence |
| [Release Notes v2.0](release/RELEASE_NOTES_v2.0.md) | v2.0 stabilization sprint release notes — full feature summary |
| [Repository Cleanup Report](release/REPOSITORY_CLEANUP_REPORT.md) | Identified cleanup candidates — NO actions taken; requires approval |
| [Git Tag Prepared](release/GIT_TAG_PREPARED.md) | Prepared `v2.0.0` annotated tag commands — NOT executed; awaiting approval |
| [Bug Fix Report — My Resumes](release/BUGFIX-RESUME-UPLOAD.md) | Root cause analysis, evidence, and lessons learned for the upload/view regression |

---

## Architecture Decision Records

| ADR | Decision |
|---|---|
| [ADR-001](adr/ADR-001-nextjs-app-router.md) | Next.js App Router with React Server Components |
| [ADR-002](adr/ADR-002-supabase.md) | Supabase for database, auth, and storage |
| [ADR-003](adr/ADR-003-openrouter.md) | OpenRouter as AI provider via OpenAI SDK |
| [ADR-004](adr/ADR-004-server-actions.md) | Server Actions for all data mutations |
| [ADR-005](adr/ADR-005-i18n-next-intl.md) | next-intl for internationalization |
| [ADR-006](adr/ADR-006-rbac.md) | Three-layer RBAC design (Middleware + App + RLS) |
| [ADR-007](adr/ADR-007-view-as-switcher.md) | Cookie-based View As role preview for Super Admin |

---

## Images

Screenshot placeholders are in [`images/`](images/). Add screenshots to this directory after capturing them from the production deployment.

| File | Content |
|---|---|
| `images/candidate-dashboard.png` | Candidate home dashboard |
| `images/resume-studio.png` | 3-panel Resume Studio editor |
| `images/recruiter-dashboard.png` | Recruiter executive dashboard |
| `images/pipeline-kanban.png` | Hiring pipeline Kanban |
| `images/admin-dashboard.png` | Admin platform overview |
| `images/view-as-switcher.png` | View As Switcher dropdown |

---

## Quick Links

- **Root README:** [README.md](../README.md)
- **Production:** https://pra-eta-umber.vercel.app
- **Repository:** https://github.com/hassanad70-collab/PRA-
- **Supabase Migrations:** [`supabase/migrations/`](../supabase/migrations/)
- **E2E Tests:** [`e2e/`](../e2e/)
- **Translation Files:** [`messages/`](../messages/)
