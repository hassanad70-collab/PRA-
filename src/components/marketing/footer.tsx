import Image from "next/image";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Common");
  const tFooter = useTranslations("Footer");

  const FOOTER_LINKS = {
    "Career Tools": [
      { label: t("atsChecker"), href: "/ai-tools/ats-checker" },
      { label: "AI Resume Builder", href: "/ai-tools/resume-builder" },
      { label: "Cover Letter Generator", href: "/ai-tools/cover-letter" },
      { label: "Interview Preparation", href: "/ai-tools/interview-prep" },
      { label: "AI Career Advisor", href: "/ai-tools/career-advisor" },
    ],
    "For Employers": [
      { label: "For Companies", href: "/companies" },
      { label: "Platform Features", href: "/companies#features" },
      { label: "Pricing", href: "/companies#pricing" },
      { label: "Book a Demo", href: "/companies#contact" },
    ],
    [tFooter("companyTitle")]: [
      { label: tFooter("about"), href: "#" },
      { label: tFooter("contact"), href: "#" },
      { label: tFooter("privacyPolicy"), href: "#" },
      { label: tFooter("termsOfService"), href: "#" },
    ],
  };

  return (
    <footer className="border-t border-border py-16">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Image src="/pra-logo.webp" alt="PRA" width={32} height={32} className="h-8 w-8 object-contain" />
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
