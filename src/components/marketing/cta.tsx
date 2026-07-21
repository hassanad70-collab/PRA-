import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-8 py-16 text-center text-white sm:px-16">
          <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-10" />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to cut recruitment work by 80%?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/80">
            Join hiring teams using PRA to screen, rank, and match candidates automatically.
          </p>
          <div className="relative mt-8 flex justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
