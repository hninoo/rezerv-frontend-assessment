export type Attendee = {
  id: string;
  classId: string;
  customerName: string;
  paymentType: "One-time" | "Package" | "Membership";
  bookingStatus: "Booked" | "Checked-in" | "Cancelled" | "No-show";
};

export const sampleAttendees: Attendee[] = [
  {
    id: "attendee-001",
    classId: "class-001",
    customerName: "Lena Morgan",
    paymentType: "Membership",
    bookingStatus: "Checked-in"
  },
  {
    id: "attendee-002",
    classId: "class-001",
    customerName: "Ethan Park",
    paymentType: "Package",
    bookingStatus: "Booked"
  },
  {
    id: "attendee-003",
    classId: "class-002",
    customerName: "Mina Patel",
    paymentType: "One-time",
    bookingStatus: "Booked"
  }
];
