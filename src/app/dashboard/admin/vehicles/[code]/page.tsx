import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusTag } from "@/components/ui/StatusTag";
import { Icon } from "@iconify/react";
import { requireAdminPage } from "@/server/authz";
import { getVehicleForReview } from "@/server/admin";
import { formatDate, formatIDR } from "@/lib/format";
import { VehicleReviewActions } from "@/components/admin/VehicleReviewActions";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { label: "Overview",      href: "/dashboard/admin", icon: "ph:squares-four" },
  { label: "Verifications", href: "#verifications",   icon: "ph:identification-card" },
  { label: "Vehicles",      href: "#vehicles",        icon: "ph:car" },
  { label: "Disputes",      href: "#disputes",        icon: "ph:scales" },
];

/** Derives two-letter initials from a display name or email address. */
function getInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default async function AdminVehicleReviewPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const actor = await requireAdminPage();
  const vehicle = await getVehicleForReview(code);

  if (!vehicle) notFound();

  const userInitials = getInitials(actor.user.name, actor.user.email);

  const specs = [
    { label: "Code",       value: vehicle.listingCode },
    { label: "VIN",        value: vehicle.VIN },
    { label: "Plate",      value: vehicle.plateNumber },
    { label: "Type",       value: vehicle.type },
    { label: "City",       value: vehicle.city },
    { label: "Price",      value: `${formatIDR(vehicle.pricePerDay)}/day` },
    { label: "Owner",      value: vehicle.ownerName },
    { label: "Submitted",  value: formatDate(vehicle.createdAt) },
  ];

  return (
    <>
      <SiteHeader variant="ink" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName={actor.user.name || actor.user.email}
                userRole="Administrator"
                userInitials={userInitials}
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb
                crumbs={[
                  { label: "Admin",    href: "/dashboard/admin" },
                  { label: "Vehicles", href: "/dashboard/admin" + "#vehicles" },
                  { label: vehicle.listingCode },
                ]}
              />

              <div
                style={{
                  borderBottom: "1px solid var(--ink)",
                  paddingBottom: 16,
                  marginBottom: 32,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
                    Vehicle approval · {vehicle.listingCode}
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
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h1>
                </div>
                <StatusTag status={vehicle.status} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr min(280px,100%)",
                  gap: 32,
                  alignItems: "start",
                }}
              >
                {/* Left — vehicle details + documents */}
                <div>
                  {/* Vehicle specs */}
                  <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--line)",
                        background: "var(--hover)",
                      }}
                    >
                      <span className="kicker">Vehicle details</span>
                    </div>
                    <div style={{ padding: "0 16px" }}>
                      {specs.map((r) => (
                        <div key={r.label} className="spec-row">
                          <span className="spec-label">{r.label}</span>
                          <span className="spec-value">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents */}
                  <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--line)",
                        background: "var(--hover)",
                      }}
                    >
                      <span className="kicker">Uploaded documents</span>
                    </div>
                    {vehicle.docs.length === 0 ? (
                      <div style={{ padding: "16px 16px" }}>
                        <p style={{ fontSize: 13, color: "var(--slate)" }}>No documents uploaded.</p>
                      </div>
                    ) : (
                      vehicle.docs.map((doc, i) => (
                        <div
                          key={doc.documentID}
                          style={{
                            padding: "14px 16px",
                            borderBottom: i < vehicle.docs.length - 1 ? "1px solid var(--line)" : "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>
                              {doc.type}
                            </div>
                            <StatusTag status={doc.verificationStatus} />
                          </div>
                          <a
                            href={`/api/documents/${doc.documentID}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                            style={{ fontSize: 11 }}
                            aria-label={`View ${doc.type} file`}
                          >
                            <Icon icon="ph:eye" width={13} aria-hidden="true" />
                            View file
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right — decision card */}
                <VehicleReviewActions
                  listingCode={vehicle.listingCode}
                  currentStatus={vehicle.status}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
