import type { MockRequestOptions } from "./types";
import { wait } from "./wait";

export type RoomBookingDetail = {
  id: string;
  roomBookingId: string;
  label: string;
  value: string;
  status: "Ready" | "Pending" | "Blocked";
};

export const FAILING_ROOM_REMAINDER = 13;

const DETAIL_TEMPLATES: { label: string; value: string }[] = [
  { label: "Equipment", value: "Yoga mats, wall mirror, speaker" },
  { label: "Check-in", value: "Front desk opens 15 minutes before the booking" },
  { label: "Staff", value: "Coach requested projector setup" },
  { label: "Cleaning", value: "Room reset scheduled between sessions" },
  { label: "Access", value: "Key card required outside staffed hours" },
  { label: "Layout", value: "Open floor with movable partitions" }
];

const DETAIL_STATUSES: RoomBookingDetail["status"][] = ["Ready", "Pending", "Blocked"];

type FetchRoomBookingDetailsOptions = MockRequestOptions;

function hashRoomNumber(roomNumber: number) {
  let hash = Math.imul(roomNumber, 2246822519);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2654435761);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export async function fetchRoomBookingDetails(
  roomBookingId: string,
  { delayMs = 360, shouldFail }: FetchRoomBookingDetailsOptions = {}
): Promise<RoomBookingDetail[]> {
  await wait(delayMs);

  const roomNumber = Number(roomBookingId.replace("room-", ""));
  const fails = shouldFail ?? (Number.isInteger(roomNumber) && roomNumber % 50 === FAILING_ROOM_REMAINDER);

  if (fails) {
    throw new Error("Unable to load room booking details.");
  }

  const hash = hashRoomNumber(roomNumber);
  const detailCount = 2 + (hash % 2);
  const firstTemplate = (hash >>> 3) % DETAIL_TEMPLATES.length;

  return Array.from({ length: detailCount }, (_, offset) => {
    const template = DETAIL_TEMPLATES[(firstTemplate + offset) % DETAIL_TEMPLATES.length];

    return {
      id: `${roomBookingId}-detail-${offset + 1}`,
      roomBookingId,
      label: template.label,
      value: template.value,
      status: DETAIL_STATUSES[(hash >>> (5 + offset * 2)) % DETAIL_STATUSES.length]
    };
  });
}
