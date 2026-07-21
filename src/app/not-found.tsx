"use client";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-slate-900">404</h1>
          <h2 className="text-2xl font-semibold text-slate-700">Page not found</h2>
          <p className="text-slate-600">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go Home
          </Button>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    </div>
  );
}
