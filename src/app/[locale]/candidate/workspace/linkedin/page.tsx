import { redirect } from "@/i18n/navigation";

import { getCurrentUser } from "@/lib/queries/candidate";
import { listLinkedInSuggestions } from "@/lib/workspace/queries";
import { LinkedInOptimizerClient } from "@/components/workspace/linkedin-optimizer-client";

export default async function LinkedInOptimizerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const suggestions = await listLinkedInSuggestions(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">LinkedIn Optimizer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste any LinkedIn section and get an AI-optimized version with relevant keywords.
        </p>
      </div>

      <LinkedInOptimizerClient initialSuggestions={suggestions} />
    </div>
  );
}
