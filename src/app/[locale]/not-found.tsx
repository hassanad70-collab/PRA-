"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const router = useRouter();
  const t = useTranslations("Common");

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="max-w-md space-y-6 px-4 text-center">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">{t("pageNotFound")}</h2>
          <p className="text-muted-foreground">{t("pageNotFoundDescription")}</p>
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/">{t("goHome")}</Link>
          </Button>
          <Button onClick={() => router.back()}>{t("goBack")}</Button>
        </div>
      </div>
    </div>
  );
}
