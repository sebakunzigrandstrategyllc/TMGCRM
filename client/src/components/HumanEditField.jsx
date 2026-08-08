import { useEffect, useRef } from "react";

// A more deliberate editor surface for the human-edit field: auto-growing textarea, a live
// word count, a dirty-state dot, and a footer that always says plainly whether there's
// something unsaved or when it last saved — replaces the plain fixed-height textarea.
export default function HumanEditField({ value, onChange, onSave, saving, dirty, placeholder, updatedAt }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 360)}px`;
  }, [value]);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className={`flex flex-col border transition-colors ${dirty ? "border-black" : "border-black/25"}`}>
      <div className="flex items-center justify-between border-b border-black/10 bg-gray-50 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Your edit</span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
          {dirty && <span className="h-1.5 w-1.5 rounded-full bg-black" aria-hidden="true" />}
          {wordCount} word{wordCount === 1 ? "" : "s"}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        className="min-h-[8rem] max-h-[22.5rem] w-full resize-none overflow-y-auto border-0 bg-white px-2.5 py-2 text-sm leading-relaxed text-black outline-none placeholder:italic placeholder:text-gray-400 focus:bg-gray-50/60"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex items-center justify-between gap-2 border-t border-black/10 bg-gray-50 px-2 py-1.5">
        <span className="truncate text-[10px] text-gray-400">
          {dirty ? "Unsaved changes" : updatedAt ? `Saved ${new Date(updatedAt).toLocaleString()}` : "No edits yet"}
        </span>
        <button
          type="button"
          className={`shrink-0 px-2 py-1 text-[11px] ${dirty ? "btn-primary" : "btn-disabled"}`}
          disabled={!dirty || saving}
          onClick={onSave}
        >
          {saving ? "Saving..." : "Save edit"}
        </button>
      </div>
    </div>
  );
}
