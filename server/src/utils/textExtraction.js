import fs from "fs";
import { PDFParse } from "pdf-parse";

const PLAIN_TEXT_EXTENSIONS = ["txt", "md", "eml", "csv", "vtt", "srt", "log"];

function extOf(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}

// Extracts plain text from an uploaded file where feasible. PDFs are parsed for real; plain
// text formats are read directly; anything else (audio/video, docx, images) is stored as an
// attachment only — there's no local speech-to-text or docx parser here, so those come back
// marked 'unsupported' rather than silently producing nothing. Swap in real transcription /
// docx extraction later without changing callers.
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

    if ((mimeType?.startsWith("text/") || PLAIN_TEXT_EXTENSIONS.includes(ext)) && mimeType !== "text/html") {
      const text = fs.readFileSync(filePath, "utf-8").trim();
      return text ? { content: text, status: "ok" } : { content: null, status: "unsupported" };
    }

    return { content: null, status: "unsupported" };
  } catch {
    return { content: null, status: "failed" };
  }
}
