import mammoth from "mammoth";

import type { SupportedFileType } from "@/types/database";

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

/**
 * Extracts plain text from a supported document buffer. PDF and DOCX are
 * parsed structurally; TXT and Markdown are passed through (Markdown is
 * kept as-is rather than rendered, so headings and structure still read
 * naturally in chunked form).
 */
export async function extractText(buffer: Buffer, fileType: SupportedFileType): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractPdf(buffer);
    case "docx":
      return extractDocx(buffer);
    case "txt":
    case "md":
      return buffer.toString("utf-8");
    default: {
      const exhaustive: never = fileType;
      throw new ExtractionError(`Unsupported file type: ${exhaustive}`);
    }
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2 exposes a class-based API (PDFParse) rather than the
  // older single-function export.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = result.text?.trim();
    if (!text) {
      throw new ExtractionError(
        "No extractable text found in this PDF. It may be a scanned image without an OCR layer."
      );
    }
    return text;
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "unknown error"}`
    );
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim();
    if (!text) {
      throw new ExtractionError("No extractable text found in this Word document.");
    }
    return text;
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

/** Maps a MIME type or file extension to our internal SupportedFileType. */
export function detectFileType(fileName: string, mimeType: string): SupportedFileType | null {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  )
    return "docx";
  if (mimeType === "text/markdown" || ext === "md" || ext === "markdown") return "md";
  if (mimeType === "text/plain" || ext === "txt") return "txt";

  return null;
}
