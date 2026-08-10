import fs from "fs";
import { PDFParse } from "pdf-parse";

const PLAIN_TEXT_EXTENSIONS = ["txt", "md", "eml", "csv", "vtt", "srt", "log"];

export const SUPPORTED_INTAKE_LABEL = "PDF, TXT, MD, EML, CSV, VTT, or SRT";

function extOf(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}

// Intake is text-only by design: audio, video, and image files aren't transcribed or analyzed
// here (no local speech-to-text or OCR), so they're rejected at upload rather than accepted
// and silently ignored. This is the single source of truth both intake routes validate
// against before ever calling extractText.
export function isSupportedIntakeFile(mimeType, originalName) {
  const ext = extOf(originalName);
  if (mimeType === "application/pdf" || ext === "pdf") return true;
  if (mimeType === "text/html") return false;
  return (mimeType?.startsWith("text/") ?? false) || PLAIN_TEXT_EXTENSIONS.includes(ext);
}

// Extracts plain text from an intake file. PDFs are parsed for real; plain text formats are
// read directly. Callers are expected to have already rejected anything isSupportedIntakeFile
// says no to — 'unsupported' here is a defensive fallback (e.g. a PDF with no extractable
// text layer), not the normal path for a rejected file type.
export async function extractText(filePath, mimeType, originalName) {
  const ext = extOf(originalName);

  try {
    if (mimeType === "application/pdf" || ext === "pdf") {
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText({ pageJoiner: "" });
      await parser.destroy();
      const text = (result.text || "").trim();
      return text ? { content: text, status: "ok" } : { content: null, status: "unsupported" };
    }

    if (isSupportedIntakeFile(mimeType, originalName)) {
      const text = fs.readFileSync(filePath, "utf-8").trim();
      return text ? { content: text, status: "ok" } : { content: null, status: "unsupported" };
    }

    return { content: null, status: "unsupported" };
  } catch {
    return { content: null, status: "failed" };
  }
}
