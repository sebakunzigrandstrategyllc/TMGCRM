// Client details are captured as structured fields (email/phone/company) but most of the
// app — AI draft generation, the dashboard, the projects list — reads a single display
// string. This composes that string so every existing reader keeps working unchanged.
export function composeContactInfo({ email, phone, company }) {
  return [company, email, phone].filter((v) => v && v.trim()).join(" · ");
}
