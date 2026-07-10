import { describe, expect, it } from "vitest";

import { attendeeApi, fetchAttendeesByClassId } from "./attendees";
import { BOOKING_STORE_ROW_COUNT } from "./booking-store";
import { classApi, fetchClasses } from "./classes";
import { fetchRoomBookingDetails } from "./room-booking-details";
import { ROOM_BOOKING_MAX_PAGE_SIZE, fetchRoomBookingStats, fetchRoomBookings, roomBookingApi } from "./room-bookings";

describe("mock APIs", () => {
  it("loads classes with the assessment table shape", async () => {
    const classes = await fetchClasses({ delayMs: 0 });

    expect(classes[0]).toMatchObject({
      title: "Yoga Flow",
      instructor: "Ava Chen",
      startsAtUtc: "2026-07-06T03:30:00.000Z",
      endsAtUtc: "2026-07-06T04:30:00.000Z",
      attendance: "12 / 15",
      status: "Scheduled"
    });
  });

  it("loads attendee rows for a class", async () => {
    const attendees = await fetchAttendeesByClassId("class-001", { delayMs: 0, pageIndex: 0, pageSize: 2 });

    expect(attendees.rows).toHaveLength(2);
    expect(attendees.totalRows).toBeGreaterThan(attendees.rows.length);
    expect(attendees.rows[0]).toMatchObject({
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

  it("serves bounded pages from the five million row booking store", async () => {
    const result = await fetchRoomBookings({ delayMs: 0, pageIndex: 0, pageSize: 5 });

    expect(result.rows).toHaveLength(5);
    expect(result.totalRows).toBe(BOOKING_STORE_ROW_COUNT);
    expect(result.rows[0].id).toBe("room-1");
  });

  it("sorts room bookings on the server side", async () => {
    const result = await fetchRoomBookings({
      delayMs: 0,
      pageIndex: 0,
      pageSize: 5,
      sort: { columnId: "capacity", direction: "asc" }
    });

    expect(result.rows[0].capacity.startsWith("0 /")).toBe(true);
  });

  it("filters room booking data before pagination", async () => {
    const result = await fetchRoomBookings({
      delayMs: 0,
      pageIndex: 0,
      pageSize: 5,
      query: "operations",
      status: "Confirmed"
    });

    expect(result.totalRows).toBeGreaterThan(0);
    expect(result.totalRows).toBeLessThan(BOOKING_STORE_ROW_COUNT);
    expect(result.rows.every((row) => row.ownerTeam === "Operations Team" && row.status === "Confirmed")).toBe(true);
  });

  it("keeps room booking page sizes bounded for large datasets", async () => {
    const result = await fetchRoomBookings({
      delayMs: 0,
      pageIndex: -1,
      pageSize: ROOM_BOOKING_MAX_PAGE_SIZE + 100
    });

    expect(result.rows.length).toBeLessThanOrEqual(ROOM_BOOKING_MAX_PAGE_SIZE);
    expect(result.rows[0].id).toBe("room-1");
  });

  it("reports booking stats that add up to the store size", async () => {
    const stats = await fetchRoomBookingStats({ delayMs: 0 });

    expect(stats.totalRows).toBe(BOOKING_STORE_ROW_COUNT);
    expect(stats.confirmed + stats.pending + stats.cancelled).toBe(stats.totalRows);
  });

  it("loads room booking details on demand and stays deterministic", async () => {
    const first = await fetchRoomBookingDetails("room-1", { delayMs: 0 });
    const second = await fetchRoomBookingDetails("room-1", { delayMs: 0 });

    expect(first.length).toBeGreaterThanOrEqual(2);
    expect(first.every((detail) => detail.roomBookingId === "room-1")).toBe(true);
    expect(second).toEqual(first);
  });

  it("fails detail loading for the designated demo rooms", async () => {
    await expect(fetchRoomBookingDetails("room-13", { delayMs: 0 })).rejects.toThrow(
      "Unable to load room booking details."
    );
  });

  it("serves every dataset through the shared resource API contract", async () => {
    const classes = await classApi.list({ delayMs: 0 });
    const attendees = await attendeeApi.list({ classId: "class-001", delayMs: 0, pageIndex: 0, pageSize: 2 });
    const bookings = await roomBookingApi.list({ delayMs: 0, pageIndex: 0, pageSize: 5 });

    expect(classes.totalRows).toBe(classes.rows.length);
    expect(attendees.rows).toHaveLength(2);
    expect(bookings.totalRows).toBe(BOOKING_STORE_ROW_COUNT);
  });
});
