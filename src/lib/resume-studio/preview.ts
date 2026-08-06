import type { ResumeDraftSection } from "@/types/database";
import { TEMPLATE_CONFIGS, type ResumeTemplate, type TemplateConfig } from "./templates";

function s(v: unknown): string { return (v == null || v === undefined) ? "" : String(v); }

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dateRange(start?: string, end?: string, isCurrent?: boolean): string {
  const parts = [start, isCurrent ? "Present" : end].filter(Boolean);
  return parts.join(" – ");
}

function get<T>(sections: ResumeDraftSection[], type: string): T | undefined {
  return sections.find((s) => s.section_type === type)?.content as T | undefined;
}

function buildCss(cfg: TemplateConfig): string {
  const sectionHeader = {
    underline: `
      .section-title { border-bottom: 2px solid ${cfg.accent}; padding-bottom: 4px; margin-bottom: 12px; color: ${cfg.accent}; }
    `,
    filled: `
      .section-title { background: ${cfg.accentLight}; color: ${cfg.accent}; padding: 4px 10px; border-left: 4px solid ${cfg.accent}; margin-bottom: 12px; }
    `,
    allcaps: `
      .section-title { letter-spacing: 2px; text-transform: uppercase; border-bottom: 1px solid ${cfg.mutedText}40; padding-bottom: 4px; margin-bottom: 12px; color: ${cfg.mutedText}; }
    `,
    "sidebar-rule": `
      .section-title { border-bottom: 2px solid ${cfg.accent}; padding-bottom: 4px; margin-bottom: 12px; color: ${cfg.accent}; }
    `,
  }[cfg.sectionHeaderStyle];

  const twoColumnStyles = cfg.layout === "two-column"
    ? `
      .resume-body { display: flex; gap: 0; }
      .col-sidebar { width: 200px; min-width: 200px; background: ${cfg.sidebarBg}; color: ${cfg.sidebarText}; padding: 20px 16px; }
      .col-sidebar .section-title { color: ${cfg.sidebarText}; border-color: ${cfg.sidebarText}60; }
      .col-sidebar .entry-sub, .col-sidebar .entry-meta, .col-sidebar p { color: ${cfg.sidebarText}cc; }
      .col-main { flex: 1; padding: 20px; }
    `
    : `
      .resume-body { padding: 20px 24px; }
    `;

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${cfg.bodyFont}; font-size: 10pt; color: ${cfg.text}; background: ${cfg.bg}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .resume-page { width: 794px; min-height: 1123px; margin: 0 auto; background: ${cfg.bg}; }
    .resume-header { background: ${cfg.layout === "two-column" && cfg.sidebarBg ? cfg.sidebarBg : cfg.bg};
      ${cfg.layout === "single" && cfg.sectionHeaderStyle === "filled" ? `border-bottom: 4px solid ${cfg.accent};` : ""}
      ${cfg.sectionHeaderStyle === "allcaps" ? `border-bottom: 3px solid ${cfg.accent};` : ""}
      padding: ${cfg.layout === "two-column" ? "24px 20px 20px" : "24px 24px 16px"}; }
    .name { font-family: ${cfg.headingFont}; font-size: ${cfg.nameFontSize}; font-weight: 700;
      color: ${cfg.layout === "two-column" && cfg.sidebarBg ? (cfg.sidebarText ?? cfg.text) : cfg.accent}; }
    .headline { font-size: 11pt; margin-top: 2px;
      color: ${cfg.layout === "two-column" && cfg.sidebarBg ? (cfg.sidebarText ?? cfg.mutedText) + "cc" : cfg.mutedText}; }
    .contact-line { font-size: 9pt; margin-top: 6px;
      color: ${cfg.layout === "two-column" && cfg.sidebarBg ? (cfg.sidebarText ?? cfg.mutedText) + "99" : cfg.mutedText}; }
    .contact-line a { color: inherit; text-decoration: none; }
    ${twoColumnStyles}
    .section { margin-bottom: 16px; }
    .section-title { font-family: ${cfg.headingFont}; font-size: ${cfg.sectionFontSize}; font-weight: 700; }
    .entry { margin-bottom: 10px; }
    .entry-title { font-size: 10.5pt; font-weight: 600; }
    .entry-sub { font-size: 9.5pt; color: ${cfg.mutedText}; }
    .entry-meta { font-size: 8.5pt; color: ${cfg.mutedText}; margin: 2px 0; }
    .entry-desc { font-size: 9pt; line-height: 1.5; margin-top: 4px; }
    .bullet { font-size: 9pt; line-height: 1.5; padding-left: 14px; position: relative; }
    .bullet::before { content: "•"; position: absolute; left: 4px; }
    .skills-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-chip { font-size: 8.5pt; background: ${cfg.accentLight}; color: ${cfg.accent};
      padding: 2px 8px; border-radius: 20px; }
    p { font-size: 9pt; line-height: 1.5; }
    ${sectionHeader}
  `;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderSection(type: string, content: any, label: string): string {
  if (!content) return "";

  const entries = Array.isArray(content) ? content : [];

  const inner = (() => {
    switch (type) {
      case "summary":
        return content.text ? `<p>${esc(content.text)}</p>` : "";
      case "skills":
        return (content.items?.length ?? 0) > 0
          ? `<div class="skills-wrap">${content.items.map((s: string) => `<span class="skill-chip">${esc(s)}</span>`).join("")}</div>`
          : "";
      case "interests":
        return (content.items?.length ?? 0) > 0
          ? `<div class="skills-wrap">${content.items.map((s: string) => `<span class="skill-chip">${esc(s)}</span>`).join("")}</div>`
          : "";
      case "experience":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${esc(s(e.job_title))}</div>
            <div class="entry-sub">${esc(s(e.company_name))}${e.location ? ` · ${esc(s(e.location))}` : ""}</div>
            <div class="entry-meta">${esc(dateRange(s(e.start_date), s(e.end_date), Boolean(e.is_current)))}</div>
            ${s(e.description).split("\n").filter(Boolean).map((l: string) => `<div class="bullet">${esc(l.replace(/^[-•]\s*/, ""))}</div>`).join("")}
          </div>`).join("");
      case "education":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${esc(s(e.institution))}</div>
            <div class="entry-sub">${[s(e.degree), s(e.field_of_study)].filter(Boolean).join(", ")}</div>
            <div class="entry-meta">${esc(dateRange(s(e.start_date), s(e.end_date)))}${e.grade ? ` · ${esc(s(e.grade))}` : ""}</div>
          </div>`).join("");
      case "certifications":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${esc(s(e.name))}</div>
            <div class="entry-sub">${esc(s(e.issuing_organization))}${e.issue_date ? ` · ${esc(s(e.issue_date))}` : ""}</div>
          </div>`).join("");
      case "languages":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <span class="entry-title">${esc(s(e.language))}</span>
            ${e.proficiency ? `<span class="entry-sub"> · ${esc(s(e.proficiency))}</span>` : ""}
          </div>`).join("");
      case "projects":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${esc(s(e.name))}</div>
            ${e.technologies && Array.isArray(e.technologies) && e.technologies.length > 0
              ? `<div class="entry-meta">${esc((e.technologies as string[]).join(", "))}</div>` : ""}
            ${e.description ? `<div class="entry-desc">${esc(s(e.description))}</div>` : ""}
          </div>`).join("");
      case "achievements":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${esc(s(e.title))}</div>
            ${e.description ? `<div class="entry-desc">${esc(s(e.description))}</div>` : ""}
          </div>`).join("");
      case "volunteer":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${esc(s(e.role))} at ${esc(s(e.organization))}</div>
            <div class="entry-meta">${esc(dateRange(s(e.start_date), s(e.end_date), Boolean(e.is_current)))}</div>
            ${e.description ? `<div class="entry-desc">${esc(s(e.description))}</div>` : ""}
          </div>`).join("");
      case "publications":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${e.url ? `<a href="${esc(s(e.url))}">${esc(s(e.title))}</a>` : esc(s(e.title))}</div>
            <div class="entry-sub">${esc(s(e.publisher))}${e.date ? ` · ${esc(s(e.date))}` : ""}</div>
            ${e.description ? `<div class="entry-desc">${esc(s(e.description))}</div>` : ""}
          </div>`).join("");
      case "awards":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${esc(s(e.title))}</div>
            <div class="entry-sub">${esc(s(e.issuer))}${e.date ? ` · ${esc(s(e.date))}` : ""}</div>
            ${e.description ? `<div class="entry-desc">${esc(s(e.description))}</div>` : ""}
          </div>`).join("");
      case "courses":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${esc(s(e.name))}</div>
            <div class="entry-sub">${esc(s(e.provider))}${e.date ? ` · ${esc(s(e.date))}` : ""}</div>
          </div>`).join("");
      case "references":
        return entries.map((e: Record<string, unknown>) => `
          <div class="entry">
            <div class="entry-title">${esc(s(e.name))}</div>
            <div class="entry-sub">${[s(e.title), s(e.company)].filter(Boolean).join(" at ")}</div>
            ${e.email ? `<div class="entry-meta">${esc(s(e.email))}${e.phone ? ` · ${esc(s(e.phone))}` : ""}</div>` : ""}
          </div>`).join("");
      case "social_links": {
        const links = [
          { label: "LinkedIn", url: content.linkedin_url },
          { label: "GitHub", url: content.github_url },
          { label: "Portfolio", url: content.portfolio_url },
          { label: "Website", url: content.website_url },
        ].filter((l) => l.url);
        return links.map((l) => `<div class="entry-meta"><a href="${esc(l.url)}">${esc(l.label)}: ${esc(l.url)}</a></div>`).join("");
      }
      default:
        return "";
    }
  })();

  if (!inner.trim()) return "";

  return `
    <div class="section">
      <div class="section-title">${esc(label)}</div>
      ${inner}
    </div>`;
}

export interface BuildResumeHtmlOptions {
  title?: string;
  zoom?: number;
}

export function buildResumeHtml(
  sections: ResumeDraftSection[],
  template: ResumeTemplate,
  opts: BuildResumeHtmlOptions = {}
): string {
  const cfg = TEMPLATE_CONFIGS[template];
  const css = buildCss(cfg);

  const personal = get<Record<string, unknown>>(sections, "personal_info");
  const social = get<Record<string, unknown>>(sections, "social_links");

  const contactParts = [personal?.email, personal?.phone, personal?.address].filter(Boolean) as string[];
  const socialParts = [social?.linkedin_url, social?.github_url, social?.portfolio_url, social?.website_url].filter(Boolean) as string[];

  const SECTION_LABELS: Record<string, string> = {
    summary: "Professional Summary",
    experience: "Work Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    languages: "Languages",
    achievements: "Achievements",
    social_links: "Social Links",
    volunteer: "Volunteer Experience",
    publications: "Publications",
    references: "References",
    interests: "Interests",
    awards: "Awards & Honors",
    courses: "Courses",
  };

  const nonHeaderSections = sections
    .filter((s) => s.section_type !== "personal_info")
    .sort((a, b) => a.order_index - b.order_index);

  if (cfg.layout === "two-column") {
    const SIDEBAR_SECTIONS = ["skills", "languages", "certifications", "interests", "social_links", "references"];
    const sidebarSections = nonHeaderSections.filter((s) => SIDEBAR_SECTIONS.includes(s.section_type));
    const mainSections = nonHeaderSections.filter((s) => !SIDEBAR_SECTIONS.includes(s.section_type));

    const sidebarHtml = sidebarSections.map((sec) =>
      renderSection(sec.section_type, sec.content, SECTION_LABELS[sec.section_type] ?? sec.section_type)
    ).join("");

    const mainHtml = mainSections.map((sec) =>
      renderSection(sec.section_type, sec.content, SECTION_LABELS[sec.section_type] ?? sec.section_type)
    ).join("");

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>
<div class="resume-page">
  <div class="resume-header">
    <div class="name">${esc(s(personal?.full_name) || opts.title || "Your Name")}</div>
    ${personal?.current_position ? `<div class="headline">${esc(s(personal.current_position))}</div>` : ""}
    ${contactParts.length ? `<div class="contact-line">${contactParts.map(esc).join(" · ")}</div>` : ""}
  </div>
  <div class="resume-body">
    <div class="col-sidebar">${sidebarHtml}</div>
    <div class="col-main">${mainHtml}</div>
  </div>
</div>
</body>
</html>`;
  }

  const bodyHtml = nonHeaderSections.map((sec) =>
    renderSection(sec.section_type, sec.content, SECTION_LABELS[sec.section_type] ?? sec.section_type)
  ).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>
<div class="resume-page">
  <div class="resume-header">
    <div class="name">${esc(s(personal?.full_name) || opts.title || "Your Name")}</div>
    ${personal?.current_position ? `<div class="headline">${esc(s(personal.current_position))}</div>` : ""}
    ${contactParts.length ? `<div class="contact-line">${contactParts.map(esc).join(" · ")}</div>` : ""}
    ${socialParts.length ? `<div class="contact-line">${socialParts.map(esc).join(" · ")}</div>` : ""}
  </div>
  <div class="resume-body">${bodyHtml}</div>
</div>
</body>
</html>`;
}
