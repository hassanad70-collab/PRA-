import fs from "fs";
import os from "os";
import path from "path";

/**
 * Writes a generated test PDF to a real temp file and returns its path.
 * Playwright's setInputFiles({ buffer }) synthesizes an in-memory File via
 * CDP, which was observed corrupting this hand-built PDF's byte offsets on
 * Windows (pdf-parse failed with "bad XRef entry" only when uploaded this
 * way — the exact same bytes parse fine standalone and via a real on-disk
 * file). Passing a real file path uses Playwright's normal OS file-read
 * path instead, which round-trips the bytes exactly.
 */
export function makeTestResumePdfFile(lines: string[]): string {
  const filePath = path.join(os.tmpdir(), `e2e-test-resume-${Date.now()}.pdf`);
  fs.writeFileSync(filePath, makeTestResumePdf(lines));
  return filePath;
}

/** Generates a minimal, valid, text-extractable PDF in-memory. */
export function makeTestResumePdf(lines: string[]): Buffer {
  const content = ["BT", "/F1 11 Tf", "50 740 Td"];
  lines.forEach((line, i) => {
    if (i > 0) content.push("0 -16 Td");
    content.push(`(${line.replace(/[()\\]/g, "")}) Tj`);
  });
  content.push("ET");
  const stream = content.join("\n");

  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/MediaBox[0 0 612 792]/Contents 5 0 R>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
  ];

  let out = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objs.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

export const TEST_RESUME_LINES = [
  "E2E Test Candidate",
  "Software Engineer",
  "e2e.candidate@example.test",
  "",
  "Experience:",
  "Software Engineer at Example Corp, 2020-2024",
  "",
  "Education:",
  "BS Computer Science",
  "",
  "Skills: JavaScript, TypeScript, Testing",
];
