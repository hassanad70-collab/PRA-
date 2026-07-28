import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ComparisonExportButton } from "@/components/recruiter/comparison-export-button";
import { getApplicationsForComparison, type ComparisonCandidate } from "@/lib/queries/applications";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getJobById, getRecruiterContext } from "@/lib/queries/jobs";
import { initials } from "@/lib/utils";

const MAX_COMPARE = 4;

function summarizeCareerProgression(profile: ComparisonCandidate["profile"]) {
  const roles = profile.experience.map((e) => e.job_title).filter(Boolean);
  return roles;
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const { id: jobId, locale } = await params;
  const { ids } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const job = await getJobById(jobId);
  if (!job || job.company_id !== recruiter.company_id) notFound();

  const t = await getTranslations("Recruiter.Comparison");

  const applicationIds = (ids ?? "").split(",").filter(Boolean).slice(0, MAX_COMPARE);
  const candidates = applicationIds.length >= 2 ? await getApplicationsForComparison(applicationIds) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href={`/recruiter/jobs/${jobId}/candidates`} className="text-sm text-muted-foreground hover:underline">
            ← {t("backToCandidates")}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t("title")}</h1>
          {candidates.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { count: candidates.length, job: job.title })}</p>
          )}
        </div>
        {candidates.length > 0 && (
          <ComparisonExportButton
            applicationIds={applicationIds}
            labels={{ export: t("exportPdf"), exporting: t("exporting"), failed: t("exportFailed") }}
          />
        )}
      </div>

      {candidates.length < 2 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("noneSelected", { max: MAX_COMPARE })}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-40 p-3 text-start"></th>
                {candidates.map((c) => (
                  <th key={c.applicationId} className="p-3 text-start">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(c.fullName || "?")}
                      </div>
                      <span className="font-semibold">{c.fullName}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ComparisonRow label={t("rowExperience")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top">
                    {t("yearsExp", { years: c.profile.candidate?.years_of_experience ?? 0 })} ·{" "}
                    {t("rolesCount", { count: c.profile.experience.length })}
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowCareerProgression")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top text-xs text-muted-foreground">
                    {summarizeCareerProgression(c.profile).slice(0, 3).join(" → ") || t("noData")}
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowEducation")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top text-xs text-muted-foreground">
                    {c.profile.education[0]?.institution ?? t("noData")}
                    {c.profile.education[0]?.degree ? ` · ${c.profile.education[0].degree}` : ""}
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowSkills")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.profile.skills.slice(0, 8).map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-xs">
                          {s.skill_name}
                        </Badge>
                      ))}
                      {c.profile.skills.length === 0 && <span className="text-xs text-muted-foreground">{t("noData")}</span>}
                    </div>
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowAtsScore")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top font-semibold">
                    {c.atsScore ?? t("noData")}
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowAiScore")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top font-semibold">
                    {c.aiScore ?? t("noData")}
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowInterviewStatus")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top">
                    {c.interviewStatus ? <Badge variant="outline">{c.interviewStatus}</Badge> : <span className="text-xs text-muted-foreground">{t("noInterviewYet")}</span>}
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowLanguages")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top text-xs text-muted-foreground">
                    {c.profile.languages.map((l) => l.language).join(", ") || t("noData")}
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowCertifications")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top text-xs text-muted-foreground">
                    {c.profile.certificates.map((cert) => cert.name).join(", ") || t("noData")}
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowExpectedSalary")}>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top">
                    {c.expectedSalary?.min || c.expectedSalary?.max
                      ? `${c.expectedSalary.min ?? "—"} - ${c.expectedSalary.max ?? "—"} ${c.expectedSalary.currency}`
                      : t("salaryNotShared")}
                  </td>
                ))}
              </ComparisonRow>

              <ComparisonRow label={t("rowRecommendation")} last>
                {candidates.map((c) => (
                  <td key={c.applicationId} className="p-3 align-top">
                    {c.interviewRecommendation ? (
                      <Badge
                        variant={
                          c.interviewRecommendation === "strong_yes" || c.interviewRecommendation === "yes"
                            ? "success"
                            : c.interviewRecommendation === "no" || c.interviewRecommendation === "strong_no"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {c.interviewRecommendation.replace("_", " ")}
                      </Badge>
                    ) : (
                      t("noData")
                    )}
                  </td>
                ))}
              </ComparisonRow>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ComparisonRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <tr className={last ? "" : "border-b border-border"}>
      <td className="p-3 align-top text-xs font-medium uppercase text-muted-foreground">{label}</td>
      {children}
    </tr>
  );
}
