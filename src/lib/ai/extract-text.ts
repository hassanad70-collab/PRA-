import "server-only";

// pdf-parse (v1.1.4, wrapping an old pinned pdf.js build) has a reproducible
// cold-start defect: in a fresh process, its first several calls throw
// "bad XRef entry" on perfectly well-formed input. Isolated, direct
// benchmarking of this exact behavior (parsing an identical in-memory
// buffer in a tight loop across many fresh processes) consistently needed
// exactly 7 failed attempts before succeeding on the 8th, every time.
// However, a real request that reads the upload through Next.js's actual
// multipart/FormData pipeline has been observed exhausting a 10-attempt
// cap in a way the isolated benchmark never did -- the exact mechanism
// wasn't pinned down (see the try/catch below, which now logs the
// underlying error so a recurrence is diagnosable), but each attempt costs
// only tens of milliseconds, so a much larger cap costs virtually nothing
// while meaningfully reducing the chance of exhausting it. On serverless,
// a real user's resume could be the first upload a cold function instance
// ever processes, so this isn't just a test artifact.
const PDF_PARSE_MAX_ATTEMPTS = 25;

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
    console.error(
      `extractTextFromFile: pdf-parse failed on all ${PDF_PARSE_MAX_ATTEMPTS} attempts`,
      lastErr
    );
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
