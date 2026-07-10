import { describe, expect, it } from "vitest";

import { applyGmtOffset, formatTimeRange, getGmtOffsetLabel } from "./time-zone";

describe("time zone helpers", () => {
  it("formats the timetable by adding the configured GMT offset", () => {
    expect(formatTimeRange("2026-07-06T03:30:00.000Z", "2026-07-06T04:30:00.000Z", 390)).toBe(
      "10:00 AM - 11:00 AM"
    );
  });

  it("applies positive and negative GMT offsets", () => {
    expect(applyGmtOffset(new Date("2026-07-06T03:30:00.000Z"), 390).toISOString()).toBe(
      "2026-07-06T10:00:00.000Z"
    );
    expect(formatTimeRange("2026-07-06T03:30:00.000Z", "2026-07-06T04:30:00.000Z", -300)).toBe("10:30 PM - 11:30 PM");
  });

  it("returns a GMT label from offset minutes", () => {
    expect(getGmtOffsetLabel(390)).toBe("GMT+06:30");
  });
});
