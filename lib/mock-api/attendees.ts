import { sampleAttendees, type Attendee } from "@/lib/data/attendees";
import type { MockRequestOptions, MockResourceApi, PagedResult } from "./types";
import { wait } from "./wait";

type FetchAttendeesOptions = MockRequestOptions & {
  pageIndex?: number;
  pageSize?: number;
};

export type FetchAttendeesQuery = FetchAttendeesOptions & {
  classId: string;
};

export type AttendeeApi = MockResourceApi<FetchAttendeesQuery, Attendee>;

export async function fetchAttendeesByClassId(
  classId: string,
  { delayMs = 450, pageIndex = 0, pageSize = 2, shouldFail = false }: FetchAttendeesOptions = {}
): Promise<PagedResult<Attendee>> {
  await wait(delayMs);

  if (shouldFail) {
    throw new Error("Unable to load attendees for this class.");
  }

  const attendees = sampleAttendees.filter((attendee) => attendee.classId === classId);
  const start = pageIndex * pageSize;

  return {
    rows: attendees.slice(start, start + pageSize),
    totalRows: attendees.length
  };
}

export const attendeeApi: AttendeeApi = {
  list: ({ classId, ...options }) => fetchAttendeesByClassId(classId, options)
};
