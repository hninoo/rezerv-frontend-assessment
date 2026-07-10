import { describe, expect, it } from "vitest";

import { toggleExpandedRow } from "./expansion";
import { paginateRows } from "./pagination";
import { compareValues } from "./sorting";

describe("table utilities", () => {
  it("sorts numeric and text values in both directions", () => {
    expect(compareValues(2, 10, "asc")).toBeLessThan(0);
    expect(compareValues(2, 10, "desc")).toBeGreaterThan(0);
    expect(compareValues("Class A", "Class B", "asc")).toBeLessThan(0);
  });

  it("returns rows for the requested page", () => {
    expect(paginateRows(["a", "b", "c", "d"], 1, 2)).toEqual(["c", "d"]);
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
