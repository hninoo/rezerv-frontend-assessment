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
    classId: "class-001",
    customerName: "Grace Lee",
    paymentType: "One-time",
    bookingStatus: "Booked"
  },
  {
    id: "attendee-004",
    classId: "class-001",
    customerName: "Omar Hassan",
    paymentType: "Membership",
    bookingStatus: "No-show"
  },
  {
    id: "attendee-005",
    classId: "class-001",
    customerName: "Nora Silva",
    paymentType: "Package",
    bookingStatus: "Checked-in"
  },
  {
    id: "attendee-006",
    classId: "class-001",
    customerName: "Ben Carter",
    paymentType: "Membership",
    bookingStatus: "Booked"
  },
  {
    id: "attendee-007",
    classId: "class-002",
    customerName: "Mina Patel",
    paymentType: "One-time",
    bookingStatus: "Booked"
  }
];
