import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Rendered via portal so the modal always escapes ancestor styling/stacking
  // (e.g. dashboard column headers set text-white, which would otherwise leak in).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`card max-h-[85vh] w-full ${wide ? "max-w-3xl" : "max-w-lg"} overflow-y-auto bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider">{title}</h2>
          <button
            className="border border-black px-2 text-sm leading-none hover:bg-black hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
