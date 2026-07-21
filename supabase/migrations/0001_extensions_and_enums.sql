-- ============================================================================
-- PRA Talent Intelligence Platform
-- Migration 0001: Extensions & Enums
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('candidate', 'recruiter', 'hr_manager', 'super_admin');

create type employment_type as enum ('full_time', 'part_time', 'contract', 'internship', 'temporary');

create type experience_level as enum ('entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive');

create type job_status as enum ('draft', 'published', 'closed', 'archived');

create type application_status as enum (
  'submitted',
  'screening',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn'
);

create type interview_type as enum ('phone', 'video', 'onsite', 'technical', 'panel', 'final');

create type interview_status as enum ('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled');

create type hiring_recommendation as enum ('strong_yes', 'yes', 'neutral', 'no', 'strong_no');

create type proficiency_level as enum ('beginner', 'intermediate', 'advanced', 'expert');

create type language_proficiency as enum ('basic', 'conversational', 'fluent', 'native');

create type notification_type as enum (
  'application_received',
  'application_status_changed',
  'interview_scheduled',
  'interview_reminder',
  'offer_extended',
  'rejection',
  'hiring_confirmed',
  'job_match',
  'system'
);
