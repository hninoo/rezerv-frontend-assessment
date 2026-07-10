import { sampleAttendees } from "@/lib/data/attendees";

type FetchAttendeesOptions = {
  shouldFail?: boolean;
  delayMs?: number;
};

export async function fetchAttendeesByClassId(
  classId: string,
  { delayMs = 450, shouldFail = false }: FetchAttendeesOptions = {}
) {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

  if (shouldFail) {
    throw new Error("Unable to load attendees for this class.");
  }

  return sampleAttendees.filter((attendee) => attendee.classId === classId);
}
