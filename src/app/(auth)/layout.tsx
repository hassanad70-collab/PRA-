import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link href="/" className="mb-10 flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          PRA Talent Intelligence
        </Link>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-950 to-fuchsia-950 lg:block">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-10" />
        <div className="relative flex h-full flex-col justify-end p-16 text-white">
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium leading-relaxed">
              &ldquo;PRA cut our time-to-hire in half. AI screening surfaces the right
              candidates instantly instead of us reading hundreds of resumes.&rdquo;
            </p>
            <footer className="text-sm text-white/70">Head of Talent Acquisition</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
