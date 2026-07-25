"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Fires on every Core Web Vital (CLS, FCP, INP, LCP, TTFB) for every real
 * visitor, forwarding each one to /api/web-vitals -> the existing
 * analytics_events table. `sendBeacon` (falling back to a keepalive fetch)
 * so the report still goes out even as the page is unloading, which is
 * when several of these metrics (LCP, CLS) actually finalize.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const payload = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      path: window.location.pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/web-vitals", payload);
    } else {
      fetch("/api/web-vitals", { body: payload, method: "POST", keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  });

  return null;
}
