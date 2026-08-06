import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { Settings } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasicInfoForm } from "@/components/candidate/basic-info-form";
import { EducationSection } from "@/components/candidate/education-section";
import { ExperienceSection } from "@/components/candidate/experience-section";
import { OpenToWorkToggle } from "@/components/candidate/open-to-work-toggle";
import { SkillsSection } from "@/components/candidate/skills-section";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getCandidateFullProfile, getCurrentUser } from "@/lib/queries/candidate";

export default async function CandidateSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const { candidate, experience, education, skills, languages, projects, certificates } = await getCandidateFullProfile(
    user.id
  );

  if (!candidate) redirect({ href: "/candidate/dashboard", locale });

  const [t] = await Promise.all([getTranslations("Candidate.Profile")]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your profile, appearance, and preferences.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance & Language</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Language</span>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {candidate!.profile_completion_percent ?? 0}% complete
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={candidate!.profile_completion_percent ?? 0} />
          <OpenToWorkToggle initialEnabled={candidate!.is_open_to_work ?? false} />
        </CardContent>
      </Card>

      <Tabs defaultValue="basicInfo">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="basicInfo">{t("tabs.basicInfo")}</TabsTrigger>
          <TabsTrigger value="experience">{t("tabs.experience")}</TabsTrigger>
          <TabsTrigger value="education">{t("tabs.education")}</TabsTrigger>
          <TabsTrigger value="skills">{t("tabs.skills")}</TabsTrigger>
          <TabsTrigger value="more">{t("tabs.more")}</TabsTrigger>
        </TabsList>

        <TabsContent value="basicInfo" className="mt-6">
          <BasicInfoForm candidate={candidate!} />
        </TabsContent>
        <TabsContent value="experience" className="mt-6">
          <ExperienceSection items={experience} />
        </TabsContent>
        <TabsContent value="education" className="mt-6">
          <EducationSection items={education} />
        </TabsContent>
        <TabsContent value="skills" className="mt-6">
          <SkillsSection items={skills} />
        </TabsContent>
        <TabsContent value="more" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t("languages")}</h3>
              {languages.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noLanguages")}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {languages.map((l) => (
                    <li key={l.id} className="flex items-center justify-between">
                      <span>{l.language}</span>
                      <span className="text-muted-foreground capitalize">{l.proficiency}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t("certificates")}</h3>
              {certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noCertificates")}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {certificates.map((c) => (
                    <li key={c.id}>{c.name}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t("projects")}</h3>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noProjects")}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {projects.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
