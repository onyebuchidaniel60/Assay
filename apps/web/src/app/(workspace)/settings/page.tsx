import Link from "next/link";
import { ArrowUpRight, KeyRound, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { getMe } from "@/lib/api-server";
import { signOutAction } from "@/lib/actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const roles = [
  ["Analyst", "Create borrowers/facilities, upload agreements, review redaction and terms, attest financial inputs, run analysis and request proofs", "Cannot approve; cannot activate critical actions"],
  ["Manager", "Restricted decision view, approve/reject eligible analysis, acknowledge stress risk", "Cannot approve their own run; no raw amounts"],
  ["Auditor", "Evidence metadata, proof status, approval identity and signed audit chain", "Read-only"],
  ["Admin", "Invite/manage staff, integration health, demo-only crypto-shred", "No inherent credit approval"],
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  let me;
  try {
    me = await getMe();
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Your session could not be loaded." />
        <FeedbackBanner error="UNAUTHENTICATED" message="Sign in again to continue." />
        <Link href="/login" className="inline-flex w-fit rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Role-shaped access, invite-only membership and integration health. Administrative access does not confer credit approval authority."
        actions={<StatusBadge tone="proof">{me.user.organizationName}</StatusBadge>}
      />
      <FeedbackBanner {...params} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <div className="flex items-center gap-2"><Users className="size-4 text-muted" /><SectionLabel>Current membership</SectionLabel></div>
          <div className="mt-5 rounded-2xl border border-line bg-white/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{me.user.name ?? "Staff member"}</p>
                <p className="mt-0.5 text-xs text-muted">{me.user.email ?? "No email in session"}</p>
              </div>
              <StatusBadge tone="positive">{me.user.role}</StatusBadge>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-xs sm:grid-cols-2">
              <div><dt className="text-muted">Organization</dt><dd className="mt-1 font-medium">{me.user.organizationName}</dd></div>
              <div><dt className="text-muted">Tenant ID</dt><dd className="mt-1 break-all font-mono text-[10px]">{me.user.organizationId}</dd></div>
              <div><dt className="text-muted">User ID</dt><dd className="mt-1 break-all font-mono text-[10px]">{me.user.userId}</dd></div>
              <div><dt className="text-muted">Sign-in</dt><dd className="mt-1 font-medium">Neon managed Better Auth · invite only</dd></div>
            </dl>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={signOutAction}>
              <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-line bg-white/60 px-4 py-2.5 text-xs font-semibold text-ink hover:border-danger/30 hover:text-danger">
                <KeyRound className="size-3.5" /> Sign out
              </button>
            </form>
            <Link href="/integrations" className="inline-flex items-center gap-2 rounded-full border border-line bg-white/60 px-4 py-2.5 text-xs font-semibold text-ink hover:border-ink/30">
              Integration health <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            Public signup is disabled. An administrator provisions staff identities out of band and assigns an active
            workspace role. A disabled profile is denied on the next API request.
          </p>
        </section>

        <section className="rounded-3xl bg-ink p-5 text-paper sm:p-7">
          <SectionLabel><span className="text-white/50">Security boundary</span></SectionLabel>
          <p className="mt-5 flex items-center gap-2 text-xl font-semibold"><LockKeyhole className="size-5" /> Secrets stay server-side</p>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Neon Auth, the database URL, object-storage keys, the data KEK, the Ed25519 audit key, Presidio and provider
            keys are server-only. The browser receives no provider secret and no raw borrower content outside an
            analyst-authorized preview.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 p-4 text-xs leading-5 text-white/50">
            Provider credentials are configured through the deployment secret store, not through this UI.
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-white/40"><ShieldCheck className="size-3.5" /> Manager approval is separate from any Kite payment authorization.</p>
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <SectionLabel>Role matrix</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">What each role can do</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-5 py-3 font-semibold sm:px-7">Role</th>
                <th className="px-3 py-3 font-semibold">Can</th>
                <th className="px-5 py-3 font-semibold sm:px-7">Cannot</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(([role, can, cannot]) => (
                <tr key={role} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-4 font-semibold sm:px-7">{role}</td>
                  <td className="px-3 py-4 text-xs leading-5 text-muted">{can}</td>
                  <td className="px-5 py-4 text-xs leading-5 text-muted sm:px-7">{cannot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
