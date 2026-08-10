import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { PDFParse } from "pdf-parse";

const execFileAsync = promisify(execFile);

const PLAIN_TEXT_EXTENSIONS = ["txt", "md", "eml", "csv", "vtt", "srt", "log"];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"];
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg"];

export const SUPPORTED_INTAKE_LABEL = "PDF, PNG, JPEG, TXT, MD, EML, CSV, VTT, or SRT";

function extOf(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}

function isPdf(mimeType, ext) {
  return mimeType === "application/pdf" || ext === "pdf";
}

function isImage(mimeType, ext) {
  return IMAGE_MIME_TYPES.includes(mimeType) || IMAGE_EXTENSIONS.includes(ext);
}

function isPlainText(mimeType, ext) {
  if (mimeType === "text/html") return false;
  return (mimeType?.startsWith("text/") ?? false) || PLAIN_TEXT_EXTENSIONS.includes(ext);
}

// Intake is text-only by design, but "text" includes text an AI can read out of an image via
// OCR — PDF, PNG/JPEG (OCR'd), and plain-text formats are accepted; audio/video and anything
// else are rejected at upload rather than accepted and silently ignored. This is the single
// source of truth both intake routes validate against before ever calling extractText.
export function isSupportedIntakeFile(mimeType, originalName) {
  const ext = extOf(originalName);
  return isPdf(mimeType, ext) || isImage(mimeType, ext) || isPlainText(mimeType, ext);
}

// Runs the image through the system `tesseract` OCR binary (tesseract-ocr + tesseract-ocr-eng
// must be installed — this shells out rather than using a WASM port so there's no runtime
// download of language data). stdout is pure recognized text; tesseract's own diagnostics go
// to stderr and are discarded.
async function ocrImage(filePath) {
  const { stdout } = await execFileAsync("tesseract", [filePath, "stdout"], { maxBuffer: 20 * 1024 * 1024 });
  return stdout.trim();
}

// Extracts plain text from an intake file. PDFs are parsed for real; images are OCR'd; plain
// text formats are read directly. Callers are expected to have already rejected anything
// isSupportedIntakeFile says no to — 'unsupported' here is a defensive fallback (e.g. a PDF
// with no extractable text layer, or an image with no legible text), not the normal path for
// a rejected file type. 'failed' covers real errors, including the OCR binary being missing.
export async function extractText(filePath, mimeType, originalName) {
  const ext = extOf(originalName);

  try {
    if (isPdf(mimeType, ext)) {
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText({ pageJoiner: "" });
      await parser.destroy();
      const text = (result.text || "").trim();
      return text ? { content: text, status: "ok" } : { content: null, status: "unsupported" };
    }

    if (isImage(mimeType, ext)) {
      const text = (await ocrImage(filePath)).trim();
      return text ? { content: text, status: "ok" } : { content: null, status: "unsupported" };
    }

    if (isPlainText(mimeType, ext)) {
      const text = fs.readFileSync(filePath, "utf-8").trim();
      return text ? { content: text, status: "ok" } : { content: null, status: "unsupported" };
    }

    return { content: null, status: "unsupported" };
  } catch {
    return { content: null, status: "failed" };
  }
}
