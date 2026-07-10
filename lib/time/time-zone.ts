export const APP_GMT_OFFSET_MINUTES = 390;

export function getGmtOffsetLabel(offsetMinutes = APP_GMT_OFFSET_MINUTES) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");

  return `GMT${sign}${hours}:${minutes}`;
}

export function applyGmtOffset(date: Date, offsetMinutes = APP_GMT_OFFSET_MINUTES) {
  return new Date(date.getTime() + offsetMinutes * 60000);
}

export function formatTimeRange(startAtUtc: string, endAtUtc: string, offsetMinutes = APP_GMT_OFFSET_MINUTES) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: "UTC"
  });
  const startDate = applyGmtOffset(new Date(startAtUtc), offsetMinutes);
  const endDate = applyGmtOffset(new Date(endAtUtc), offsetMinutes);

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}
