import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Common");
  const tFooter = useTranslations("Footer");

  const FOOTER_LINKS = {
    [tFooter("productTitle")]: [
      { label: t("atsChecker"), href: "/ai-tools/ats-checker" },
      { label: t("features"), href: "#features" },
      { label: t("howItWorks"), href: "#how-it-works" },
      { label: t("aiRecruitment"), href: "#ai" },
      { label: tFooter("pricing"), href: "#" },
    ],
    [tFooter("companyTitle")]: [
      { label: tFooter("about"), href: "#" },
      { label: tFooter("careers"), href: "#" },
      { label: tFooter("blog"), href: "#" },
      { label: tFooter("contact"), href: "#" },
    ],
    [tFooter("legalTitle")]: [
      { label: tFooter("privacyPolicy"), href: "#" },
      { label: tFooter("termsOfService"), href: "#" },
      { label: tFooter("security"), href: "#" },
    ],
  };

  return (
    <footer className="border-t border-border py-16">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-blue-500 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              {t("brand")}
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{tFooter("tagline")}</p>
          </div>
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold">{title}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center gap-4 border-t border-border pt-8 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>{tFooter("copyright", { year: new Date().getFullYear() })}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
