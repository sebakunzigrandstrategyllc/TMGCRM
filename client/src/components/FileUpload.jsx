import { useRef, useState } from "react";
import { api } from "../api.js";

export default function FileUpload({ projectId, columnKey, files = [], onUploaded, onDeleted }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const uploaded = await api.uploadFile(projectId, file, columnKey);
        onUploaded?.(uploaded);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary text-[11px]"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Attach file"}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files?.length && handleFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <ul className="space-y-0.5 text-[11px]">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 border border-black/10 px-1.5 py-0.5">
              <a href={f.downloadUrl} className="truncate underline" title={f.originalName}>
                {f.originalName}
              </a>
              <span className="shrink-0 text-gray-500">{f.fileType}</span>
              {onDeleted && (
                <button
                  type="button"
                  className="shrink-0 text-gray-400 hover:text-black"
                  onClick={async () => {
                    await api.deleteFile(f.id);
                    onDeleted(f.id);
                  }}
                  aria-label={`Remove ${f.originalName}`}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
