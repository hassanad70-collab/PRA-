import { redirect } from "@/i18n/navigation";

export default async function LegacyResumeBuilderDraftPage({ params }: { params: Promise<{ locale: string; draftId: string }> }) {
  const { locale, draftId } = await params;
  redirect({ href: `/candidate/workspace/studio/${draftId}`, locale });
}
