"use client";

import * as React from "react";
import { toast } from "sonner";

import { buildResumeHtml } from "@/lib/resume-studio/preview";
import type { ResumeDraftWithSections, ResumeDraftSection, ResumeDraftVersion } from "@/types/database";
import type { ResumeTemplate } from "@/lib/resume-studio/templates";
import { updateSectionContentStudio, updateSectionOrder, updateTemplate, updateJobDescription, updateDraftTitle } from "@/actions/studio";
import { StudioTopBar } from "./studio-top-bar";
import { StudioLeftPanel } from "./studio-left-panel";
import { StudioCenterPanel } from "./studio-center-panel";
import { StudioRightPanel } from "./studio-right-panel";

export interface StudioState {
  sections: ResumeDraftSection[];
  template: ResumeTemplate;
  jobDescription: string;
  title: string;
}

interface HistoryEntry { sections: ResumeDraftSection[]; template: ResumeTemplate }

const MAX_HISTORY = 50;

interface Props {
  draft: ResumeDraftWithSections;
  versions: ResumeDraftVersion[];
  locale: string;
}

export function StudioEditor({ draft, versions, locale }: Props) {
  const [title, setTitle] = React.useState(draft.title);
  const [sections, setSections] = React.useState<ResumeDraftSection[]>(
    [...draft.sections].sort((a, b) => a.order_index - b.order_index)
  );
  const [template, setTemplate] = React.useState<ResumeTemplate>((draft.template as ResumeTemplate) ?? "modern");
  const [jobDescription, setJobDescription] = React.useState(draft.job_description_text ?? "");
  const [activeSectionId, setActiveSectionId] = React.useState<string | null>(sections[0]?.id ?? null);
  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "unsaved">("saved");
  const [previewHtml, setPreviewHtml] = React.useState(() => buildResumeHtml(sections, template));
  const [versionList, setVersionList] = React.useState<ResumeDraftVersion[]>(versions);

  const historyRef = React.useRef<HistoryEntry[]>([{ sections, template }]);
  const historyIndexRef = React.useRef(0);
  const autosaveTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const previewTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Preview debounce ────────────────────────────────────────────────────
  const schedulePreviewUpdate = React.useCallback((secs: ResumeDraftSection[], tmpl: ResumeTemplate) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      setPreviewHtml(buildResumeHtml(secs, tmpl));
    }, 400);
  }, []);

  // ─── Undo / Redo ─────────────────────────────────────────────────────────
  const pushHistory = React.useCallback((entry: HistoryEntry) => {
    const hist = historyRef.current.slice(0, historyIndexRef.current + 1);
    hist.push(entry);
    if (hist.length > MAX_HISTORY) hist.shift();
    historyRef.current = hist;
    historyIndexRef.current = hist.length - 1;
  }, []);

  const undo = React.useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const { sections: s, template: t } = historyRef.current[historyIndexRef.current];
    setSections(s);
    setTemplate(t);
    schedulePreviewUpdate(s, t);
  }, [schedulePreviewUpdate]);

  const redo = React.useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const { sections: s, template: t } = historyRef.current[historyIndexRef.current];
    setSections(s);
    setTemplate(t);
    schedulePreviewUpdate(s, t);
  }, [schedulePreviewUpdate]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ─── Section content update with autosave ────────────────────────────────
  const handleSectionUpdate = React.useCallback(
    (sectionId: string, content: unknown) => {
      setSections((prev) => {
        const next = prev.map((s) => s.id === sectionId ? { ...s, content: content as ResumeDraftSection["content"] } : s);
        pushHistory({ sections: next, template });
        schedulePreviewUpdate(next, template);
        return next;
      });

      setSaveStatus("unsaved");
      if (autosaveTimers.current[sectionId]) clearTimeout(autosaveTimers.current[sectionId]);
      autosaveTimers.current[sectionId] = setTimeout(async () => {
        setSaveStatus("saving");
        const result = await updateSectionContentStudio(sectionId, draft.id, content);
        setSaveStatus(result.success ? "saved" : "unsaved");
        if (!result.success) toast.error("Autosave failed");
      }, 800);
    },
    [draft.id, template, pushHistory, schedulePreviewUpdate]
  );

  // ─── Section reorder ─────────────────────────────────────────────────────
  const handleReorder = React.useCallback(
    async (orderedIds: string[]) => {
      setSections((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        const next = orderedIds.map((id, i) => ({ ...map.get(id)!, order_index: i }));
        pushHistory({ sections: next, template });
        schedulePreviewUpdate(next, template);
        return next;
      });
      await updateSectionOrder(draft.id, orderedIds);
    },
    [draft.id, template, pushHistory, schedulePreviewUpdate]
  );

  // ─── Template change ─────────────────────────────────────────────────────
  const handleTemplateChange = React.useCallback(
    async (t: ResumeTemplate) => {
      setTemplate(t);
      pushHistory({ sections, template: t });
      schedulePreviewUpdate(sections, t);
      await updateTemplate(draft.id, t);
    },
    [draft.id, sections, pushHistory, schedulePreviewUpdate]
  );

  // ─── Title ───────────────────────────────────────────────────────────────
  const handleTitleChange = React.useCallback(
    async (newTitle: string) => {
      setTitle(newTitle);
      await updateDraftTitle(draft.id, newTitle);
    },
    [draft.id]
  );

  // ─── Job description ─────────────────────────────────────────────────────
  const handleJobDescriptionChange = React.useCallback(
    async (jd: string) => {
      setJobDescription(jd);
      await updateJobDescription(draft.id, jd);
    },
    [draft.id]
  );

  // ─── Restore version ─────────────────────────────────────────────────────
  const handleRestoreVersion = React.useCallback(
    (restored: ResumeDraftSection[], restoredTemplate: ResumeTemplate) => {
      setSections(restored);
      setTemplate(restoredTemplate);
      pushHistory({ sections: restored, template: restoredTemplate });
      schedulePreviewUpdate(restored, restoredTemplate);
      setSaveStatus("saved");
    },
    [pushHistory, schedulePreviewUpdate]
  );

  // ─── Sections in canonical order (filtered to what draft has) ────────────
  const orderedSections = React.useMemo(() => {
    return [...sections].sort((a, b) => a.order_index - b.order_index);
  }, [sections]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <StudioTopBar
        title={title}
        draftId={draft.id}
        saveStatus={saveStatus}
        locale={locale}
        onTitleChange={handleTitleChange}
        onUndo={undo}
        onRedo={redo}
        versions={versionList}
        onVersionSaved={(v) => setVersionList((prev) => [v, ...prev])}
        onVersionRestored={handleRestoreVersion}
      />
      <div className="flex flex-1 overflow-hidden">
        <StudioLeftPanel
          sections={orderedSections}
          activeSectionId={activeSectionId}
          collapsed={leftCollapsed}
          draftId={draft.id}
          jobDescription={jobDescription}
          onSectionSelect={setActiveSectionId}
          onToggleCollapse={() => setLeftCollapsed((c) => !c)}
          onJobDescriptionChange={handleJobDescriptionChange}
        />
        <StudioCenterPanel
          sections={orderedSections}
          activeSectionId={activeSectionId}
          draftId={draft.id}
          onSectionUpdate={handleSectionUpdate}
          onSectionSelect={setActiveSectionId}
          onReorder={handleReorder}
        />
        <StudioRightPanel
          previewHtml={previewHtml}
          template={template}
          collapsed={rightCollapsed}
          onTemplateChange={handleTemplateChange}
          onToggleCollapse={() => setRightCollapsed((c) => !c)}
        />
      </div>
    </div>
  );
}
