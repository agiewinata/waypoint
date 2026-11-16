import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { IdentityUploadForm } from "@/components/documents/IdentityUploadForm";
import { requireOwnerPage } from "@/server/authz";
import { listOwnerDocuments } from "@/server/documents";
import { initials } from "@/lib/format";
import { OWNER_NAV_ITEMS } from "@/components/ui/nav";
import type { VerificationStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const BANNER: Record<VerificationStatus, { color: string; title: string; body: string }> = {
  Verified: {
    color: "var(--ok)",
    title: "Verified",
    body: "Your identity documents have been approved by Waypoint admins.",
  },
  Pending: {
    color: "var(--wait)",
    title: "Pending review",
    body: "Your documents are waiting for admin review.",
  },
  Unverified: {
    color: "var(--wait)",
    title: "Unverified",
    body: "Upload your identity documents to start verification.",
  },
  Rejected: {
    color: "var(--alert)",
    title: "Rejected",
    body: "One or more documents were rejected. Upload a clearer or more recent copy.",
  },
};

export default async function OwnerVerifyPage() {
  const actor = await requireOwnerPage();
  const { renter } = actor;
  const docs = await listOwnerDocuments(renter.renterID);

  // listOwnerDocuments returns desc by createdAt, so the first match is the most recent
  const latest = (type: "KTP" | "SIM" | "BPKB") => docs.find((d) => d.type === type) ?? null;

  const banner = BANNER[renter.verificationStatus];

  const userName = actor.user.name || actor.user.email;
  const userInitials = initials(userName);

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={OWNER_NAV_ITEMS}
                userName={userName}
                userRole="Owner"
                userInitials={userInitials}
                switchRoleHref="/dashboard/customer"
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb
                crumbs={[
                  { label: "Dashboard", href: "/dashboard/owner" },
                  { label: "Identity verification" },
                ]}
              />

              <div
                style={{
                  borderBottom: "1px solid var(--ink)",
                  paddingBottom: 16,
                  marginBottom: 32,
                }}
              >
                <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
                  Owner · Identity
                </span>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "var(--ink)",
                  }}
                >
                  Verify your identity
                </h1>
                <p
                  style={{
                    color: "var(--slate)",
                    fontSize: 14,
                    marginTop: 8,
                    lineHeight: 1.6,
                    maxWidth: 520,
                  }}
                >
                  Upload your KTP, SIM and BPKB. Documents are encrypted at rest and viewed only
                  by Waypoint admins during review. Access is logged.
                </p>
              </div>

              <div
                style={{
                  maxWidth: 560,
                  border: `1px solid ${banner.color}`,
                  padding: "14px 16px",
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: banner.color,
                    marginBottom: 4,
                  }}
                >
                  {banner.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.5 }}>
                  {banner.body}
                </div>
              </div>

              <IdentityUploadForm
                subject="owner"
                docs={[
                  {
                    type: "KTP",
                    label: "National ID (KTP)",
                    hint: "Front of your national ID card",
                    existing: latest("KTP"),
                  },
                  {
                    type: "SIM",
                    label: "Driver's License (SIM)",
                    hint: "Front of your driver's license",
                    existing: latest("SIM"),
                  },
                  {
                    type: "BPKB",
                    label: "Vehicle ownership book (BPKB)",
                    hint: "BPKB document for your vehicles",
                    existing: latest("BPKB"),
                  },
                ]}
              />

              <p
                style={{
                  maxWidth: 560,
                  marginTop: 20,
                  fontSize: 13,
                  color: "var(--slate)",
                  lineHeight: 1.6,
                }}
              >
                Verified identity unlocks the &apos;Verified owner&apos; badge on your listings.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
