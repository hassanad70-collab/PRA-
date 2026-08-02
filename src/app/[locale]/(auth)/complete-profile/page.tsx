import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CompleteProfileForm } from "@/components/auth/complete-profile-form";
import { getRedirectLocale } from "@/i18n/get-redirect-locale";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo/metadata";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.completeProfile" });
  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/complete-profile",
    locale: locale as AppLocale,
    noIndex: true,
  });
}

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getRedirectLocale();
    redirect(`/${locale}/login`);
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  // Strip the phone-placeholder full_name so the form field starts blank,
  // prompting the user to enter their real name.
  const rawName = profile?.full_name ?? "";
  const defaultFullName =
    rawName && rawName !== user.phone && !rawName.match(/^\+[1-9]\d{6,14}$/) ? rawName : "";

  const hasPhone = Boolean(user.phone || profile?.phone);

  return (
    <CompleteProfileForm
      defaultFullName={defaultFullName}
      defaultPhone={hasPhone ? undefined : ""}
      hasPhone={hasPhone}
    />
  );
}
