import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { GuestAtsChecker } from "@/components/guest/guest-ats-checker";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics/track";
import { readGuestSessionId } from "@/lib/guest/session";
import { getCurrentUser } from "@/lib/queries/candidate";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { softwareApplicationSchema } from "@/lib/seo/schema";

const PATH = "/ai-tools/ats-checker";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.atsChecker" });
  return buildMetadata({ title: t("title"), description: t("description"), path: PATH, locale: locale as AppLocale });
}

export default async function AtsCheckerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  // /candidate/resume now lives inside the [locale] tree (as of the
  // Candidate Portal Internationalization unit).
  if (user?.role === "candidate") redirect({ href: "/candidate/resume", locale });

  const guestSessionId = await readGuestSessionId();
  await trackEvent("ats_checker_page_view", { guestSessionId });

  const t = await getTranslations("AtsChecker");

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={softwareApplicationSchema(PATH)} />
      <Navbar />
      <main id="main-content" className="flex-1">
        <div className="container max-w-3xl py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
            <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="mt-10">
            <GuestAtsChecker />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
