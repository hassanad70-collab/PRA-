# Database Engineering Workflow

This is the authoritative process for making schema changes to the PRA Talent
Intelligence Platform's production Supabase database. It applies to every
developer and every AI agent working on this repo. If a change touches
`supabase/migrations/`, it follows this document — no exceptions, no ad hoc
SQL Editor edits.

Current state as of this writing: migrations `0001`–`0020` are applied to
production and the CLI's remote bookkeeping (`supabase_migrations.schema_migrations`)
matches local exactly (`supabase migration list` shows `local == remote` for
every version). CLI version in use: `2.110.0`.

## 1. How new migrations are created

1. Write a plain SQL file at `supabase/migrations/NNNN_short_description.sql`
   (see numbering convention below). There is no `supabase migration new`
   step in this project's workflow — the file is authored directly, since
   this project has no local Docker Postgres shadow database to diff
   against (see §7).
2. Every migration is idempotent-safe to *read* (not necessarily re-runnable
   — see §4) and self-contained: one migration = one coherent change (a
   feature's tables/columns/indexes/policies together, not scattered across
   several files).
3. Comment the *why*, not the *what*, directly in the SQL — future readers
   (human or AI) should be able to understand a design decision (e.g. "no
   CHECK constraint here because X") without needing this document open.
   Migration `0020_resume_suggestion_events.sql` is a good reference for
   this style.
4. New tables that hold user data must ship with RLS enabled and explicit
   policies in the same migration — never a follow-up migration "to add RLS
   later."
5. Never edit a migration file that has already been applied to production.
   If you need to change something a shipped migration did, write a new
   migration that alters it forward. The migration history is an append-only
   log of what actually happened to the schema, mirroring how
   `resume_suggestion_events` itself treats application data (see the
   comment block at the top of `0020_resume_suggestion_events.sql`).

## 2. Numbering convention

Four-digit, zero-padded, strictly sequential, no gaps: `0001`, `0002`, …
`0020`, `0021`. The next migration after this document was written is
`0021`. Before creating a new migration:

```bash
ls supabase/migrations | sort | tail -3
```

Confirm the highest existing number, then use the next integer. Do not use
timestamps, dates, or branch-based numbering — this project intentionally
uses simple sequential integers, matching how `supabase migration list`
displays and orders them.

## 3. How migrations are applied using the Supabase CLI

Standard path, for a normal new migration on top of an already-baselined
project:

```bash
supabase link --project-ref <project-ref>   # once per machine/checkout, if not already linked
supabase db push
```

`supabase db push` diffs local migration files against the remote
`schema_migrations` bookkeeping table and applies whatever is missing, in
order.

### Known CLI bug in 2.110.0 — use `db query` as the fallback

While applying `0020_resume_suggestion_events.sql`, `supabase db push` failed
with an opaque `LegacyDbPushApplyError` whose "message" was just the raw SQL
text of the failing statement — no real Postgres error, no line number.
Running the *exact same SQL* through `supabase db query --linked --file <path>`
succeeded immediately with zero errors, proving the SQL was correct and the
bug lives in `db push`'s own statement-splitting/execution path in this CLI
version, not in the migration content.

If `supabase db push` fails with an error that doesn't look like a real
Postgres error (no `ERROR:`, no SQLSTATE code, just echoed SQL text), do not
assume the migration is broken. Fall back to:

```bash
supabase db query --linked --file supabase/migrations/NNNN_description.sql
```

This applies the SQL directly via the Management API, atomically, exactly as
written in the file. After it succeeds, reconcile the CLI's own bookkeeping
so future `db push`/`migration list` calls stay accurate:

```bash
supabase migration repair --status applied NNNN
```

`migration repair` never executes SQL — it only edits the
`supabase_migrations.schema_migrations` bookkeeping table, so this step is
safe to run even if you're unsure whether the migration already applied
(check with §4 first).

## 4. How migration verification is performed

After every migration, verify from multiple angles before considering it
done — "it compiled" / "the command exited 0" is not sufficient:

1. **Bookkeeping matches reality**:
   ```bash
   supabase migration list
   ```
   Confirm `local` and `remote` agree for every version, including the one
   you just applied.

2. **Schema actually changed**, verified directly against the database, not
   assumed from the migration file:
   ```bash
   supabase db query --linked "select column_name from information_schema.columns where table_name = 'your_table'"
   supabase db query --linked "select count(*) from pg_trigger where tgname = 'your_trigger'"
   supabase db query --linked "select relrowsecurity from pg_class where relname = 'your_table'"
   supabase db query --linked "select policyname from pg_policies where tablename = 'your_table'"
   ```

3. **Application code can actually read/write it** — a quick query through
   the app's own Supabase client (or a throwaway script using the same
   client config), not just raw SQL.

4. **Behavioral guarantees the migration claims to enforce are tested
   directly, not inferred.** If a migration adds a trigger, a constraint, or
   an RLS policy, prove it does what it claims by attempting the operation it
   should block and confirming it actually fails with the expected error —
   and separately confirming the operations it should still allow actually
   succeed. (This is exactly how `0020`'s immutability trigger was verified:
   a direct `update` of a protected column had to return
   `P0001: resume_suggestion_events rows are immutable except outcome/decided_at`,
   and a separate `update` of `outcome`/`decided_at` had to succeed. Neither
   fact would have been caught by a passing build or type-check.) The
   Playwright suite should encode this as a real e2e test wherever the
   behavior is user-reachable (see `e2e/resume-suggestion-history.spec.ts`
   for the pattern: exercise the UI path, then also hit the table directly
   with a service-role client to prove the DB-level guarantee independent of
   the UI).

## 5. How rollback should be handled

There is no blanket "run this to undo the migration" script, and this
project deliberately does not design schema around dropping tables. Two
different rollback philosophies apply depending on what the migration
touched:

- **Structural rollback (new tables/columns that turn out to be wrong
  before real data has accumulated in them)**: write a new forward migration
  that drops or alters the specific mistake. Never edit or delete the
  original migration file (§1.5).

- **Audit/history tables (append-only data like `resume_suggestion_events`)**:
  these are explicitly *not* designed around table-level rollback. If a
  feature built on an audit table is retired, retire it in application code
  — stop writing new rows, stop reading them — rather than dropping the
  table. The table's own migration file documents this explicitly; follow
  the same philosophy for any future audit/history table. This was an
  explicit, deliberate product decision (soft-delete-first, not hard
  rollback) — don't reintroduce "drop the table" as a rollback plan for
  tables like this without raising it as a decision first.

- **Data corrected by a bad migration**: fix forward with a new migration
  that repairs the data (an `update` statement in a new migration file), not
  by hand-editing rows in the SQL Editor (§6) and not by reverting.

## 6. SQL Editor is for emergency/manual recovery only

The Supabase Dashboard's SQL Editor must never be the origin of a schema
change. Its only legitimate uses:

- Read-only diagnostic queries while debugging an incident.
- Genuine emergency recovery when production is down and there is no time to
  round-trip a migration file (e.g. manually unblocking a stuck row) — and
  even then, follow up immediately with a migration file that captures
  whatever change was made by hand, so the migration history stays the
  source of truth for what the schema actually looks like.

Any schema change (table, column, index, policy, function, trigger) made
through the SQL Editor and not backed by a migration file is considered
drift and must be reconciled (either by writing the missing migration file
retroactively + `migration repair --status applied`, or by reverting the
manual change) as soon as it's discovered.

## 7. All production schema changes must originate from version-controlled migration files

This project has no local Docker Postgres shadow database (no
`supabase/config.toml` local dev stack is in use) — `supabase db query
--linked` and `supabase db push` both talk directly to the linked remote
project. This makes the migration files in `supabase/migrations/` the
*only* record of schema intent; there is no separate "local truth" copy to
fall back on. Treat every file in that directory as authoritative and
committed-to-git before it is ever applied to the remote database, not
after.

## 8. Baseline process for existing projects

This section documents the one-time procedure this project itself went
through when the Supabase CLI was first linked to an existing production
database that already had schema history the CLI didn't know about. Repeat
this only if the CLI is ever re-linked from scratch against a database whose
migrations weren't tracked by that CLI installation.

**Do not run a plain `supabase db push` first.** Against an existing
database, it will try to replay the entire migration history from `0001`
and fail with conflicts, because the schema already exists. The safe
procedure:

1. **Verify the remote migration bookkeeping is actually empty** before
   touching anything:
   ```bash
   supabase migration list
   ```
   If this shows no `remote` entries at all (or the table doesn't exist
   yet), it confirms the CLI has no record of what's already applied — safe
   to baseline. If it already shows entries, stop and investigate before
   proceeding; do not repair over existing bookkeeping blindly.

2. **Mark every already-applied historical migration as applied**, in one
   call, without executing any of their SQL:
   ```bash
   supabase migration repair --status applied 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0013 0014 0015 0016 0017 0018 0019
   ```
   (Substitute the actual set of pre-existing local migration files. This
   command only writes bookkeeping rows — it is safe precisely because it
   never runs SQL against the database.)

3. **Verify the list again**:
   ```bash
   supabase migration list
   ```
   Confirm `local` and `remote` now agree for every historical version.

4. **Apply only the genuinely new migration(s)** on top of the now-correct
   baseline through the standard workflow (§3) — this is where the `db push`
   bug surfaced in this project, so be ready to fall back to `db query
   --linked --file` + `migration repair --status applied` for that specific
   migration if it hits the same opaque error.

5. **Re-verify** with `supabase migration list` and the schema-level checks
   in §4.

Never use `supabase db reset`, drop-and-recreate, or any destructive
re-provisioning approach to "fix" a baseline problem — the whole point of
this procedure is adopting the CLI onto an existing database without
touching its data or schema.

## 9. Common troubleshooting

- **`supabase db push` returns `LegacyDbPushApplyError` with the message
  being raw SQL text, no Postgres error code**: this CLI version's `db push`
  has a statement-splitting/execution bug (see §3). Confirm the SQL is
  actually valid by running it directly with `supabase db query --linked
  --file <path>`; if that succeeds, use it as the apply mechanism instead of
  `db push`, then reconcile bookkeeping with `migration repair --status
  applied <version>`.
- **`migration list` shows `local` and `remote` disagreeing for a version
  that you know is actually applied**: run `migration repair --status
  applied <version>` to fix the bookkeeping — never re-run the migration's
  SQL just to "fix" a list mismatch, since it may already exist and error or
  double-apply.
- **Not sure whether a migration already ran**: check directly with
  `supabase db query --linked` against `information_schema`/`pg_catalog`
  (§4.2) before applying anything — never guess.
- **CLI can't connect / not linked**: `supabase link --project-ref
  <project-ref>` (requires `SUPABASE_ACCESS_TOKEN` or a prior `supabase
  login`). This project has no local Postgres, so there is no `--local`
  workflow to fall back to — everything goes through `--linked`.

## 10. Expected workflow for future developers and AI agents

1. Confirm the next migration number (§2).
2. Write the migration file, committed to git, following the schema-change
   requirements in §1 (RLS from day one, comments explaining *why*, no
   editing of already-applied files).
3. If the change is non-trivial (new tables, new RLS, anything touching
   existing data), consider whether it needs an explicit proposal/approval
   step before writing the file — this project's standing practice has been
   to propose new tables/columns/indexes/policies/data-impact/rollback
   strategy for review before implementation on anything beyond a trivial
   column add. When in doubt, propose first.
4. Apply via `supabase db push` (§3), falling back to `db query --linked
   --file` + `migration repair` if the known bug (§3, §9) surfaces.
5. Verify from every angle in §4 — bookkeeping, raw schema, app-level
   read/write, and (critically) the actual behavioral guarantee the
   migration claims to add, proven by attempting to violate it.
6. Add or update Playwright coverage for anything user-reachable, following
   the pattern in `e2e/resume-suggestion-history.spec.ts` — exercise through
   the UI, then double-check the underlying guarantee with a direct
   service-role query.
7. Never use the SQL Editor to originate a change (§6); never use
   destructive rollback for audit/history tables (§5); never leave the CLI's
   bookkeeping out of sync with what's actually in the database (§4.1).
