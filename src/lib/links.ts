export const links = {
  ownerBooking: (id: string) => `/dashboard/owner/bookings/${id}`,
  customerTrip: (id: string) => `/trips/${id}`,
  customerCheckout: (id: string) => `/dashboard/customer/checkout/${id}`,
  customerVerify: () => "/dashboard/customer/verify",
  ownerVerify: () => "/dashboard/owner/verify",
  ownerCar: (code: string) => `/dashboard/owner/cars/${code}`,
  adminQueue: (s: "verifications" | "vehicles" | "disputes" | "bookings") => `/dashboard/admin#${s}`,
  adminDispute: (id: string) => `/dashboard/admin/disputes/${id}`,
} as const;
