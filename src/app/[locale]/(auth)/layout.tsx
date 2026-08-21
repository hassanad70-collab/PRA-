import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Common");
  const tLayout = useTranslations("Auth.Layout");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link href="/" className="mb-10 flex items-center gap-2 text-lg font-semibold">
          <Image src="/pra-logo.webp" alt="PRA" width={40} height={40} className="h-10 w-10 object-contain" />
          {t("brand")}
        </Link>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 lg:block">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-10" />
        <div className="relative flex h-full flex-col justify-end p-16 text-white">
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium leading-relaxed">{tLayout("quote")}</p>
            <footer className="text-sm text-white/70">{tLayout("quoteAttribution")}</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
