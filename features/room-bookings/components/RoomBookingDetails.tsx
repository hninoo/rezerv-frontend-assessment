import { StatusBadge } from "@/components/ui/StatusBadge";
import type { RoomBookingDetail } from "@/lib/mock-api/room-booking-details";

export function RoomBookingDetails({ details }: { details: RoomBookingDetail[] }) {
  if (details.length === 0) {
    return (
      <p className="attendee-list__empty" role="status">
        No room detail rows found.
      </p>
    );
  }

  return (
    <div className="room-detail-list" role="list">
      {details.map((detail) => (
        <div className="room-detail-list__row" key={detail.id} role="listitem">
          <span>{detail.label}</span>
          <span>{detail.value}</span>
          <StatusBadge status={detail.status} />
        </div>
      ))}
    </div>
  );
}
