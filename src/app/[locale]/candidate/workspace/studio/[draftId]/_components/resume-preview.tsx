"use client";

import * as React from "react";

interface Props {
  html: string;
  zoom: number;
}

export function ResumePreview({ html, zoom }: Props) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument ?? frame.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/30 py-6">
      <div
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top center",
          width: 794,
          minHeight: 1123,
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          background: "#fff",
        }}
      >
        <iframe
          ref={iframeRef}
          title="Resume Preview"
          sandbox="allow-same-origin"
          style={{ width: 794, height: 1123, border: "none", display: "block" }}
        />
      </div>
    </div>
  );
}
