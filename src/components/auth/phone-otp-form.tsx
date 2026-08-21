"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Phone, ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPhoneOtp, verifyPhoneOtp } from "@/actions/auth";
import { Link } from "@/i18n/navigation";

// Curated country code list covering major markets.
const COUNTRY_CODES = [
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+965", label: "Kuwait (+965)" },
  { code: "+974", label: "Qatar (+974)" },
  { code: "+973", label: "Bahrain (+973)" },
  { code: "+968", label: "Oman (+968)" },
  { code: "+962", label: "Jordan (+962)" },
  { code: "+961", label: "Lebanon (+961)" },
  { code: "+20", label: "Egypt (+20)" },
  { code: "+212", label: "Morocco (+212)" },
  { code: "+213", label: "Algeria (+213)" },
  { code: "+216", label: "Tunisia (+216)" },
  { code: "+92", label: "Pakistan (+92)" },
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "United States (+1)" },
  { code: "+1", label: "Canada (+1)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
  { code: "+90", label: "Turkey (+90)" },
  { code: "+234", label: "Nigeria (+234)" },
  { code: "+254", label: "Kenya (+254)" },
  { code: "+27", label: "South Africa (+27)" },
];

const OTP_RESEND_SECONDS = 60;

export function PhoneOtpForm() {
  const t = useTranslations("Auth.PhoneLogin");
  const tCommon = useTranslations("Common");

  const [step, setStep] = React.useState<"phone" | "otp">("phone");
  const [countryCode, setCountryCode] = React.useState("+966");
  const [nationalNumber, setNationalNumber] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [resendSeconds, setResendSeconds] = React.useState(0);
  const otpInputRef = React.useRef<HTMLInputElement>(null);

  // Strip whitespace AND leading zeros (trunk prefix — e.g. Egypt 01012… → 1012…).
  const normalizedNational = nationalNumber.replace(/\s/g, "").replace(/^0+/, "");
  const phone = `${countryCode}${normalizedNational}`;

  // Countdown timer for OTP resend.
  React.useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!nationalNumber.trim()) {
      toast.error(t("enterPhoneNumber"));
      return;
    }

    const formData = new FormData();
    formData.set("phone", phone);

    startTransition(async () => {
      const result = await sendPhoneOtp(formData);
      if (!result.success) {
        toast.error(result.error ?? tCommon("somethingWentWrong"));
        return;
      }
      setStep("otp");
      setResendSeconds(OTP_RESEND_SECONDS);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    });
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error(t("enterFullCode"));
      return;
    }

    const formData = new FormData();
    formData.set("phone", phone);
    formData.set("token", otp);

    startTransition(async () => {
      const result = await verifyPhoneOtp(formData);
      if (result && !result.success) {
        toast.error(result.error ?? tCommon("somethingWentWrong"));
        setOtp("");
        otpInputRef.current?.focus();
      }
      // On success the server action redirects — no client-side handling needed.
    });
  }

  function handleResend() {
    if (resendSeconds > 0 || isPending) return;
    setOtp("");

    const formData = new FormData();
    formData.set("phone", phone);

    startTransition(async () => {
      const result = await sendPhoneOtp(formData);
      if (!result.success) {
        toast.error(result.error ?? tCommon("somethingWentWrong"));
        return;
      }
      setResendSeconds(OTP_RESEND_SECONDS);
      toast.success(t("codeSent"));
      setTimeout(() => otpInputRef.current?.focus(), 100);
    });
  }

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("verifyTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("verifySubtitle")} <span className="font-medium text-foreground">{phone}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp-code">{t("otpLabel")}</Label>
            <Input
              id="otp-code"
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-xl tracking-[0.5em] font-mono"
              disabled={isPending}
            />
          </div>

          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            size="lg"
            disabled={isPending || otp.length < 6}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("verifyButton")}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => { setStep("phone"); setOtp(""); }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            disabled={isPending}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("changeNumber")}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendSeconds > 0 || isPending}
            className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendSeconds > 0 ? t("resendIn", { seconds: resendSeconds }) : t("resendCode")}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t("orSignIn")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("emailLink")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSendOtp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="country-code">{t("countryLabel")}</Label>
          <select
            id="country-code"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            disabled={isPending}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {COUNTRY_CODES.map((c, i) => (
              <option key={`${c.code}-${i}`} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone-number">{t("phoneLabel")}</Label>
          <div className="flex items-center gap-2">
            <span className="flex h-10 min-w-[60px] items-center justify-center rounded-md border border-input bg-muted px-3 text-sm font-medium">
              {countryCode}
            </span>
            <Input
              id="phone-number"
              type="tel"
              inputMode="numeric"
              placeholder="501 234 567"
              value={nationalNumber}
              onChange={(e) => setNationalNumber(e.target.value.replace(/[^\d\s]/g, ""))}
              disabled={isPending}
              autoComplete="tel-national"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("phonePlaceholderHint")}</p>
        </div>

        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          size="lg"
          disabled={isPending || !nationalNumber.trim()}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          {t("sendOtpButton")}
        </Button>
      </form>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">{t("secureNote")}</p>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("orSignIn")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("emailLink")}
        </Link>
      </p>
    </div>
  );
}
