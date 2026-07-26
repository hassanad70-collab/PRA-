import { redirect } from "next/navigation";
import Link from "next/link";
import { FileEdit, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getResumeDrafts } from "@/lib/queries/resume-builder";
import { formatRelativeTime } from "@/lib/utils";
import { CreateDraftButton } from "@/components/candidate/resume-builder/create-draft-button";

export default async function ResumeBuilderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const drafts = await getResumeDrafts(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" /> AI Resume Builder
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a resume from your profile, let AI polish the wording, and export it as PDF or Word.
          </p>
        </div>
        {drafts.length > 0 && <CreateDraftButton />}
      </div>

      <div className="space-y-3">
        {drafts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <FileEdit className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No resume drafts yet. Create one and we&apos;ll start it from your profile.
              </p>
              <CreateDraftButton />
            </CardContent>
          </Card>
        )}
        {drafts.map((draft) => (
          <Link key={draft.id} href={`/candidate/resume-builder/${draft.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{draft.title}</h3>
                    <Badge variant={draft.status === "finalized" ? "success" : "outline"} className="capitalize">
                      {draft.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Updated {formatRelativeTime(draft.updated_at)}</p>
                </div>
                <Button variant="outline" size="sm">
                  Open
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
