export type ResumeTemplate =
  | "modern"
  | "professional"
  | "executive"
  | "minimal"
  | "creative"
  | "academic"
  | "corporate";

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  "modern",
  "professional",
  "executive",
  "minimal",
  "creative",
  "academic",
  "corporate",
];

export interface TemplateConfig {
  id: ResumeTemplate;
  name: string;
  description: string;
  accent: string;
  accentLight: string;
  text: string;
  mutedText: string;
  bg: string;
  sidebarBg?: string;
  sidebarText?: string;
  headingFont: string;
  bodyFont: string;
  layout: "single" | "two-column";
  sectionHeaderStyle: "underline" | "filled" | "allcaps" | "sidebar-rule";
  nameFontSize: string;
  sectionFontSize: string;
}

export const TEMPLATE_CONFIGS: Record<ResumeTemplate, TemplateConfig> = {
  modern: {
    id: "modern",
    name: "Modern",
    description: "Clean lines with a bold blue accent. Great for tech and business roles.",
    accent: "#2563EB",
    accentLight: "#DBEAFE",
    text: "#111827",
    mutedText: "#4B5563",
    bg: "#FFFFFF",
    headingFont: "system-ui, -apple-system, sans-serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    layout: "single",
    sectionHeaderStyle: "underline",
    nameFontSize: "26px",
    sectionFontSize: "13px",
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "Conservative and formal. Ideal for finance, law, and corporate roles.",
    accent: "#1E293B",
    accentLight: "#F1F5F9",
    text: "#1E293B",
    mutedText: "#475569",
    bg: "#FFFFFF",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    layout: "single",
    sectionHeaderStyle: "filled",
    nameFontSize: "24px",
    sectionFontSize: "12px",
  },
  executive: {
    id: "executive",
    name: "Executive",
    description: "Two-column with a dark sidebar. Commands authority at senior levels.",
    accent: "#0F172A",
    accentLight: "#E2E8F0",
    text: "#0F172A",
    mutedText: "#334155",
    bg: "#FFFFFF",
    sidebarBg: "#0F172A",
    sidebarText: "#F8FAFC",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    layout: "two-column",
    sectionHeaderStyle: "allcaps",
    nameFontSize: "24px",
    sectionFontSize: "11px",
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Generous whitespace, no frills. Lets your content speak for itself.",
    accent: "#6B7280",
    accentLight: "#F9FAFB",
    text: "#111827",
    mutedText: "#6B7280",
    bg: "#FFFFFF",
    headingFont: "system-ui, -apple-system, sans-serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    layout: "single",
    sectionHeaderStyle: "allcaps",
    nameFontSize: "28px",
    sectionFontSize: "11px",
  },
  creative: {
    id: "creative",
    name: "Creative",
    description: "Vibrant two-column with violet accents. Stands out for design and media.",
    accent: "#7C3AED",
    accentLight: "#EDE9FE",
    text: "#1F1235",
    mutedText: "#4B3F72",
    bg: "#FFFFFF",
    sidebarBg: "#7C3AED",
    sidebarText: "#F5F3FF",
    headingFont: "system-ui, -apple-system, sans-serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    layout: "two-column",
    sectionHeaderStyle: "sidebar-rule",
    nameFontSize: "26px",
    sectionFontSize: "12px",
  },
  academic: {
    id: "academic",
    name: "Academic",
    description: "Publication-friendly layout in green. Ideal for researchers and professors.",
    accent: "#15803D",
    accentLight: "#DCFCE7",
    text: "#14532D",
    mutedText: "#166534",
    bg: "#FFFFFF",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Georgia, 'Times New Roman', serif",
    layout: "single",
    sectionHeaderStyle: "underline",
    nameFontSize: "24px",
    sectionFontSize: "12px",
  },
  corporate: {
    id: "corporate",
    name: "Corporate",
    description: "Bold red header strip with strong dividers. Signals ambition and drive.",
    accent: "#DC2626",
    accentLight: "#FEE2E2",
    text: "#111827",
    mutedText: "#374151",
    bg: "#FFFFFF",
    headingFont: "system-ui, -apple-system, sans-serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    layout: "single",
    sectionHeaderStyle: "filled",
    nameFontSize: "26px",
    sectionFontSize: "12px",
  },
};
