"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="max-w-md space-y-6 px-4 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">{t("somethingWentWrong")}</h1>
          <p className="text-muted-foreground">{t("unexpectedErrorDescription")}</p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
          )}
        </div>

        {isDev && error.message && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-left">
            <p className="text-sm text-destructive">
              <strong>Dev only:</strong> {error.message}
            </p>
          </div>
        )}

        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/">{t("goHome")}</Link>
          </Button>
          <Button onClick={() => reset()}>{t("tryAgain")}</Button>
        </div>
      </div>
    </div>
  );
}
