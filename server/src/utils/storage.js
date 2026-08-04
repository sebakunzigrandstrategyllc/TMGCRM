import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FILE_TYPES } from "../constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_ROOT = path.join(__dirname, "..", "..", "storage");

export function projectDir(projectId) {
  return path.join(STORAGE_ROOT, projectId);
}

export function ensureProjectFolders(projectId) {
  const base = projectDir(projectId);
  for (const type of FILE_TYPES) {
    fs.mkdirSync(path.join(base, type), { recursive: true });
  }
  fs.mkdirSync(path.join(base, "_uploads"), { recursive: true });
  return base;
}

function uniqueName(dir, originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  let candidate = originalName;
  let n = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base}-${n}${ext}`;
    n++;
  }
  return candidate;
}

// Copies a saved upload into its matching type folder (Pictures/Video/Audio/Documents),
// so every file uploaded anywhere in the app is duplicated into the project's type folder.
export function duplicateIntoTypeFolder(projectId, sourceAbsPath, fileType, originalName) {
  ensureProjectFolders(projectId);
  const targetDir = path.join(projectDir(projectId), fileType);
  const targetName = uniqueName(targetDir, originalName);
  const targetPath = path.join(targetDir, targetName);
  fs.copyFileSync(sourceAbsPath, targetPath);
  return targetPath;
}

export function relativeToStorage(absPath) {
  return path.relative(STORAGE_ROOT, absPath);
}
