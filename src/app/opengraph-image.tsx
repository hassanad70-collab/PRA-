import { ImageResponse } from "next/og";

// Node.js runtime (the app's only runtime elsewhere) rather than edge --
// ImageResponse works fine on Node.js since Next.js 13.3+, and edge here
// was the suspected cause of dynamic route ([id]/[slug]) 404s in
// production that didn't reproduce with a local `next start` of the same
// build. Mixing edge and Node.js runtimes in one app is a known source of
// Vercel-specific routing quirks; removing the mix is the safer fix than
// investigating exactly which Vercel routing layer was affected.
export const alt = "PRA Talent Intelligence — AI Career Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default OG image for every public page that doesn't define its own
// (Next.js's file-convention fallback). Generated at request time via
// ImageResponse rather than a static asset -- this repo has no public/
// directory at all, and a generated image stays in sync with the brand's
// existing gradient identity without needing a design tool.
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            ✦
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "white" }}>PRA Talent Intelligence</div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, color: "white", textAlign: "center", padding: "0 80px" }}>
          Your AI Career Platform
        </div>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.85)", marginTop: 20 }}>
          Free ATS Resume Checker · AI Recruitment · Talent Intelligence
        </div>
      </div>
    ),
    { ...size }
  );
}
