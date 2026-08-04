import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function PaymentSchedule({ projectId }) {
  const [payments, setPayments] = useState([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const load = () => api.getPayments(projectId).then((r) => setPayments(r.payments));

  useEffect(() => {
    load();
  }, [projectId]);

  const create = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    await api.createPayment(projectId, { description, amount: Number(amount), dueDate: dueDate || null });
    setDescription("");
    setAmount("");
    setDueDate("");
    load();
  };

  const markPaid = async (p) => {
    await api.updatePayment(projectId, p.id, { status: p.status === "paid" ? "pending" : "paid" });
    load();
  };

  return (
    <div className="card p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider">Payment Schedule</h3>
      <form onSubmit={create} className="mb-3 flex gap-2">
        <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="input w-28" type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="input w-40" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <button className="btn-primary text-xs" type="submit">Add</button>
      </form>
      <ul className="space-y-1 text-sm">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between border-b border-black/10 py-1">
            <span className={p.status === "paid" ? "line-through text-gray-400" : ""}>{p.description}</span>
            <span className="flex items-center gap-3 text-xs text-gray-500">
              ${Number(p.amount).toFixed(2)} · {p.due_date || "—"}
              <button className="underline" onClick={() => markPaid(p)}>
                {p.status === "paid" ? "Mark pending" : "Mark paid"}
              </button>
            </span>
          </li>
        ))}
        {payments.length === 0 && <li className="text-xs text-gray-400">No payments scheduled yet.</li>}
      </ul>
    </div>
  );
}
