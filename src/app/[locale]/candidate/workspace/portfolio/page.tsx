import { redirect } from "@/i18n/navigation";

import { getCurrentUser } from "@/lib/queries/candidate";
import { listPortfolioItems, getPortfolioSettings } from "@/lib/workspace/queries";
import { PortfolioManager } from "@/components/workspace/portfolio-manager";

export default async function PortfolioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [items, settings] = await Promise.all([
    listPortfolioItems(user.id),
    getPortfolioSettings(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Portfolio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Showcase your projects, publications, and designs. Enable the public toggle to share with recruiters.
        </p>
      </div>

      <PortfolioManager
        initialItems={items}
        initialIsPublic={settings.isPublic}
        initialSlug={settings.slug}
      />
    </div>
  );
}
