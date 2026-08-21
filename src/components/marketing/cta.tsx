import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function CTA() {
  const t = useTranslations("Home.Cta");
  const tCommon = useTranslations("Common");

  return (
    <section className="py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pra-navy via-pra-primary to-pra-primary-hover px-8 py-16 text-center text-white sm:px-16">
          <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-10" />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/80">{t("subtitle")}</p>
          <div className="relative mt-8 flex justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                {tCommon("getStartedFree")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
