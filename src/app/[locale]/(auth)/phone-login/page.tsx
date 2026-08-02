import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PhoneOtpForm } from "@/components/auth/phone-otp-form";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.phoneLogin" });
  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/phone-login",
    locale: locale as AppLocale,
    noIndex: true,
  });
}

export default function PhoneLoginPage() {
  return <PhoneOtpForm />;
}
