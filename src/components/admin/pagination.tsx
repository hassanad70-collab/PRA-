import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageCount,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {pageCount} · {total} total
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildHref(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Link>
          </Button>
        )}
        {page >= pageCount ? (
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildHref(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
