import { requireOwnerPage } from "@/server/authz";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { CITIES, VEHICLE_TYPES } from "@/lib/validation/vehicle";
import { ListCarForm } from "@/components/owner/ListCarForm";

export const dynamic = "force-dynamic";

export default async function ListACarPage() {
  const actor = await requireOwnerPage();

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 760 }}>
          <ListCarForm
            renterID={actor.renter.renterID}
            cities={CITIES}
            vehicleTypes={VEHICLE_TYPES}
          />
        </div>
      </main>
    </>
  );
}
