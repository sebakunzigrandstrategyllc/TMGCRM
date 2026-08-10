const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: options.body instanceof FormData ? options.headers : { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      // ignore
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getProjects: () => request("/projects"),
  getProject: (id) => request(`/projects/${id}`),
  getDashboard: (id) => request(`/projects/${id}/dashboard`),
  deleteProject: (id) => request(`/projects/${id}?confirm=${encodeURIComponent(id)}`, { method: "DELETE" }),

  submitIntake: (formData) => request("/intake", { method: "POST", body: formData }),

  saveColumnEdit: (id, columnKey, humanEdit) =>
    request(`/projects/${id}/columns/${columnKey}`, { method: "PUT", body: JSON.stringify({ humanEdit }) }),
  regenerateDraft: (id, columnKey) =>
    request(`/projects/${id}/columns/${columnKey}/generate`, { method: "POST" }),
  getColumnHistory: (id, columnKey) => request(`/projects/${id}/columns/${columnKey}/history`),

  setApproval: (id, columnKey, approved, notes) =>
    request(`/projects/${id}/approvals/${columnKey}`, {
      method: "PUT",
      body: JSON.stringify({ approved, notes }),
    }),

  uploadFile: (id, file, columnKey) => {
    const formData = new FormData();
    formData.append("file", file);
    if (columnKey) formData.append("columnKey", columnKey);
    return request(`/projects/${id}/files`, { method: "POST", body: formData });
  },
  listFiles: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/projects/${id}/files${qs ? `?${qs}` : ""}`);
  },
  deleteFile: (fileId) => request(`/files/${fileId}`, { method: "DELETE" }),

  getMilestones: (id) => request(`/projects/${id}/milestones`),
  createMilestone: (id, data) =>
    request(`/projects/${id}/milestones`, { method: "POST", body: JSON.stringify(data) }),
  updateMilestone: (id, milestoneId, data) =>
    request(`/projects/${id}/milestones/${milestoneId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMilestone: (id, milestoneId) =>
    request(`/projects/${id}/milestones/${milestoneId}`, { method: "DELETE" }),

  getPayments: (id) => request(`/projects/${id}/payments`),
  createPayment: (id, data) =>
    request(`/projects/${id}/payments`, { method: "POST", body: JSON.stringify(data) }),
  updatePayment: (id, paymentId, data) =>
    request(`/projects/${id}/payments/${paymentId}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePayment: (id, paymentId) =>
    request(`/projects/${id}/payments/${paymentId}`, { method: "DELETE" }),

  getCalendar: (id) => request(`/projects/${id}/calendar`),
  createCalendarEvent: (id, data) =>
    request(`/projects/${id}/calendar`, { method: "POST", body: JSON.stringify(data) }),
  deleteCalendarEvent: (id, eventId) =>
    request(`/projects/${id}/calendar/${eventId}`, { method: "DELETE" }),

  getAmendments: (id) => request(`/projects/${id}/amendments`),
  createAmendment: (id, data) =>
    request(`/projects/${id}/amendments`, { method: "POST", body: JSON.stringify(data) }),
  approveAmendment: (id, amendmentId, data) =>
    request(`/projects/${id}/amendments/${amendmentId}/approve`, { method: "PUT", body: JSON.stringify(data) }),

  getTimeline: (id, stage) => request(`/projects/${id}/timeline/${stage}`),
  generateTimeline: (id, stage) => request(`/projects/${id}/timeline/${stage}`, { method: "POST" }),

  getChecklist: (id, columnKey) => request(`/projects/${id}/checklist/${columnKey}`),
  toggleChecklistItem: (id, itemId, checked) =>
    request(`/projects/${id}/checklist/items/${itemId}`, { method: "PUT", body: JSON.stringify({ checked }) }),
  regenerateChecklist: (id, columnKey) =>
    request(`/projects/${id}/checklist/${columnKey}/regenerate`, { method: "POST" }),

  getIntakeDocuments: (id) => request(`/projects/${id}/intake-documents`),
  addIntakeTextDocument: (id, { label, content }) =>
    request(`/projects/${id}/intake-documents`, { method: "POST", body: JSON.stringify({ label, content }) }),
  addIntakeFileDocument: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request(`/projects/${id}/intake-documents`, { method: "POST", body: formData });
  },
  deleteIntakeDocument: (id, docId) => request(`/projects/${id}/intake-documents/${docId}`, { method: "DELETE" }),

  getTurnaround: () => request("/analytics/turnaround"),
  getContentPatterns: () => request("/analytics/content-patterns"),
  getOverview: () => request("/analytics/overview"),

  getColumnDefs: () => request("/columns"),
};
