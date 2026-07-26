import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FinalizeDraftDialog } from "@/components/candidate/resume-builder/finalize-dialog";
import { ImportResumeDialog } from "@/components/candidate/resume-builder/import-dialog";
import { SectionCard } from "@/components/candidate/resume-builder/section-card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getResumeDraftWithSections } from "@/lib/queries/resume-builder";

export default async function ResumeDraftEditorPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const draft = await getResumeDraftWithSections(draftId);
  if (!draft || draft.candidate_id !== user.id) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/candidate/resume-builder" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> All drafts
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{draft.title}</h1>
            <Badge variant={draft.status === "finalized" ? "success" : "outline"} className="capitalize">
              {draft.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            <ImportResumeDialog draftId={draft.id} />
            <FinalizeDraftDialog draftId={draft.id} />
          </div>
        </div>
        {(draft.finalized_pdf_url || draft.finalized_docx_url) && (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {draft.finalized_pdf_url && (
              <a href={draft.finalized_pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Last PDF download
              </a>
            )}
            {draft.finalized_docx_url && (
              <a href={draft.finalized_docx_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Last Word download
              </a>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {draft.sections.map((section) => (
          <SectionCard key={section.id} draftId={draft.id} section={section} />
        ))}
      </div>
    </div>
  );
}
