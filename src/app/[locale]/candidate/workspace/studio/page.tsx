import { redirect, Link } from "@/i18n/navigation";
import { ArrowLeft, PenLine, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getActiveDrafts } from "@/lib/queries/studio";
import { formatDate } from "@/lib/utils";
import { CreateDraftButton } from "@/components/candidate/resume-builder/create-draft-button";

export default async function ResumeStudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const drafts = await getActiveDrafts(user.id);

  return (
    // Fixed overlay that sits above the dashboard shell
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Link
            href={{ pathname: "/candidate/workspace" }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <PenLine className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Resume Studio</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        <CreateDraftButton />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {drafts.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <PenLine className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">No resume drafts yet</p>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                    Create your first draft — we&apos;ll pre-fill sections from your profile automatically.
                  </p>
                </div>
                <CreateDraftButton />
              </CardContent>
            </Card>
          )}

          {drafts.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Drafts</h2>
                <p className="text-sm text-muted-foreground">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* New draft card */}
                <div className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/40 hover:bg-accent">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">New Draft</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Start from your profile</p>
                  </div>
                  <CreateDraftButton />
                </div>

                {drafts.map((draft) => (
                  <Link key={draft.id} href={`/candidate/workspace/studio/${draft.id}` as Parameters<typeof Link>[0]["href"]}>
                    <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                      <CardContent className="flex flex-col justify-between gap-4 pt-6 h-full min-h-[160px]">
                        <div>
                          <p className="font-medium truncate">{draft.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Last edited {formatDate(draft.updated_at)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={
                              draft.status === "finalized"
                                ? "success"
                                : draft.status === "draft"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="capitalize"
                          >
                            {draft.status}
                          </Badge>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
