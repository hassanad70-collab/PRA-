import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasicInfoForm } from "@/components/candidate/basic-info-form";
import { EducationSection } from "@/components/candidate/education-section";
import { ExperienceSection } from "@/components/candidate/experience-section";
import { OpenToWorkToggle } from "@/components/candidate/open-to-work-toggle";
import { SkillsSection } from "@/components/candidate/skills-section";
import { getCandidateFullProfile, getCurrentUser } from "@/lib/queries/candidate";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const { candidate, experience, education, skills, languages, projects, certificates } = await getCandidateFullProfile(
    user.id
  );

  if (!candidate) redirect({ href: "/candidate/dashboard", locale });

  const [t, tShared] = await Promise.all([
    getTranslations("Candidate.Profile"),
    getTranslations("Candidate.Shared"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{tShared("profileCompletion")}</span>
              <span className="text-muted-foreground">{candidate.profile_completion_percent}%</span>
            </div>
            <Progress value={candidate.profile_completion_percent} className="mt-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto">
          <TabsTrigger value="basic">{t("tabs.basicInfo")}</TabsTrigger>
          <TabsTrigger value="experience">{t("tabs.experience")}</TabsTrigger>
          <TabsTrigger value="education">{t("tabs.education")}</TabsTrigger>
          <TabsTrigger value="skills">{t("tabs.skills")}</TabsTrigger>
          <TabsTrigger value="more">{t("tabs.more")}</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <BasicInfoForm candidate={candidate} />
            </CardContent>
          </Card>
          <OpenToWorkToggle initialEnabled={candidate.is_open_to_work} />
        </TabsContent>

        <TabsContent value="experience">
          <Card>
            <CardContent className="pt-6">
              <ExperienceSection items={experience} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <Card>
            <CardContent className="pt-6">
              <EducationSection items={education} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardContent className="pt-6">
              <SkillsSection items={skills} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="more">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 font-semibold">{t("languages")}</h3>
                {languages.length === 0 && <p className="text-sm text-muted-foreground">{t("noLanguages")}</p>}
                <div className="space-y-2">
                  {languages.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span>{l.language}</span>
                      <span className="capitalize text-muted-foreground">{l.proficiency}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 font-semibold">{t("certificates")}</h3>
                {certificates.length === 0 && <p className="text-sm text-muted-foreground">{t("noCertificates")}</p>}
                <div className="space-y-2">
                  {certificates.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <p className="font-medium">{c.name}</p>
                      {c.issuing_organization && <p className="text-xs text-muted-foreground">{c.issuing_organization}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardContent className="pt-6">
                <h3 className="mb-4 font-semibold">{t("projects")}</h3>
                {projects.length === 0 && <p className="text-sm text-muted-foreground">{t("noProjects")}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.map((p) => (
                    <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium">{p.name}</p>
                      {p.description && <p className="mt-1 text-muted-foreground">{p.description}</p>}
                      {!!p.technologies?.length && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.technologies.map((t: string) => (
                            <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
