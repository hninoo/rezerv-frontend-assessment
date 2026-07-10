import { describe, expect, it } from "vitest";

import { toggleExpandedRow } from "./expansion";
import { clampPageIndex, getPageCount, paginateRows } from "./pagination";
import { compareValues, getNextSortDirection } from "./sorting";

describe("table utilities", () => {
  it("sorts numeric and text values in both directions", () => {
    expect(compareValues(2, 10, "asc")).toBeLessThan(0);
    expect(compareValues(2, 10, "desc")).toBeGreaterThan(0);
    expect(compareValues("Class A", "Class B", "asc")).toBeLessThan(0);
  });

  it("returns rows for the requested page", () => {
    expect(paginateRows(["a", "b", "c", "d"], 1, 2)).toEqual(["c", "d"]);
  });

  it("calculates and clamps pagination bounds", () => {
    expect(getPageCount(21, 10)).toBe(3);
    expect(getPageCount(0, 10)).toBe(1);
    expect(clampPageIndex(-1, 3)).toBe(0);
    expect(clampPageIndex(9, 3)).toBe(2);
  });

  it("cycles sort direction through asc, desc, and none", () => {
    expect(getNextSortDirection()).toBe("asc");
    expect(getNextSortDirection("asc")).toBe("desc");
    expect(getNextSortDirection("desc")).toBeNull();
  });

  it("toggles expanded row ids without mutating the original set", () => {
    const expandedIds = new Set(["row-1"]);
    const withSecondRow = toggleExpandedRow(expandedIds, "row-2");
    const withoutFirstRow = toggleExpandedRow(withSecondRow, "row-1");

    expect(expandedIds.has("row-2")).toBe(false);
    expect(withSecondRow.has("row-2")).toBe(true);
    expect(withoutFirstRow.has("row-1")).toBe(false);
  });
});
