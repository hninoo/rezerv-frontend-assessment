import { formatBookingCount } from "../room-booking-format";
import type { RoomBookingsState } from "../hooks/useRoomBookings";

interface RoomBookingSummaryProps {
  stats: RoomBookingsState["stats"];
}

export function RoomBookingSummary({ stats }: RoomBookingSummaryProps) {
  return (
    <div className="summary-strip summary-strip--compact" aria-label="Room booking metrics">
      <div className="summary-item">
        <span>Total bookings</span>
        <strong>{stats ? formatBookingCount(stats.totalRows) : "-"}</strong>
        <small>Mock backend</small>
      </div>
      <div className="summary-item summary-item--jade">
        <span>Confirmed</span>
        <strong>{stats ? formatBookingCount(stats.confirmed) : "-"}</strong>
        <small>Ready to use</small>
      </div>
      <div className="summary-item summary-item--brass">
        <span>Pending</span>
        <strong>{stats ? formatBookingCount(stats.pending) : "-"}</strong>
        <small>{stats ? `${formatBookingCount(stats.cancelled)} cancelled` : "Loading totals"}</small>
      </div>
    </div>
  );
}
