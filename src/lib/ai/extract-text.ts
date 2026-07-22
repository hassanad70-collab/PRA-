import "server-only";

// pdf-parse (v1.1.4, wrapping an old pinned pdf.js build) has a reproducible
// cold-start defect: in a fresh process, its first several calls throw
// "bad XRef entry" on perfectly well-formed input — confirmed by parsing the
// exact same byte buffer in a loop, which fails deterministically for a
// bounded number of calls and then succeeds every time after. On serverless
// (each new function instance starts cold), a real user's resume could be
// the first upload that instance ever processes, so this isn't just a test
// artifact. Retrying absorbs that warm-up cost inside the request instead of
// surfacing a spurious "could not read this file" failure to the candidate.
const PDF_PARSE_MAX_ATTEMPTS = 10;

/**
 * Extracts plain text from an uploaded resume file buffer.
 * Supports PDF and DOCX/DOC. Throws for unsupported types.
 */
export async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= PDF_PARSE_MAX_ATTEMPTS; attempt++) {
      try {
        const result = await pdfParse(buffer);
        return result.text;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported resume file type: ${mimeType}`);
}
