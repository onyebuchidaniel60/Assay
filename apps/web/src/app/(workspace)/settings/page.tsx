import Link from "next/link";
import { ArrowUpRight, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Settings" };

const roles = [
  ["Credit Analyst", "Create records, upload documents, review redaction/terms, confirm evidence, run analysis", "No activation or critical approval"],
  ["Credit Manager", "Activate approved definitions, assign cases, approve critical actions", "No self-approval"],
  ["Portfolio Manager", "Portfolio, facility, case and scenario visibility", "No critical approval by default"],
  ["Auditor", "Read-only evidence, proof, approvals and audit chain", "No mutations"],
  ["Workspace Admin", "Invite/manage staff and integration health", "No inherent credit approval"],
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Role-shaped access, invite-only membership and integration health. Administrative access does not confer credit approval authority."
        actions={<StatusBadge tone="proof">Preview shell</StatusBadge>}
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <div className="flex items-center gap-2"><Users className="size-4 text-muted" /><SectionLabel>Members and roles</SectionLabel></div>
          <div className="mt-5 divide-y divide-line">
            {[
              ["Maya Chen", "analyst@example.test", "Credit Analyst", "ACTIVE"],
              ["Jon Bell", "manager@example.test", "Credit Manager", "ACTIVE"],
              ["Priya Raman", "auditor@example.test", "Auditor", "ACTIVE"],
            ].map(([name, email, role, status]) => (
              <div key={email} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="mt-0.5 text-xs text-muted">{email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium">{role}</span>
                  <StatusBadge tone="positive">{status}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
          <button type="button" disabled title="Invitation flow is wired in Phase 2" className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-muted opacity-60">
            Create invitation
          </button>
        </section>
        <aside className="space-y-4">
          <section className="rounded-3xl border border-line bg-paper p-5">
            <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-muted" /><SectionLabel>Access rules</SectionLabel></div>
            <div className="mt-4 space-y-3 text-xs leading-5 text-muted">
              <p className="flex items-start gap-2"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" /> Invite-only accounts; no public signup.</p>
              <p className="flex items-start gap-2"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" /> Every API query scoped to the active organization membership.</p>
              <p className="flex items-start gap-2"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" /> Manager approval is distinct from Kite spending authorization.</p>
              <p className="flex items-start gap-2"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" /> Auditor sees evidence metadata, not raw financial values by default.</p>
            </div>
          </section>
          <section className="rounded-3xl border border-line bg-paper p-5">
            <SectionLabel>Shortcuts</SectionLabel>
            <div className="mt-3 space-y-2 text-sm">
              <Link href="/integrations" className="flex items-center justify-between rounded-xl border border-line bg-white/40 px-3 py-2.5 hover:border-ink/30">Integration health <ArrowUpRight className="size-3.5" /></Link>
              <Link href="/audit" className="flex items-center justify-between rounded-xl border border-line bg-white/40 px-3 py-2.5 hover:border-ink/30">Audit trail <ArrowUpRight className="size-3.5" /></Link>
            </div>
          </section>
        </aside>
      </div>
      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <SectionLabel>Permission matrix</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Role-shaped authority</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-5 py-3 font-semibold sm:px-7">Role</th>
                <th className="px-3 py-3 font-semibold">Can do</th>
                <th className="px-5 py-3 font-semibold sm:px-7">Explicit boundary</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(([role, can, boundary]) => (
                <tr key={role} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-4 font-semibold sm:px-7">{role}</td>
                  <td className="px-3 py-4 text-xs leading-5 text-muted">{can}</td>
                  <td className="px-5 py-4 text-xs leading-5 text-muted sm:px-7">{boundary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
