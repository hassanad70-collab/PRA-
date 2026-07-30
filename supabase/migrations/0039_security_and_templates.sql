-- ============================================================================
-- Migration 0039: Security hardening + missing email templates
-- ============================================================================
-- 1. Drop the over-permissive notifications insert policy. Every legitimate
--    insert goes through either the service-role admin client (bypasses RLS)
--    or the create_notification() SECURITY DEFINER function (also bypasses
--    RLS). Authenticated users have no business inserting notifications
--    targeting arbitrary user_ids directly.
-- 2. Seed the job_alert and weekly_career_digest email templates that the
--    cron worker's job_alert_send and weekly_digest_send handlers reference.
--    Without these the cron jobs would permanently fail on every invocation.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Tighten notifications RLS
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_system_insert" on public.notifications;

-- ---------------------------------------------------------------------------
-- 2. Job Alert email template
-- ---------------------------------------------------------------------------
insert into public.email_templates (key, name, subject, html_body, text_body, variables, category)
values (
  'job_alert',
  'Job Alert',
  'New jobs matching your search "{{search_name}}"',
  $$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Jobs Matching Your Search</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 60%,#2563eb 100%);padding:32px 48px;text-align:center;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 8px;">
              <tr>
                <td style="background:rgba(255,255,255,0.15);border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                  <span style="color:white;font-size:22px;line-height:44px;">✦</span>
                </td>
                <td style="padding-left:12px;text-align:left;vertical-align:middle;">
                  <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">PRA Talent</span>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:0.03em;">Job Alert</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 48px 32px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Hi {{candidate_name}},</h1>
            <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.7;">
              New opportunities are available matching your saved search <strong style="color:#0f172a;">"{{search_name}}"</strong>.
            </p>

            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:32px;">
              <tr>
                <td>
                  <a href="{{platform_url}}/candidate/jobs?tab=saved"
                     style="display:block;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:16px 24px;border-radius:10px;font-weight:600;font-size:15px;text-align:center;">
                    View Matching Jobs &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;line-height:1.6;">
              You're receiving this because you set up a job alert on PRA Talent Intelligence Platform.
            </p>
            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
              Manage your alerts: <a href="{{platform_url}}/candidate/jobs?tab=saved" style="color:#2563eb;text-decoration:none;">Job Alerts Settings</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 48px;text-align:center;">
            <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;">PRA Talent Intelligence Platform &middot; Cairo, Egypt</p>
            <p style="margin:0;font-size:12px;">
              <a href="{{platform_url}}" style="color:#94a3b8;text-decoration:none;">Visit Platform</a>
              &nbsp;&middot;&nbsp;
              <a href="{{platform_url}}/candidate/settings" style="color:#94a3b8;text-decoration:none;">Notification Settings</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>$$,
  'Hi {{candidate_name}},

New opportunities are available matching your saved search "{{search_name}}".

View matching jobs: {{platform_url}}/candidate/jobs?tab=saved

You''re receiving this because you set up a job alert on PRA Talent Intelligence Platform.
Manage your alerts: {{platform_url}}/candidate/jobs?tab=saved',
  '["candidate_name","search_name","platform_url"]'::jsonb,
  'transactional'
)
on conflict (key) do update set
  name       = excluded.name,
  subject    = excluded.subject,
  html_body  = excluded.html_body,
  text_body  = excluded.text_body,
  variables  = excluded.variables,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Weekly Career Digest email template
-- ---------------------------------------------------------------------------
insert into public.email_templates (key, name, subject, html_body, text_body, variables, category)
values (
  'weekly_career_digest',
  'Weekly Career Digest',
  'Your Weekly Career Digest — {{new_matches}} new matches this week',
  $$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Career Digest</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 60%,#2563eb 100%);padding:32px 48px;text-align:center;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 8px;">
              <tr>
                <td style="background:rgba(255,255,255,0.15);border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                  <span style="color:white;font-size:22px;line-height:44px;">✦</span>
                </td>
                <td style="padding-left:12px;text-align:left;vertical-align:middle;">
                  <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">PRA Talent</span>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:0.03em;">Weekly Career Digest</p>
          </td>
        </tr>

        <!-- Stats row -->
        <tr>
          <td style="padding:32px 48px 0;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Your weekly summary, {{candidate_name}}</h1>
            <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">Here's what happened on PRA Talent this week.</p>

            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:28px;">
              <tr>
                <td style="padding:0;" width="33%">
                  <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tr>
                      <td style="padding:20px 20px 20px 24px;border-right:1px solid #e2e8f0;text-align:center;">
                        <p style="margin:0 0 4px;font-size:28px;font-weight:700;color:#1d4ed8;">{{new_matches}}</p>
                        <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">New Jobs</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding:0;" width="33%">
                  <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tr>
                      <td style="padding:20px;border-right:1px solid #e2e8f0;text-align:center;">
                        <p style="margin:0 0 4px;font-size:28px;font-weight:700;color:#1d4ed8;">{{ats_score}}</p>
                        <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">ATS Score</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding:0;" width="34%">
                  <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tr>
                      <td style="padding:20px 24px 20px 20px;text-align:center;">
                        <p style="margin:0 0 4px;font-size:28px;font-weight:700;color:#1d4ed8;">{{active_alerts}}</p>
                        <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">Active Alerts</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTAs -->
        <tr>
          <td style="padding:0 48px 40px;">
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:12px;">
              <tr>
                <td>
                  <a href="{{platform_url}}/candidate/jobs"
                     style="display:block;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:10px;font-weight:600;font-size:15px;text-align:center;">
                    Browse New Jobs &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
              <tr>
                <td>
                  <a href="{{platform_url}}/candidate/resume"
                     style="display:block;background:#f1f5f9;color:#1e40af;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;text-align:center;border:1px solid #e2e8f0;">
                    Improve Your Resume Score
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 48px;text-align:center;">
            <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;">PRA Talent Intelligence Platform &middot; Cairo, Egypt</p>
            <p style="margin:0;font-size:12px;">
              <a href="{{platform_url}}" style="color:#94a3b8;text-decoration:none;">Visit Platform</a>
              &nbsp;&middot;&nbsp;
              <a href="{{platform_url}}/candidate/settings" style="color:#94a3b8;text-decoration:none;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>$$,
  'Your weekly summary, {{candidate_name}}

This week on PRA Talent Intelligence Platform:
- {{new_matches}} new jobs published
- Your ATS score: {{ats_score}}
- Active job alerts: {{active_alerts}}

Browse new jobs: {{platform_url}}/candidate/jobs
Improve your resume: {{platform_url}}/candidate/resume

To unsubscribe from weekly digests, visit: {{platform_url}}/candidate/settings',
  '["candidate_name","new_matches","ats_score","active_alerts","platform_url"]'::jsonb,
  'marketing'
)
on conflict (key) do update set
  name       = excluded.name,
  subject    = excluded.subject,
  html_body  = excluded.html_body,
  text_body  = excluded.text_body,
  variables  = excluded.variables,
  updated_at = now();

commit;
