import { Routes, Route, Link, NavLink } from "react-router-dom";
import ProjectsList from "./pages/ProjectsList.jsx";
import IntakeForm from "./pages/IntakeForm.jsx";
import ProjectDashboard from "./pages/ProjectDashboard.jsx";
import Analytics from "./pages/Analytics.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-black bg-white px-4 py-3">
        <Link to="/" className="text-sm font-black uppercase tracking-[0.2em]">
          SUMMS CRM
        </Link>
        <nav className="flex gap-4 text-xs font-semibold uppercase tracking-wider">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "underline" : "text-gray-500 hover:text-black")}>
            Projects
          </NavLink>
          <NavLink to="/intake" className={({ isActive }) => (isActive ? "underline" : "text-gray-500 hover:text-black")}>
            New Intake
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => (isActive ? "underline" : "text-gray-500 hover:text-black")}>
            Analytics
          </NavLink>
        </nav>
      </header>
      <main className="p-4">
        <Routes>
          <Route path="/" element={<ProjectsList />} />
          <Route path="/intake" element={<IntakeForm />} />
          <Route path="/projects/:id" element={<ProjectDashboard />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
}
