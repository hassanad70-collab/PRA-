import "server-only";

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import type { ComparisonCandidate } from "@/lib/queries/applications";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: "Helvetica", color: "#111827" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  table: { display: "flex", flexDirection: "column" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#111827" },
  labelCell: { width: 100, padding: 6, fontWeight: 700, backgroundColor: "#f9fafb" },
  cell: { flex: 1, padding: 6 },
  headerCell: { flex: 1, padding: 6, fontWeight: 700 },
});

/** Ephemeral, no-storage-persistence PDF (unlike resume-pdf.tsx's finalized
 * resumes, a comparison snapshot isn't a candidate-owned document -- it's
 * streamed directly to the recruiter, generated fresh each time). */
function ComparisonDocument({ candidates, jobTitle }: { candidates: ComparisonCandidate[]; jobTitle: string }) {
  const rows: { label: string; values: string[] }[] = [
    {
      label: "Experience",
      values: candidates.map((c) => `${c.profile.candidate?.years_of_experience ?? 0} yrs / ${c.profile.experience.length} roles`),
    },
    {
      label: "Career Progression",
      values: candidates.map((c) => c.profile.experience.map((e) => e.job_title).slice(0, 3).join(" -> ") || "-"),
    },
    { label: "Education", values: candidates.map((c) => c.profile.education[0]?.institution ?? "-") },
    { label: "Skills", values: candidates.map((c) => c.profile.skills.slice(0, 6).map((s) => s.skill_name).join(", ") || "-") },
    { label: "ATS Score", values: candidates.map((c) => String(c.atsScore ?? "-")) },
    { label: "AI Score", values: candidates.map((c) => String(c.aiScore ?? "-")) },
    { label: "Interview Status", values: candidates.map((c) => c.interviewStatus ?? "Not yet interviewed") },
    { label: "Languages", values: candidates.map((c) => c.profile.languages.map((l) => l.language).join(", ") || "-") },
    { label: "Certifications", values: candidates.map((c) => c.profile.certificates.map((cert) => cert.name).join(", ") || "-") },
    {
      label: "Expected Salary",
      values: candidates.map((c) =>
        c.expectedSalary?.min || c.expectedSalary?.max
          ? `${c.expectedSalary.min ?? "-"} - ${c.expectedSalary.max ?? "-"} ${c.expectedSalary.currency}`
          : "Not shared"
      ),
    },
    { label: "Recommendation", values: candidates.map((c) => c.interviewRecommendation?.replace("_", " ") ?? "-") },
  ];

  return (
    <Document title={`${jobTitle} - Candidate Comparison`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Candidate Comparison — {jobTitle}</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.labelCell}></Text>
            {candidates.map((c) => (
              <Text key={c.applicationId} style={styles.headerCell}>
                {c.fullName}
              </Text>
            ))}
          </View>
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.labelCell}>{row.label}</Text>
              {row.values.map((v, i) => (
                <Text key={i} style={styles.cell}>
                  {v}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function generateComparisonPdf(candidates: ComparisonCandidate[], jobTitle: string): Promise<Buffer> {
  return renderToBuffer(<ComparisonDocument candidates={candidates} jobTitle={jobTitle} />);
}
