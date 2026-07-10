import { AlertTriangle, RotateCcw } from "lucide-react";

import { formatBookingCount } from "../room-booking-format";
import type { RoomBookingsState, RoomStatusFilter } from "../hooks/useRoomBookings";

const statusOptions: RoomStatusFilter[] = ["All", "Confirmed", "Pending", "Cancelled"];

interface RoomBookingToolbarProps {
  bookings: RoomBookingsState;
}

export function RoomBookingToolbar({ bookings }: RoomBookingToolbarProps) {
  return (
    <div className="table-toolbar" aria-label="Room booking table controls">
      <div className="table-toolbar__fields">
        <label className="table-toolbar__field">
          <span>Search</span>
          <input
            onChange={(event) => bookings.handleQueryChange(event.target.value)}
            placeholder="Room number, team, or status"
            type="search"
            value={bookings.query}
          />
        </label>
        <label className="table-toolbar__field">
          <span>Status</span>
          <select
            onChange={(event) => bookings.handleStatusFilterChange(event.target.value as RoomStatusFilter)}
            value={bookings.statusFilter}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="table-toolbar__summary">
        Showing {formatBookingCount(bookings.rows.length)} of {formatBookingCount(bookings.totalRows)} matching bookings
      </p>
      <div className="table-toolbar__actions">
        <button
          aria-label="Show failed initial fetch state"
          disabled={bookings.isLoading && bookings.requestMode.shouldFail}
          onClick={bookings.handleFailedRequestDemo}
          title="Show failed initial fetch state"
          type="button"
        >
          <AlertTriangle size={16} />
          <span>Error</span>
        </button>
        <button
          aria-label="Reload room bookings"
          disabled={bookings.isLoading && !bookings.requestMode.shouldFail}
          onClick={bookings.handleRequestRecovery}
          title="Reload room bookings"
          type="button"
        >
          <RotateCcw size={16} />
          <span>Reload</span>
        </button>
      </div>
    </div>
  );
}
