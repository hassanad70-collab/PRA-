import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { ResumeIntelligenceClient } from "@/components/recruiter/resume-intelligence-client";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";

export default async function ResumeIntelligencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const t = await getTranslations("Recruiter.ResumeIntelligence");

  // Candidates who applied to jobs at this company
  const supabase = await createClient();
  const { data: apps } = await supabase
    .from("applications")
    .select("candidate_id, candidate:candidates(id, current_position, profile:profiles(full_name))")
    .eq("jobs.company_id", recruiter.company_id)
    .limit(200);

  // Deduplicate by candidate_id
  const seen = new Set<string>();
  const candidates: { id: string; name: string; position: string | null }[] = [];
  for (const app of apps ?? []) {
    if (!app.candidate_id || seen.has(app.candidate_id)) continue;
    seen.add(app.candidate_id);
    const c = app.candidate as unknown as { id: string; current_position: string | null; profile: { full_name: string } | null } | null;
    if (c) {
      candidates.push({
        id: c.id,
        name: c.profile?.full_name ?? "Candidate",
        position: c.current_position,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { count: candidates.length })}</p>
      </div>
      <ResumeIntelligenceClient
        candidates={candidates}
        labels={{
          searchPlaceholder: t("searchPlaceholder"),
          selectCandidate: t("selectCandidate"),
          noResumes: t("noResumes"),
          atsScore: t("atsScore"),
          keywords: t("keywords"),
          gaps: t("gaps"),
          skills: t("skills"),
          summary: t("summary"),
          experience: t("experience"),
          education: t("education"),
          loadFailed: t("loadFailed"),
        }}
      />
    </div>
  );
}
