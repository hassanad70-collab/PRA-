import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/queries/candidate";
import { redirect } from "@/i18n/navigation";
import { getStudioDraft, getDraftVersions } from "@/lib/queries/studio";
import { StudioEditor } from "./_components/studio-editor";

export default async function ResumeSudioEditorPage({
  params,
}: {
  params: Promise<{ draftId: string; locale: string }>;
}) {
  const { draftId, locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [draft, versions] = await Promise.all([
    getStudioDraft(draftId, user.id),
    getDraftVersions(draftId, user.id),
  ]);

  if (!draft) notFound();

  return (
    <StudioEditor
      draft={draft}
      versions={versions}
      locale={locale}
    />
  );
}
