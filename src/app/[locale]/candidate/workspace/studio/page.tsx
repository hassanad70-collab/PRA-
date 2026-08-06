import { redirect } from "@/i18n/navigation";
import { PenLine } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getResumeDrafts } from "@/lib/queries/resume-builder";
import { formatDate } from "@/lib/utils";
import { CreateDraftButton } from "@/components/candidate/resume-builder/create-draft-button";

export default async function ResumeStudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const drafts = await getResumeDrafts(user.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resume Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and polish your resume section by section with AI assistance.
          </p>
        </div>
        <CreateDraftButton />
      </div>

      {drafts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <PenLine className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-medium">No resume drafts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {"Create your first draft — we'll pre-fill sections from your profile automatically."}
              </p>
            </div>
            <CreateDraftButton />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {drafts.map((draft) => (
          <Link key={draft.id} href={`/${locale}/candidate/resume-builder/${draft.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
              <CardContent className="flex flex-col justify-between gap-4 pt-6 h-full">
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
    </div>
  );
}
