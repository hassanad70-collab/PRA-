/**
 * Documented, extensible source-of-hire values (Recruiter Intelligence
 * v2.0, Phase 6). applications.source (migration 0023) is plain text, not
 * an enum, so a new sourcing channel never needs a migration -- add it here
 * and to the translation files.
 */
export const APPLICATION_SOURCES = ["platform", "referral", "linkedin", "job_board", "agency", "other"] as const;
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];
