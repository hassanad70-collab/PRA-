"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">Something went wrong</h1>
          <p className="text-slate-600">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>
        </div>

        {error.message && (
          <div className="rounded-lg bg-red-50 p-4 text-left">
            <p className="text-sm text-red-600">
              <strong>Error:</strong> {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go Home
          </Button>
          <Button onClick={() => reset()}>Try Again</Button>
        </div>
      </div>
    </div>
  );
}
