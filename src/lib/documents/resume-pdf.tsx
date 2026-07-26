import "server-only";

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ResumeDraftWithSections,
  ResumeSectionContentMap,
} from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  name: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  contactLine: { fontSize: 9, color: "#4b5563", marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 6, textTransform: "uppercase", color: "#1f2937" },
  entryTitle: { fontSize: 10.5, fontWeight: 700 },
  entrySubtitle: { fontSize: 9.5, color: "#374151", marginBottom: 2 },
  entryMeta: { fontSize: 8.5, color: "#6b7280", marginBottom: 3 },
  paragraph: { fontSize: 9.5, lineHeight: 1.4, marginBottom: 6 },
  bullet: { fontSize: 9.5, lineHeight: 1.4, marginBottom: 2 },
  entryBlock: { marginBottom: 8 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillChip: { fontSize: 8.5, backgroundColor: "#f3f4f6", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3, marginRight: 4, marginBottom: 4 },
});

function section<T extends keyof ResumeSectionContentMap>(
  sections: ResumeDraftWithSections["sections"],
  type: T
): ResumeSectionContentMap[T] | undefined {
  return sections.find((s) => s.section_type === type)?.content as ResumeSectionContentMap[T] | undefined;
}

function dateRange(start?: string, end?: string, isCurrent?: boolean) {
  const parts = [start, isCurrent ? "Present" : end].filter(Boolean);
  return parts.join(" – ");
}

function ResumeDocument({ draft }: { draft: ResumeDraftWithSections }) {
  const personal = section(draft.sections, "personal_info");
  const summary = section(draft.sections, "summary");
  const experience = (section(draft.sections, "experience") ?? []) as ResumeSectionContentMap["experience"];
  const education = (section(draft.sections, "education") ?? []) as ResumeSectionContentMap["education"];
  const skills = section(draft.sections, "skills");
  const certifications = (section(draft.sections, "certifications") ?? []) as ResumeSectionContentMap["certifications"];
  const languages = (section(draft.sections, "languages") ?? []) as ResumeSectionContentMap["languages"];
  const projects = (section(draft.sections, "projects") ?? []) as ResumeSectionContentMap["projects"];
  const achievements = (section(draft.sections, "achievements") ?? []) as ResumeSectionContentMap["achievements"];
  const social = section(draft.sections, "social_links");

  const contactParts = [personal?.email, personal?.phone, personal?.address].filter(Boolean);
  const socialParts = [social?.linkedin_url, social?.github_url, social?.portfolio_url, social?.website_url].filter(Boolean);

  return (
    <Document title={draft.title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{personal?.full_name ?? draft.title}</Text>
        {personal?.current_position && <Text style={styles.contactLine}>{personal.current_position}</Text>}
        {!!contactParts.length && <Text style={styles.contactLine}>{contactParts.join(" · ")}</Text>}
        {!!socialParts.length && <Text style={styles.contactLine}>{socialParts.join(" · ")}</Text>}

        {summary?.text && (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.paragraph}>{summary.text}</Text>
          </View>
        )}

        {experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experience.map((e, i) => (
              <View key={i} style={styles.entryBlock}>
                <Text style={styles.entryTitle}>{e.job_title}</Text>
                <Text style={styles.entrySubtitle}>
                  {e.company_name}
                  {e.location ? ` · ${e.location}` : ""}
                </Text>
                <Text style={styles.entryMeta}>{dateRange(e.start_date, e.end_date, e.is_current)}</Text>
                {(e.description ?? "").split("\n").filter(Boolean).map((line, j) => (
                  <Text key={j} style={styles.bullet}>
                    • {line}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((e, i) => (
              <View key={i} style={styles.entryBlock}>
                <Text style={styles.entryTitle}>{e.institution}</Text>
                <Text style={styles.entrySubtitle}>{[e.degree, e.field_of_study].filter(Boolean).join(", ")}</Text>
                <Text style={styles.entryMeta}>{dateRange(e.start_date, e.end_date)}</Text>
              </View>
            ))}
          </View>
        )}

        {!!skills?.items?.length && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsRow}>
              {skills.items.map((s, i) => (
                <Text key={i} style={styles.skillChip}>
                  {s}
                </Text>
              ))}
            </View>
          </View>
        )}

        {projects.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.map((p, i) => (
              <View key={i} style={styles.entryBlock}>
                <Text style={styles.entryTitle}>{p.name}</Text>
                {p.description && <Text style={styles.paragraph}>{p.description}</Text>}
                {!!p.technologies?.length && <Text style={styles.entryMeta}>{p.technologies.join(", ")}</Text>}
              </View>
            ))}
          </View>
        )}

        {certifications.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {certifications.map((c, i) => (
              <Text key={i} style={styles.bullet}>
                {c.name}
                {c.issuing_organization ? ` — ${c.issuing_organization}` : ""}
                {c.issue_date ? ` (${c.issue_date})` : ""}
              </Text>
            ))}
          </View>
        )}

        {achievements.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {achievements.map((a, i) => (
              <Text key={i} style={styles.bullet}>
                • {a.title}
                {a.description ? ` — ${a.description}` : ""}
              </Text>
            ))}
          </View>
        )}

        {languages.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Languages</Text>
            <Text style={styles.paragraph}>
              {languages.map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`).join(" · ")}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

/**
 * Renders a finalized draft to PDF and uploads it to the same private
 * "resumes" storage bucket uploaded resumes already use (see
 * src/actions/resume.ts's uploadResume), under a generated/ prefix so it
 * never collides with an uploaded file's path. Returns a 7-day signed URL,
 * matching that same existing pattern.
 */
export async function generateResumePdf(
  draft: ResumeDraftWithSections,
  candidateId: string,
  supabase: SupabaseClient
): Promise<string> {
  const buffer = await renderToBuffer(<ResumeDocument draft={draft} />);
  const filePath = `${candidateId}/generated/${draft.id}-${Date.now()}.pdf`;

  const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(filePath, 60 * 60 * 24 * 7);
  if (error || !data) throw new Error(error?.message ?? "Failed to generate a download link.");
  return data.signedUrl;
}
