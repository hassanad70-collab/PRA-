import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsSectionForm, type SettingField } from "@/components/admin/settings-section-form";
import { getSystemSettings } from "@/lib/queries/admin";
import type { SystemSettingKey } from "@/types/database";

const SECTIONS: { key: SystemSettingKey; label: string; fields: SettingField[] }[] = [
  {
    key: "general",
    label: "General",
    fields: [
      { name: "platform_name", label: "Platform name", type: "text" },
      { name: "support_email", label: "Support email", type: "email" },
      { name: "default_timezone", label: "Default timezone", type: "text" },
      { name: "maintenance_mode", label: "Maintenance mode", type: "boolean" },
    ],
  },
  {
    key: "email",
    label: "Email",
    fields: [
      { name: "from_name", label: "From name", type: "text" },
      { name: "from_email", label: "From email", type: "email" },
      { name: "notify_on_application", label: "Notify recruiters on new application", type: "boolean" },
      { name: "notify_on_status_change", label: "Notify candidates on status change", type: "boolean" },
    ],
  },
  {
    key: "ai",
    label: "AI",
    fields: [
      { name: "resume_parsing_enabled", label: "Resume parsing enabled", type: "boolean" },
      { name: "ats_scoring_enabled", label: "ATS scoring enabled", type: "boolean" },
      { name: "job_matching_enabled", label: "Job matching enabled", type: "boolean" },
      { name: "min_match_similarity", label: "Minimum match similarity (0-1)", type: "number", step: "0.05" },
    ],
  },
  {
    key: "storage",
    label: "Storage",
    fields: [
      { name: "max_resume_size_mb", label: "Max resume size (MB)", type: "number" },
      { name: "resume_retention_days", label: "Resume retention (days)", type: "number" },
    ],
  },
  {
    key: "security",
    label: "Security",
    fields: [
      { name: "require_email_confirmation", label: "Require email confirmation", type: "boolean" },
      { name: "session_timeout_minutes", label: "Session timeout (minutes)", type: "number" },
      { name: "min_password_length", label: "Minimum password length", type: "number" },
    ],
  },
];

export default async function AdminSettingsPage() {
  const settings = await getSystemSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide configuration. Changes apply immediately.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-5">
          {SECTIONS.map((section) => (
            <TabsTrigger key={section.key} value={section.key}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map((section) => {
          const row = settings.get(section.key);
          return (
            <TabsContent key={section.key} value={section.key}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{section.label} settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <SettingsSectionForm
                    settingKey={section.key}
                    fields={section.fields}
                    value={(row?.value as Record<string, unknown>) ?? {}}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
