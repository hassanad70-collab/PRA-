import { redirect } from "@/i18n/navigation";

export default async function LegacyResumeBuilderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/candidate/workspace/studio", locale });
}
