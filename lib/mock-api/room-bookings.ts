import type { SortState } from "@/components/data-table/DataTable.types";

import { getBookingStore } from "./booking-store";
import type { BookingStats, RoomBooking } from "./booking-store";
import { fetchRoomBookingDetails } from "./room-booking-details";
import type { RoomBookingDetail } from "./room-booking-details";
import type { MockRequestOptions, MockResourceApi, PagedResult } from "./types";
import { wait } from "./wait";

export type { BookingStats, RoomBooking } from "./booking-store";

export const ROOM_BOOKING_MAX_PAGE_SIZE = 50;

export type FetchRoomBookingsOptions = MockRequestOptions & {
  pageIndex: number;
  pageSize: number;
  query?: string;
  sort?: SortState | null;
  status?: RoomBooking["status"] | "All";
};

type FetchRoomBookingStatsOptions = MockRequestOptions;

export type RoomBookingApi = MockResourceApi<
  FetchRoomBookingsOptions,
  RoomBooking,
  BookingStats,
  string,
  RoomBookingDetail
>;

export async function fetchRoomBookings({
  delayMs = 280,
  pageIndex,
  pageSize,
  query,
  shouldFail = false,
  status = "All",
  sort
}: FetchRoomBookingsOptions): Promise<PagedResult<RoomBooking>> {
  const store = await getBookingStore();

  await wait(delayMs);

  if (shouldFail) {
    throw new Error("Unable to load room bookings.");
  }

  return store.query({
    pageIndex: Math.max(pageIndex, 0),
    pageSize: Math.min(Math.max(pageSize, 1), ROOM_BOOKING_MAX_PAGE_SIZE),
    query,
    status,
    sort
  });
}

export async function fetchRoomBookingStats({
  delayMs = 200,
  shouldFail = false
}: FetchRoomBookingStatsOptions = {}): Promise<BookingStats> {
  const store = await getBookingStore();

  await wait(delayMs);

  if (shouldFail) {
    throw new Error("Unable to load room booking totals.");
  }

  return store.getStats();
}

export const roomBookingApi: RoomBookingApi = {
  details: fetchRoomBookingDetails,
  list: fetchRoomBookings,
  stats: fetchRoomBookingStats
};
