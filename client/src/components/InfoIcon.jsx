import { useState } from "react";
import Modal from "./Modal.jsx";

// Small "i" icon that opens explanatory content in a modal instead of navigating away.
export default function InfoIcon({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="info-icon"
        onClick={() => setOpen(true)}
        aria-label={`About ${title}`}
        title={`About ${title}`}
      >
        i
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-2 text-sm leading-relaxed">{children}</div>
      </Modal>
    </>
  );
}
