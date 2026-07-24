"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeLabels, type AppLocale } from "@/i18n/routing";

/**
 * Switches locale while staying on the equivalent page (via next-intl's
 * locale-aware useRouter/usePathname, so dynamic segments like /jobs/[id]
 * are preserved automatically). Iterating `locales` means a 3rd language
 * needs no change here -- it just appears in the list.
 */
export function LanguageSwitcher() {
  const t = useTranslations("Common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("toggleLanguage")}>
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            disabled={code === locale}
            onClick={() => router.replace(pathname, { locale: code })}
          >
            {localeLabels[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
