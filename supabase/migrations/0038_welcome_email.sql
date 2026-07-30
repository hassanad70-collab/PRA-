-- ============================================================================
-- Migration 0038: Welcome Email Template
-- Adds the 'welcome' transactional email template sent immediately after a
-- new user successfully registers (both email/password and OAuth flows).
-- ============================================================================

begin;

insert into public.email_templates (key, name, subject, html_body, text_body, variables, category)
values (
  'welcome',
  'Welcome Email',
  'Welcome to PRA Talent Intelligence Platform',
  $$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PRA Talent Intelligence Platform</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 60%,#2563eb 100%);padding:40px 48px;text-align:center;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 12px;">
              <tr>
                <td style="background:rgba(255,255,255,0.15);border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                  <span style="color:white;font-size:22px;line-height:44px;">✦</span>
                </td>
                <td style="padding-left:12px;text-align:left;vertical-align:middle;">
                  <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">PRA Talent</span>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:0.03em;">Talent Intelligence Platform</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:48px 48px 40px;">
            <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#0f172a;line-height:1.3;">Welcome, {{candidate_name}}!</h1>
            <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.7;">
              Your account is now active. PRA Talent Intelligence Platform uses AI to connect exceptional talent with leading organisations across the Middle East and North Africa.
            </p>
            <p style="margin:0 0 32px;color:#475569;font-size:16px;line-height:1.7;">
              Here's what you can do right now:
            </p>

            <!-- CTA buttons -->
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:36px;">
              <tr>
                <td style="padding-bottom:12px;">
                  <a href="{{platform_url}}/candidate/dashboard"
                     style="display:block;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:16px 24px;border-radius:10px;font-weight:600;font-size:15px;text-align:center;">
                    Get Started &rarr; View Dashboard
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <a href="{{platform_url}}/candidate/jobs"
                     style="display:block;background:#f1f5f9;color:#1e40af;text-decoration:none;padding:15px 24px;border-radius:10px;font-weight:600;font-size:15px;text-align:center;border:1px solid #e2e8f0;">
                    Browse Jobs
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <a href="{{platform_url}}/candidate/profile"
                     style="display:block;background:#f1f5f9;color:#1e40af;text-decoration:none;padding:15px 24px;border-radius:10px;font-weight:600;font-size:15px;text-align:center;border:1px solid #e2e8f0;">
                    Complete Your Profile
                  </a>
                </td>
              </tr>
            </table>

            <!-- Features -->
            <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:36px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="margin:0 0 16px;font-weight:700;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Platform Highlights</p>
                  <p style="margin:0 0 10px;color:#475569;font-size:14px;line-height:1.6;"><strong style="color:#0f172a;">AI Resume Builder</strong> &mdash; Craft a resume that passes ATS systems</p>
                  <p style="margin:0 0 10px;color:#475569;font-size:14px;line-height:1.6;"><strong style="color:#0f172a;">Smart Job Matching</strong> &mdash; AI-powered recommendations tailored to your profile</p>
                  <p style="margin:0 0 10px;color:#475569;font-size:14px;line-height:1.6;"><strong style="color:#0f172a;">Resume Intelligence</strong> &mdash; Analyse and optimise your resume score</p>
                  <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;"><strong style="color:#0f172a;">Interview Prep</strong> &mdash; AI-generated practice questions for your target roles</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;line-height:1.6;">
              Need help? Contact us at <a href="mailto:support@pratalent.com" style="color:#2563eb;text-decoration:none;">support@pratalent.com</a>
            </p>
            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
              We're excited to help you take the next step in your career.
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
  'Welcome to PRA Talent Intelligence Platform, {{candidate_name}}!

Your account is now active. Browse jobs, build your resume with AI, and complete your profile to get started.

Get started: {{platform_url}}/candidate/dashboard
Browse jobs: {{platform_url}}/candidate/jobs
Complete profile: {{platform_url}}/candidate/profile

Need help? Contact support@pratalent.com',
  '["candidate_name","platform_url"]'::jsonb,
  'transactional'
)
on conflict (key) do update set
  name       = excluded.name,
  subject    = excluded.subject,
  html_body  = excluded.html_body,
  text_body  = excluded.text_body,
  variables  = excluded.variables,
  updated_at = now();

commit;
