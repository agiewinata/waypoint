import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { IdentityUploadForm } from "@/components/documents/IdentityUploadForm";
import { requireCustomerPage } from "@/server/authz";
import { listCustomerDocuments } from "@/server/documents";
import { initials } from "@/lib/format";
import { CUSTOMER_NAV_ITEMS } from "@/components/ui/nav";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const actor = await requireCustomerPage();
  const docs = await listCustomerDocuments(actor.rentee.renteeID);

  // Most-recent doc of each type (listCustomerDocuments returns desc by createdAt)
  const ktpDoc = docs.find((d) => d.type === "KTP") ?? null;
  const simDoc = docs.find((d) => d.type === "SIM") ?? null;

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
                items={CUSTOMER_NAV_ITEMS}
                userName={userName}
                userRole="Customer"
                userInitials={userInitials}
                switchRoleHref="/dashboard/owner"
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb
                crumbs={[
                  { label: "Dashboard", href: "/dashboard/customer" },
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
                  Customer · Identity
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
                  Upload your KTP and SIM. Documents are encrypted at rest and viewed only
                  by Waypoint admins during review. Access is logged.
                </p>
              </div>

              <IdentityUploadForm
                subject="customer"
                docs={[
                  {
                    type: "KTP",
                    label: "National ID (KTP)",
                    hint: "Front side of your national identity card",
                    existing: ktpDoc,
                  },
                  {
                    type: "SIM",
                    label: "Driver's licence (SIM)",
                    hint: "Front side of your driver's licence (SIM A or SIM C)",
                    existing: simDoc,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
