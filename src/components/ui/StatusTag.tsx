interface StatusTagProps {
  status: string;
  className?: string;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  // BookingStatus
  Pending:    { color: "var(--wait)",   label: "Pending" },
  Confirmed:  { color: "var(--ok)",     label: "Confirmed" },
  Declined:   { color: "var(--alert)",  label: "Declined" },
  Cancelled:  { color: "var(--done)",   label: "Cancelled" },
  Active:     { color: "var(--active)", label: "Active" },
  Completed:  { color: "var(--done)",   label: "Completed" },
  Failed:     { color: "var(--alert)",  label: "Failed" },
  // VehicleStatus
  Draft:      { color: "var(--done)",   label: "Draft" },
  Approved:   { color: "var(--ok)",     label: "Approved" },
  Rejected:   { color: "var(--alert)",  label: "Rejected" },
  // VerificationStatus
  Unverified: { color: "var(--wait)",   label: "Unverified" },
  Verified:   { color: "var(--ok)",     label: "Verified" },
  // PaymentStatus
  Held:       { color: "var(--active)", label: "Held" },
  Released:   { color: "var(--ok)",     label: "Released" },
  // DisputeStatus
  Open:       { color: "var(--alert)",  label: "Open" },
  UnderReview:{ color: "var(--active)", label: "Under Review" },
  Resolved:   { color: "var(--ok)",     label: "Resolved" },
  // Generic
  available:  { color: "var(--ok)",     label: "Available" },
  unavailable:{ color: "var(--alert)",  label: "Unavailable" },
};

export function StatusTag({ status, className = "" }: StatusTagProps) {
  const config = STATUS_MAP[status] ?? { color: "var(--done)", label: status };

  return (
    <span
      className={`tag ${className}`}
      style={{ color: config.color }}
      role="status"
    >
      <span
        className="dot"
        style={{ background: config.color }}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
