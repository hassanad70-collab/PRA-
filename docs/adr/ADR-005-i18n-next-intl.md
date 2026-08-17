# ADR-005: next-intl for Internationalization

**Status:** Accepted  
**Date:** 2026-Q1  
**Deciders:** Hassan Ahmed

---

## Context

The platform requires full internationalization across all three portals (candidate, recruiter, admin) with:
- English and Arabic (RTL) support
- Locale-prefixed URLs (`/en/candidate/...`, `/ar/candidate/...`)
- Locale detection from browser preferences
- Server-side translation in Server Components
- RTL layout support without CSS duplication
- `<html lang>` and `<html dir>` attributes set correctly per locale

Options considered:
1. **next-intl** — purpose-built for Next.js App Router with RSC support
2. **react-i18next** — widely used but client-focused; SSR requires additional configuration
3. **i18next** — same ecosystem, same tradeoffs
4. **Custom translation layer** — full control but maintenance burden

---

## Decision

We use **next-intl 4.x** for all internationalization.

---

## Rationale

### Designed for the App Router

`next-intl` was built specifically for Next.js App Router and React Server Components. It provides `getTranslations()` for Server Components (async, server-only) and `useTranslations()` for Client Components (synchronous, requires provider). This matches the Server-first architecture exactly.

### Locale routing is built in

`next-intl`'s `createNavigation()` wraps Next.js `Link`, `useRouter`, `usePathname`, and `redirect` with locale awareness. Locale-prefixed links are generated automatically without manual string concatenation.

### RTL support via `<html dir>`

When Arabic is the active locale, `<html dir="rtl">` is set in the root layout. Tailwind CSS includes RTL variants (`rtl:` prefix). Combined, this provides RTL layout without maintaining separate CSS files.

---

## Architecture Gotcha: Provider Placement

**`NextIntlClientProvider` must live in `[locale]/layout.tsx`, not the root `app/layout.tsx`.**

If placed in the root layout, Client Components and the `<html lang>` / `<html dir>` attributes go stale on locale switch — they render with the initial locale and don't update when the user switches. This happens because the root layout is outside the `[locale]` segment and does not re-render when the locale changes.

Correct placement:
```
src/app/[locale]/layout.tsx  ← NextIntlClientProvider lives here
src/app/layout.tsx           ← No i18n provider here
```

This is documented in the project's memory system (`i18n_architecture_gotchas.md`) because it is a non-obvious constraint that burned us in Phase 1D.

---

## Translation file structure

```
messages/
  en.json    ← English strings
  ar.json    ← Arabic strings
```

Namespaced by feature:
```json
{
  "Candidate": {
    "Dashboard": { "title": "Dashboard" },
    "Resume": { "upload": "Upload Resume" }
  },
  "Recruiter": {
    "Pipeline": { "empty": "No applications yet" }
  }
}
```

---

## Consequences

### Positive
- Server Components can access translations without a client provider wrapper
- Locale routing, Link/redirect wrapping, and middleware are handled by the library
- RTL via `<html dir>` + Tailwind RTL variants covers the layout without CSS duplication

### Negative / Watch points
- **Provider placement is critical** — placing `NextIntlClientProvider` in the wrong layout causes stale locale in Client Components. See architecture gotcha above.
- **All new UI strings must go in both `en.json` and `ar.json`** — forgetting to add the Arabic translation falls back to the key string being rendered, which is visible to users
- Translating dynamic content (AI-generated text, database values) is outside the scope of `next-intl` — those require a separate translation approach if needed

---

## Related

- Memory: `i18n_architecture_gotchas.md`
- Phase 1D (commit `026a899`): Initial i18n implementation
- Unit 0 (commit `2063afb`): Candidate portal i18n
- Phase 0-1 (commit `73d0767`): Recruiter portal i18n
