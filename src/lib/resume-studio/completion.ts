import type { ResumeDraftSection } from "@/types/database";

export interface SectionCompletion {
  pct: number;
  issues: string[];
  status: "complete" | "partial" | "empty";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countFilledFields(obj: Record<string, any>, keys: string[]): number {
  return keys.filter((k) => {
    const v = obj[k];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;
}

export function computeSectionCompletion(section: ResumeDraftSection): SectionCompletion {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = section.content as any;
  const type = section.section_type;

  if (section.status === "empty" || !c) {
    return { pct: 0, issues: ["Section is empty"], status: "empty" };
  }

  let pct = 0;
  const issues: string[] = [];

  switch (type) {
    case "personal_info": {
      const required = ["full_name", "email"];
      const optional = ["phone", "address", "current_position"];
      const reqFilled = countFilledFields(c, required);
      const optFilled = countFilledFields(c, optional);
      pct = Math.round((reqFilled / required.length) * 60 + (optFilled / optional.length) * 40);
      if (!c.full_name) issues.push("Full name is required");
      if (!c.email) issues.push("Email is required");
      if (!c.current_position) issues.push("Add your current job title");
      break;
    }

    case "summary": {
      const len = (c.text ?? "").length;
      if (len === 0) { pct = 0; issues.push("Summary is empty"); }
      else if (len < 100) { pct = 40; issues.push("Summary is too short (aim for 100+ characters)"); }
      else if (len < 200) { pct = 70; issues.push("Consider expanding your summary"); }
      else { pct = 100; }
      break;
    }

    case "experience": {
      const entries = Array.isArray(c) ? c : [];
      if (entries.length === 0) { pct = 0; issues.push("Add at least one position"); break; }
      const complete = entries.filter(
        (e: Record<string, unknown>) => e.job_title && e.company_name && (e.description ?? "")
      ).length;
      pct = Math.round((complete / entries.length) * 100);
      if (entries.some((e: Record<string, unknown>) => !e.description)) issues.push("Add descriptions to all positions");
      if (entries.some((e: Record<string, unknown>) => !e.start_date)) issues.push("Add dates to all positions");
      break;
    }

    case "education": {
      const entries = Array.isArray(c) ? c : [];
      if (entries.length === 0) { pct = 0; issues.push("Add at least one degree"); break; }
      pct = Math.min(100, entries.length * 50);
      break;
    }

    case "skills": {
      const items: string[] = Array.isArray(c?.items) ? c.items : [];
      if (items.length === 0) { pct = 0; issues.push("Add your skills"); }
      else if (items.length < 5) { pct = 50; issues.push("Add at least 5 skills"); }
      else if (items.length < 10) { pct = 80; }
      else { pct = 100; }
      break;
    }

    case "interests": {
      const items: string[] = Array.isArray(c?.items) ? c.items : [];
      pct = items.length === 0 ? 0 : items.length < 3 ? 60 : 100;
      if (items.length === 0) issues.push("Add your interests");
      break;
    }

    case "social_links": {
      const filled = countFilledFields(c, ["linkedin_url", "github_url", "portfolio_url", "website_url"]);
      pct = Math.min(100, filled * 33);
      if (filled === 0) issues.push("Add at least one social link");
      break;
    }

    default: {
      // All other array sections
      const entries = Array.isArray(c) ? c : [];
      if (entries.length === 0) { pct = 0; issues.push("Section is empty"); break; }
      pct = Math.min(100, entries.length >= 3 ? 100 : entries.length * 33);
      break;
    }
  }

  const status: SectionCompletion["status"] =
    pct === 100 ? "complete" : pct === 0 ? "empty" : "partial";

  return { pct, issues, status };
}
