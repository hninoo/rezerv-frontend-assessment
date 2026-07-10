"use client";

import { AppShell } from "@/components/app-shell/AppShell";
import { RoomBookingSummary } from "@/features/room-bookings/components/RoomBookingSummary";
import { RoomBookingTable } from "@/features/room-bookings/components/RoomBookingTable";
import { RoomBookingToolbar } from "@/features/room-bookings/components/RoomBookingToolbar";
import { useRoomBookings } from "@/features/room-bookings/hooks/useRoomBookings";

export default function RoomBookingsPage() {
  const bookings = useRoomBookings();

  return (
    <AppShell
      active="room-bookings"
      eyebrow="Reusable DataTable"
      title="Room Booking Operations"
    >
      <section className="dashboard-page">
        <RoomBookingSummary stats={bookings.stats} />
        <RoomBookingToolbar bookings={bookings} />
        <RoomBookingTable bookings={bookings} />
      </section>
    </AppShell>
  );
}
