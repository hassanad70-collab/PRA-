import { redirect } from "next/navigation";

import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { GuestAtsChecker } from "@/components/guest/guest-ats-checker";
import { trackEvent } from "@/lib/analytics/track";
import { readGuestSessionId } from "@/lib/guest/session";
import { getCurrentUser } from "@/lib/queries/candidate";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { softwareApplicationSchema } from "@/lib/seo/schema";

const PATH = "/ai-tools/ats-checker";

export const metadata = buildMetadata({
  title: "Free AI Resume Checker — Instant ATS Score",
  description:
    "Get an instant, AI-powered ATS compatibility score for your resume. Free, no account required.",
  path: PATH,
});

export default async function AtsCheckerPage() {
  const user = await getCurrentUser();
  if (user?.role === "candidate") redirect("/candidate/resume");

  const guestSessionId = await readGuestSessionId();
  await trackEvent("ats_checker_page_view", { guestSessionId });

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={softwareApplicationSchema(PATH)} />
      <Navbar />
      <main className="flex-1">
        <div className="container max-w-3xl py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Free AI Resume Checker</h1>
            <p className="mt-3 text-muted-foreground">
              Get an instant, AI-powered ATS compatibility score — no account required. Your first
              analysis is completely free.
            </p>
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
