import { describe, expect, it } from "vitest";

import { buildOrderByKey, createBookingStore, formatSlotMinute, hasNumericPrefix, hashIndex } from "./booking-store";

const storePromise = createBookingStore(500);

function getCapacityUsed(capacity: string) {
  return Number(capacity.split(" / ")[0]);
}

function isSorted(values: number[], direction: "asc" | "desc") {
  return values.every((value, index) => {
    if (index === 0) {
      return true;
    }

    return direction === "asc" ? values[index - 1] <= value : values[index - 1] >= value;
  });
}

describe("booking store helpers", () => {
  it("matches numeric prefixes", () => {
    expect(hasNumericPrefix(1234, 12)).toBe(true);
    expect(hasNumericPrefix(1234, 1234)).toBe(true);
    expect(hasNumericPrefix(5, 5)).toBe(true);
    expect(hasNumericPrefix(1234, 23)).toBe(false);
    expect(hasNumericPrefix(123, 0)).toBe(false);
  });

  it("builds a stable counting-sort order", () => {
    expect(Array.from(buildOrderByKey(new Uint8Array([2, 0, 1]), 3))).toEqual([1, 2, 0]);
    expect(Array.from(buildOrderByKey(new Uint8Array([1, 0, 1, 0]), 2))).toEqual([1, 3, 0, 2]);
  });

  it("formats slot minutes as 12-hour labels", () => {
    expect(formatSlotMinute(360)).toBe("6:00 AM");
    expect(formatSlotMinute(750)).toBe("12:30 PM");
    expect(formatSlotMinute(795)).toBe("1:15 PM");
  });

  it("hashes indexes deterministically", () => {
    expect(hashIndex(42)).toBe(hashIndex(42));
    expect(hashIndex(42)).not.toBe(hashIndex(43));
  });
});

describe("booking store", () => {
  it("pages rows in room order by default", async () => {
    const store = await storePromise;
    const result = store.query({ pageIndex: 0, pageSize: 10 });

    expect(result.totalRows).toBe(500);
    expect(result.rows).toHaveLength(10);
    expect(result.rows[0].id).toBe("room-1");
    expect(result.rows[0].room).toBe("Room 0000001");
    expect(result.rows[9].id).toBe("room-10");
  });

  it("sorts by capacity in both directions", async () => {
    const store = await storePromise;
    const ascending = store.query({ pageIndex: 0, pageSize: 20, sort: { columnId: "capacity", direction: "asc" } });
    const descending = store.query({ pageIndex: 0, pageSize: 20, sort: { columnId: "capacity", direction: "desc" } });

    const ascendingValues = ascending.rows.map((row) => getCapacityUsed(row.capacity));
    const descendingValues = descending.rows.map((row) => getCapacityUsed(row.capacity));

    expect(isSorted(ascendingValues, "asc")).toBe(true);
    expect(isSorted(descendingValues, "desc")).toBe(true);
    expect(ascendingValues[0]).toBe(0);
  });

  it("sorts by room descending", async () => {
    const store = await storePromise;
    const result = store.query({ pageIndex: 0, pageSize: 5, sort: { columnId: "room", direction: "desc" } });

    expect(result.rows[0].id).toBe("room-500");
  });

  it("filters by status before pagination", async () => {
    const store = await storePromise;
    const result = store.query({ pageIndex: 0, pageSize: 500, status: "Pending" });

    expect(result.rows.every((row) => row.status === "Pending")).toBe(true);
    expect(result.totalRows).toBe(store.getStats().pending);
  });

  it("matches team names through search", async () => {
    const store = await storePromise;
    const result = store.query({ pageIndex: 0, pageSize: 50, query: "operations" });

    expect(result.totalRows).toBeGreaterThan(0);
    expect(result.rows.every((row) => row.ownerTeam === "Operations Team")).toBe(true);
  });

  it("matches room numbers by prefix", async () => {
    const store = await storePromise;
    const result = store.query({ pageIndex: 0, pageSize: 50, query: "12" });

    expect(result.totalRows).toBe(11);
    expect(result.rows[0].id).toBe("room-12");
  });

  it("returns an empty page for out-of-range pages without losing the total", async () => {
    const store = await storePromise;
    const result = store.query({ pageIndex: 999, pageSize: 20 });

    expect(result.rows).toHaveLength(0);
    expect(result.totalRows).toBe(500);
  });

  it("ignores an invalid sort key", async () => {
    const store = await storePromise;
    const result = store.query({ pageIndex: 0, pageSize: 5, sort: { columnId: "missing", direction: "desc" } });

    expect(result.rows[0].id).toBe("room-1");
  });

  it("reports status totals that add up to the row count", async () => {
    const store = await storePromise;
    const stats = store.getStats();

    expect(stats.confirmed + stats.pending + stats.cancelled).toBe(stats.totalRows);
    expect(stats.totalRows).toBe(500);
  });
});
