import type { PagedResult } from "./types";

export type RoomBooking = {
  id: string;
  room: string;
  ownerTeam: string;
  window: string;
  capacity: string;
  status: "Confirmed" | "Pending" | "Cancelled";
};

export type BookingStats = {
  totalRows: number;
  confirmed: number;
  pending: number;
  cancelled: number;
};

export type BookingQuery = {
  pageIndex: number;
  pageSize: number;
  query?: string;
  status?: RoomBooking["status"] | "All";
  sort?: { columnId: string; direction: "asc" | "desc" } | null;
};

export interface BookingStore {
  rowCount: number;
  getRowAt: (index: number) => RoomBooking;
  getStats: () => BookingStats;
  query: (input: BookingQuery) => PagedResult<RoomBooking>;
}

export const BOOKING_STORE_ROW_COUNT = 5_000_000;

const TEAMS = ["Coaching Team", "Events Team", "Member Care", "Operations Team", "Performance Team", "Recovery Team"];
const STATUSES: RoomBooking["status"][] = ["Cancelled", "Confirmed", "Pending"];
const DURATIONS = [30, 45, 60, 90];
const CAPACITY_TOTALS = [4, 6, 8, 10, 12, 16, 18, 20, 24, 30];
const MAX_CAPACITY = 30;
const FIRST_SLOT_MINUTE = 360;
const SLOT_COUNT = 53;
const ROOM_NUMBER_PAD = 7;
const BUILD_CHUNK_SIZE = 500_000;

export function hashIndex(index: number) {
  let hash = Math.imul(index + 1, 2654435761);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822519);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

function yieldToEventLoop() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function formatSlotMinute(totalMinutes: number) {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function hasNumericPrefix(value: number, prefix: number) {
  let current = value;

  while (current > 0) {
    if (current === prefix) {
      return true;
    }

    current = Math.floor(current / 10);
  }

  return false;
}

export function buildOrderByKey(keys: Uint8Array, keyCount: number) {
  const offsets = new Uint32Array(keyCount + 1);

  for (let index = 0; index < keys.length; index += 1) {
    offsets[keys[index] + 1] += 1;
  }

  for (let key = 0; key < keyCount; key += 1) {
    offsets[key + 1] += offsets[key];
  }

  const order = new Uint32Array(keys.length);

  for (let index = 0; index < keys.length; index += 1) {
    order[offsets[keys[index]]] = index;
    offsets[keys[index]] += 1;
  }

  return order;
}

type BookingFilter = {
  matchAll: boolean;
  matchNone: boolean;
  requiredStatusId: number;
  hasSearch: boolean;
  roomPrefix: number;
  teamMatches: boolean[] | null;
  statusMatches: boolean[] | null;
};

function resolveFilter(search: string | undefined, status: BookingQuery["status"]): BookingFilter {
  const requiredStatusId = !status || status === "All" ? -1 : STATUSES.indexOf(status);
  const normalizedSearch = (search ?? "").trim().toLowerCase();

  if (normalizedSearch.length === 0) {
    return {
      matchAll: requiredStatusId < 0,
      matchNone: false,
      requiredStatusId,
      hasSearch: false,
      roomPrefix: -1,
      teamMatches: null,
      statusMatches: null
    };
  }

  const roomPrefix = /^\d+$/.test(normalizedSearch) ? Number(normalizedSearch) : -1;
  const teamMatches = TEAMS.map((team) => team.toLowerCase().includes(normalizedSearch));
  const statusMatches = STATUSES.map((statusLabel) => statusLabel.toLowerCase().includes(normalizedSearch));
  const hasAnyMatch = roomPrefix > 0 || teamMatches.includes(true) || statusMatches.includes(true);

  return {
    matchAll: false,
    matchNone: !hasAnyMatch,
    requiredStatusId,
    hasSearch: true,
    roomPrefix,
    teamMatches,
    statusMatches
  };
}

type CreateBookingStoreOptions = {
  chunkSize?: number;
};

type BookingColumns = {
  rowCount: number;
  teamIds: Uint8Array;
  statusIds: Uint8Array;
  slotIds: Uint8Array;
  durationIds: Uint8Array;
  capacityTotalIds: Uint8Array;
  capacityUsed: Uint8Array;
  statusCounts: number[];
};

export class BookingService implements BookingStore {
  readonly rowCount: number;
  private readonly teamIds: Uint8Array;
  private readonly statusIds: Uint8Array;
  private readonly slotIds: Uint8Array;
  private readonly durationIds: Uint8Array;
  private readonly capacityTotalIds: Uint8Array;
  private readonly capacityUsed: Uint8Array;
  private readonly statusCounts: number[];
  private readonly sortKeys: Record<string, { keys: Uint8Array; keyCount: number }>;
  private readonly orderCache = new Map<string, Uint32Array>();

  constructor(columns: BookingColumns) {
    this.rowCount = columns.rowCount;
    this.teamIds = columns.teamIds;
    this.statusIds = columns.statusIds;
    this.slotIds = columns.slotIds;
    this.durationIds = columns.durationIds;
    this.capacityTotalIds = columns.capacityTotalIds;
    this.capacityUsed = columns.capacityUsed;
    this.statusCounts = columns.statusCounts;
    this.sortKeys = {
      ownerTeam: { keys: this.teamIds, keyCount: TEAMS.length },
      status: { keys: this.statusIds, keyCount: STATUSES.length },
      window: { keys: this.slotIds, keyCount: SLOT_COUNT },
      capacity: { keys: this.capacityUsed, keyCount: MAX_CAPACITY + 1 }
    };
  }

  private resolveOrder(sort: BookingQuery["sort"]) {
    if (!sort) {
      return { order: null as Uint32Array | null, reversed: false };
    }

    if (sort.columnId === "room") {
      return { order: null, reversed: sort.direction === "desc" };
    }

    const keySpec = this.sortKeys[sort.columnId];

    if (!keySpec) {
      return { order: null, reversed: false };
    }

    let order = this.orderCache.get(sort.columnId);

    if (!order) {
      order = buildOrderByKey(keySpec.keys, keySpec.keyCount);
      this.orderCache.set(sort.columnId, order);
    }

    return { order, reversed: sort.direction === "desc" };
  }

  private rowIndexAt(position: number, order: Uint32Array | null, reversed: boolean) {
    const orderedPosition = reversed ? this.rowCount - 1 - position : position;

    return order ? order[orderedPosition] : orderedPosition;
  }

  private matchesFilter(index: number, filter: BookingFilter) {
    if (filter.requiredStatusId >= 0 && this.statusIds[index] !== filter.requiredStatusId) {
      return false;
    }

    if (!filter.hasSearch) {
      return true;
    }

    if (filter.teamMatches?.[this.teamIds[index]]) {
      return true;
    }

    if (filter.statusMatches?.[this.statusIds[index]]) {
      return true;
    }

    return filter.roomPrefix > 0 && hasNumericPrefix(index + 1, filter.roomPrefix);
  }

  getRowAt(index: number): RoomBooking {
    const startMinute = FIRST_SLOT_MINUTE + this.slotIds[index] * 15;
    const endMinute = startMinute + DURATIONS[this.durationIds[index]];

    return {
      id: `room-${index + 1}`,
      room: `Room ${String(index + 1).padStart(ROOM_NUMBER_PAD, "0")}`,
      ownerTeam: TEAMS[this.teamIds[index]],
      window: `${formatSlotMinute(startMinute)} - ${formatSlotMinute(endMinute)}`,
      capacity: `${this.capacityUsed[index]} / ${CAPACITY_TOTALS[this.capacityTotalIds[index]]}`,
      status: STATUSES[this.statusIds[index]]
    };
  }

  getStats(): BookingStats {
    return {
      totalRows: this.rowCount,
      cancelled: this.statusCounts[0],
      confirmed: this.statusCounts[1],
      pending: this.statusCounts[2]
    };
  }

  query({ pageIndex, pageSize, query: search, status = "All", sort = null }: BookingQuery): PagedResult<RoomBooking> {
    const safePageSize = Math.max(1, pageSize);
    const start = Math.max(0, pageIndex) * safePageSize;
    const { order, reversed } = this.resolveOrder(sort);
    const filter = resolveFilter(search, status);

    if (filter.matchNone) {
      return { rows: [], totalRows: 0 };
    }

    if (filter.matchAll) {
      const rows: RoomBooking[] = [];
      const end = Math.min(start + safePageSize, this.rowCount);

      for (let position = start; position < end; position += 1) {
        rows.push(this.getRowAt(this.rowIndexAt(position, order, reversed)));
      }

      return { rows, totalRows: this.rowCount };
    }

    const rows: RoomBooking[] = [];
    let matched = 0;

    for (let position = 0; position < this.rowCount; position += 1) {
      const rowIndex = this.rowIndexAt(position, order, reversed);

      if (!this.matchesFilter(rowIndex, filter)) {
        continue;
      }

      if (matched >= start && rows.length < safePageSize) {
        rows.push(this.getRowAt(rowIndex));
      }

      matched += 1;
    }

    return { rows, totalRows: matched };
  }
}

export async function createBookingStore(
  rowCount: number,
  { chunkSize = BUILD_CHUNK_SIZE }: CreateBookingStoreOptions = {}
): Promise<BookingStore> {
  const teamIds = new Uint8Array(rowCount);
  const statusIds = new Uint8Array(rowCount);
  const slotIds = new Uint8Array(rowCount);
  const durationIds = new Uint8Array(rowCount);
  const capacityTotalIds = new Uint8Array(rowCount);
  const capacityUsed = new Uint8Array(rowCount);
  const statusCounts = [0, 0, 0];

  for (let chunkStart = 0; chunkStart < rowCount; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, rowCount);

    for (let index = chunkStart; index < chunkEnd; index += 1) {
      const hash = hashIndex(index);
      const statusRoll = (hash >>> 3) % 100;
      const statusId = statusRoll < 15 ? 0 : statusRoll < 75 ? 1 : 2;
      const capacityTotalId = (hash >>> 14) % CAPACITY_TOTALS.length;

      teamIds[index] = hash % TEAMS.length;
      statusIds[index] = statusId;
      slotIds[index] = (hash >>> 7) % SLOT_COUNT;
      durationIds[index] = (hash >>> 11) % DURATIONS.length;
      capacityTotalIds[index] = capacityTotalId;
      capacityUsed[index] = statusId === 0 ? 0 : (hash >>> 17) % (CAPACITY_TOTALS[capacityTotalId] + 1);
      statusCounts[statusId] += 1;
    }

    if (chunkEnd < rowCount) {
      await yieldToEventLoop();
    }
  }

  return new BookingService({
    capacityTotalIds,
    capacityUsed,
    durationIds,
    rowCount,
    slotIds,
    statusCounts,
    statusIds,
    teamIds
  });
}

let storePromise: Promise<BookingStore> | null = null;

export function getBookingStore() {
  storePromise ??= createBookingStore(BOOKING_STORE_ROW_COUNT);

  return storePromise;
}
