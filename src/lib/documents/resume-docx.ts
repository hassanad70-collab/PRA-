import "server-only";

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResumeDraftWithSections, ResumeSectionContentMap } from "@/types/database";

function section<T extends keyof ResumeSectionContentMap>(
  sections: ResumeDraftWithSections["sections"],
  type: T
): ResumeSectionContentMap[T] | undefined {
  return sections.find((s) => s.section_type === type)?.content as ResumeSectionContentMap[T] | undefined;
}

function dateRange(start?: string, end?: string, isCurrent?: boolean) {
  return [start, isCurrent ? "Present" : end].filter(Boolean).join(" – ");
}

function heading(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
}

function buildDocxParagraphs(draft: ResumeDraftWithSections): Paragraph[] {
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

  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: personal?.full_name ?? draft.title, bold: true, size: 32 })],
    }),
  ];

  if (personal?.current_position) {
    paragraphs.push(new Paragraph({ text: personal.current_position, spacing: { after: 40 } }));
  }
  const contactParts = [personal?.email, personal?.phone, personal?.address].filter(Boolean);
  if (contactParts.length) paragraphs.push(new Paragraph({ text: contactParts.join(" · "), spacing: { after: 40 } }));
  const socialParts = [social?.linkedin_url, social?.github_url, social?.portfolio_url, social?.website_url].filter(Boolean);
  if (socialParts.length) paragraphs.push(new Paragraph({ text: socialParts.join(" · "), spacing: { after: 120 } }));

  if (summary?.text) {
    paragraphs.push(heading("Summary"));
    paragraphs.push(new Paragraph({ text: summary.text }));
  }

  if (experience.length) {
    paragraphs.push(heading("Experience"));
    for (const e of experience) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: e.job_title, bold: true })], spacing: { before: 120 } }));
      paragraphs.push(new Paragraph({ text: [e.company_name, e.location].filter(Boolean).join(" · ") }));
      paragraphs.push(new Paragraph({ text: dateRange(e.start_date, e.end_date, e.is_current), spacing: { after: 40 } }));
      for (const line of (e.description ?? "").split("\n").filter(Boolean)) {
        paragraphs.push(new Paragraph({ text: line, bullet: { level: 0 } }));
      }
    }
  }

  if (education.length) {
    paragraphs.push(heading("Education"));
    for (const e of education) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: e.institution, bold: true })], spacing: { before: 120 } }));
      paragraphs.push(new Paragraph({ text: [e.degree, e.field_of_study].filter(Boolean).join(", ") }));
      paragraphs.push(new Paragraph({ text: dateRange(e.start_date, e.end_date) }));
    }
  }

  if (skills?.items?.length) {
    paragraphs.push(heading("Skills"));
    paragraphs.push(new Paragraph({ text: skills.items.join(" · ") }));
  }

  if (projects.length) {
    paragraphs.push(heading("Projects"));
    for (const p of projects) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: p.name, bold: true })], spacing: { before: 120 } }));
      if (p.description) paragraphs.push(new Paragraph({ text: p.description }));
      if (p.technologies?.length) paragraphs.push(new Paragraph({ text: p.technologies.join(", ") }));
    }
  }

  if (certifications.length) {
    paragraphs.push(heading("Certifications"));
    for (const c of certifications) {
      paragraphs.push(
        new Paragraph({
          text: [c.name, c.issuing_organization, c.issue_date].filter(Boolean).join(" — "),
          bullet: { level: 0 },
        })
      );
    }
  }

  if (achievements.length) {
    paragraphs.push(heading("Achievements"));
    for (const a of achievements) {
      paragraphs.push(new Paragraph({ text: [a.title, a.description].filter(Boolean).join(" — "), bullet: { level: 0 } }));
    }
  }

  if (languages.length) {
    paragraphs.push(heading("Languages"));
    paragraphs.push(
      new Paragraph({ text: languages.map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`).join(" · ") })
    );
  }

  return paragraphs;
}

/** DOCX counterpart to generateResumePdf -- same storage bucket/path convention, same signed-URL lifetime. */
export async function generateResumeDocx(
  draft: ResumeDraftWithSections,
  candidateId: string,
  supabase: SupabaseClient
): Promise<string> {
  const doc = new Document({
    sections: [{ properties: {}, children: buildDocxParagraphs(draft) }],
  });
  const buffer = await Packer.toBuffer(doc);
  const filePath = `${candidateId}/generated/${draft.id}-${Date.now()}.docx`;

  const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, buffer, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(filePath, 60 * 60 * 24 * 7);
  if (error || !data) throw new Error(error?.message ?? "Failed to generate a download link.");
  return data.signedUrl;
}
