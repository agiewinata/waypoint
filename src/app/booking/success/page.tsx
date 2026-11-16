import { notFound } from "next/navigation";
import { requireUserPage } from "@/server/authz";
import { getBookingDetail } from "@/server/bookings";
import { SuccessView } from "@/components/booking/SuccessView";
import { formatIDR, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface BookingSuccessPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BookingSuccessPage({ searchParams }: BookingSuccessPageProps) {
  const actor = await requireUserPage();

  const rawParams = await searchParams;
  const id = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id;

  if (!id) notFound();

  const booking = await getBookingDetail(actor, id);
  if (!booking || booking.viewerRole !== "customer") notFound();

  return (
    <SuccessView
      bookingId={booking.id}
      make={booking.make}
      model={booking.model}
      startDate={formatDate(booking.startDate)}
      endDate={formatDate(booking.endDate)}
      totalPrice={formatIDR(booking.totalPrice)}
    />
  );
}
