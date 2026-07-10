import { describe, expect, it } from "vitest";

import { fetchAttendeesByClassId } from "./attendees";
import { fetchClasses } from "./classes";

describe("mock APIs", () => {
  it("loads classes with the assessment table shape", async () => {
    const classes = await fetchClasses({ delayMs: 0 });

    expect(classes[0]).toMatchObject({
      title: "Yoga Flow",
      instructor: "Ava Chen",
      time: "10:00 AM - 11:00 AM",
      attendance: "12 / 15",
      status: "Scheduled"
    });
  });

  it("loads attendee rows for a class", async () => {
    const attendees = await fetchAttendeesByClassId("class-001", { delayMs: 0 });

    expect(attendees).toHaveLength(2);
    expect(attendees[0]).toMatchObject({
      customerName: "Lena Morgan",
      paymentType: "Membership",
      bookingStatus: "Checked-in"
    });
  });

  it("can model failed requests", async () => {
    await expect(fetchClasses({ delayMs: 0, shouldFail: true })).rejects.toThrow(
      "Unable to load class timetable."
    );
  });
});
