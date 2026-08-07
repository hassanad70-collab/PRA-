import { notFound } from "next/navigation";
import { ExternalLink, Globe } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { getPublicPortfolio } from "@/lib/workspace/queries";
import type { PortfolioItem } from "@/types/database";

const TYPE_LABELS: Record<PortfolioItem["type"], string> = {
  project: "Project",
  publication: "Publication",
  design: "Design",
  other: "Other",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await getPublicPortfolio(slug);
  if (!portfolio) return { title: "Portfolio Not Found" };

  return {
    title: `${portfolio.candidateName} — Portfolio`,
    description: portfolio.headline ?? `Portfolio of ${portfolio.candidateName}`,
  };
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const portfolio = await getPublicPortfolio(slug);
  if (!portfolio) notFound();

  const { candidateName, headline, items } = portfolio;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
              {candidateName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{candidateName}</h1>
              {headline && <p className="text-sm text-muted-foreground">{headline}</p>}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-10">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No portfolio items have been added yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </h2>
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {TYPE_LABELS[item.type]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    {item.technologies.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.technologies.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[11px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {item.link_url && (
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Portfolio powered by{" "}
          <span className="font-medium text-foreground">PRA Talent Intelligence</span>
        </p>
      </footer>
    </div>
  );
}
