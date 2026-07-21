import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasicInfoForm } from "@/components/candidate/basic-info-form";
import { EducationSection } from "@/components/candidate/education-section";
import { ExperienceSection } from "@/components/candidate/experience-section";
import { SkillsSection } from "@/components/candidate/skills-section";
import { getCandidateFullProfile, getCurrentUser } from "@/lib/queries/candidate";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { candidate, experience, education, skills, languages, projects, certificates } = await getCandidateFullProfile(
    user.id
  );

  if (!candidate) redirect("/candidate/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your profile complete to get the best AI job matches.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Profile completion</span>
              <span className="text-muted-foreground">{candidate.profile_completion_percent}%</span>
            </div>
            <Progress value={candidate.profile_completion_percent} className="mt-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="more">Languages & Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardContent className="pt-6">
              <BasicInfoForm candidate={candidate} />
            </CardContent>
          </Card>
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
                <h3 className="mb-4 font-semibold">Languages</h3>
                {languages.length === 0 && <p className="text-sm text-muted-foreground">No languages added yet.</p>}
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
                <h3 className="mb-4 font-semibold">Certificates</h3>
                {certificates.length === 0 && <p className="text-sm text-muted-foreground">No certificates added yet.</p>}
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
                <h3 className="mb-4 font-semibold">Projects</h3>
                {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects added yet.</p>}
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
