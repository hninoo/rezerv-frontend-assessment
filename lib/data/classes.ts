export type FitnessClass = {
  id: string;
  title: string;
  instructor: string;
  startsAtUtc: string;
  endsAtUtc: string;
  attendance: string;
  status: "Scheduled" | "Full" | "Cancelled";
};

export const sampleClasses: FitnessClass[] = [
  {
    id: "class-001",
    title: "Yoga Flow",
    instructor: "Ava Chen",
    startsAtUtc: "2026-07-06T03:30:00.000Z",
    endsAtUtc: "2026-07-06T04:30:00.000Z",
    attendance: "12 / 15",
    status: "Scheduled"
  },
  {
    id: "class-002",
    title: "Strength Foundations",
    instructor: "Maya Lin",
    startsAtUtc: "2026-07-06T06:00:00.000Z",
    endsAtUtc: "2026-07-06T07:00:00.000Z",
    attendance: "15 / 15",
    status: "Full"
  },
  {
    id: "class-003",
    title: "HIIT Circuit",
    instructor: "Noah Reyes",
    startsAtUtc: "2026-07-06T11:30:00.000Z",
    endsAtUtc: "2026-07-06T12:30:00.000Z",
    attendance: "0 / 18",
    status: "Cancelled"
  }
];
