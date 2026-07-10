export type FitnessClass = {
  id: string;
  title: string;
  instructor: string;
  time: string;
  attendance: string;
  status: "Scheduled" | "Full" | "Cancelled";
};

export const sampleClasses: FitnessClass[] = [
  {
    id: "class-001",
    title: "Yoga Flow",
    instructor: "Ava Chen",
    time: "10:00 AM - 11:00 AM",
    attendance: "12 / 15",
    status: "Scheduled"
  },
  {
    id: "class-002",
    title: "Strength Foundations",
    instructor: "Maya Lin",
    time: "12:30 PM - 1:30 PM",
    attendance: "15 / 15",
    status: "Full"
  },
  {
    id: "class-003",
    title: "HIIT Circuit",
    instructor: "Noah Reyes",
    time: "6:00 PM - 7:00 PM",
    attendance: "0 / 18",
    status: "Cancelled"
  }
];
