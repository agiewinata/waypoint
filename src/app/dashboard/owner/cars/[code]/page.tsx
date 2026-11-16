import { notFound } from "next/navigation";
import { requireOwnerPage } from "@/server/authz";
import { getOwnerVehicle } from "@/server/vehicles";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditVehicleForm } from "@/components/owner/EditVehicleForm";
import { VehicleDocsPanel } from "@/components/owner/VehicleDocsPanel";
import { initials } from "@/lib/format";
import { CITIES, VEHICLE_TYPES } from "@/lib/validation/vehicle";
import { OWNER_NAV_ITEMS } from "@/components/ui/nav";

export const dynamic = "force-dynamic";

export default async function OwnerVehiclePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const actor = await requireOwnerPage();
  const vehicle = await getOwnerVehicle(actor.renter.renterID, code);

  if (!vehicle) notFound();

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
                  { label: "Owner dashboard", href: "/dashboard/owner" },
                  { label: "My cars", href: "/dashboard/owner/cars" },
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
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
                    Owner · {vehicle.listingCode}
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
                  gridTemplateColumns: "1fr min(320px,100%)",
                  gap: 32,
                  alignItems: "start",
                }}
              >
                <EditVehicleForm
                  vehicle={vehicle}
                  editable={vehicle.editable}
                  cities={CITIES}
                  vehicleTypes={VEHICLE_TYPES}
                />
                <VehicleDocsPanel
                  listingCode={vehicle.listingCode}
                  status={vehicle.status}
                  docs={vehicle.docs}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
