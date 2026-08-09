import { redirect } from "@/i18n/navigation";
import { FileText, FolderOpen } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCandidateFullProfile, getCurrentUser } from "@/lib/queries/candidate";
import { getResumeDrafts } from "@/lib/queries/resume-builder";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const supabase = await createClient();
  const [{ resumes }, drafts] = await Promise.all([
    getCandidateFullProfile(user.id),
    getResumeDrafts(user.id),
  ]);

  const finalizedDrafts = drafts.filter((d) => d.status === "finalized");

  // Re-sign every resume URL at request time — the stored file_url is either
  // null (new uploads) or a 7-day signed URL that may be expired. The "resumes"
  // bucket is private, so getPublicUrl() always 403s. Generate a fresh 1-hour
  // signed URL from file_path each time this page renders.
  const resumesWithUrls = await Promise.all(
    resumes.map(async (r) => {
      if (!r.file_path) return { ...r, viewUrl: null };
      const { data: signed } = await supabase.storage
        .from("resumes")
        .createSignedUrl(r.file_path, 60 * 60);
      return { ...r, viewUrl: signed?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All your career documents in one place — uploaded resumes and finalized resume drafts.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Uploaded Resumes ({resumes.length})</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/candidate/workspace/resumes`}>Manage</Link>
          </Button>
        </div>

        {resumesWithUrls.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No resumes uploaded yet.{" "}
              <Link href={`/${locale}/candidate/resume`} className="underline">
                Upload one
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {resumesWithUrls.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between gap-4 pt-4 pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.file_name}</p>
                      <p className="text-xs text-muted-foreground">Uploaded {formatDate(r.uploaded_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.is_primary && <Badge variant="success">Primary</Badge>}
                    {r.viewUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={r.viewUrl} target="_blank" rel="noopener noreferrer">View</a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Finalized Drafts ({finalizedDrafts.length})
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/candidate/workspace/studio`}>Resume Studio</Link>
          </Button>
        </div>

        {finalizedDrafts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No finalized drafts yet.{" "}
              <Link href={`/${locale}/candidate/workspace/studio`} className="underline">
                Build one in Resume Studio
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {finalizedDrafts.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between gap-4 pt-4 pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">Last edited {formatDate(d.updated_at)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${locale}/candidate/resume-builder/${d.id}`}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
