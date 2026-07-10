export type RoomBooking = {
  id: string;
  room: string;
  ownerTeam: string;
  window: string;
  capacity: string;
  status: "Confirmed" | "Pending" | "Cancelled";
};

export const roomBookings: RoomBooking[] = [
  {
    id: "room-001",
    room: "Studio A",
    ownerTeam: "Operations Team",
    window: "8:00 AM - 10:00 AM",
    capacity: "18 / 20",
    status: "Confirmed"
  },
  {
    id: "room-002",
    room: "Wellness Room",
    ownerTeam: "Coaching Team",
    window: "1:00 PM - 3:00 PM",
    capacity: "6 / 10",
    status: "Pending"
  },
  {
    id: "room-003",
    room: "Recovery Suite",
    ownerTeam: "Member Care",
    window: "5:00 PM - 6:00 PM",
    capacity: "0 / 8",
    status: "Cancelled"
  }
];
