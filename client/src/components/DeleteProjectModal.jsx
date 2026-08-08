import { useState } from "react";
import Modal from "./Modal.jsx";
import { api } from "../api.js";

// Requires typing the project's own id to confirm — this is permanent and cascades across
// every table plus the project's file storage, so it shouldn't be one accidental click away.
export default function DeleteProjectModal({ open, onClose, project, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!project) return null;

  const canDelete = confirmText.trim() === project.id;

  const handleClose = () => {
    setConfirmText("");
    setError("");
    onClose();
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await api.deleteProject(project.id);
      onDeleted?.(project.id);
      handleClose();
    } catch (err) {
      setError(err.message || "Couldn't delete project.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Delete project">
      <p className="text-sm leading-relaxed">
        This permanently deletes <strong>{project.client_name}</strong>{" "}
        <span className="font-mono text-gray-500">#{project.id}</span> — every column, file, milestone, timeline,
        checklist, and activity record tied to it. This cannot be undone.
      </p>
      <label className="label mt-3">
        Type <span className="font-mono">{project.id}</span> to confirm
      </label>
      <input
        className="input mt-1"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={project.id}
        autoFocus
      />
      {error && <p className="mt-2 text-xs font-semibold text-black">⚠ {error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-secondary text-xs" onClick={handleClose} disabled={deleting}>
          Cancel
        </button>
        <button
          type="button"
          className={canDelete ? "btn-primary text-xs" : "btn-disabled text-xs"}
          onClick={handleDelete}
          disabled={!canDelete || deleting}
        >
          {deleting ? "Deleting..." : "Delete permanently"}
        </button>
      </div>
    </Modal>
  );
}
