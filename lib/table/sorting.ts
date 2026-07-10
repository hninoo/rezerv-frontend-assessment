import type { SortDirection } from "@/components/data-table/DataTable.types";

export function compareValues(a: string | number, b: string | number, direction: SortDirection) {
  const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));

  return direction === "asc" ? result : -result;
}

export function getNextSortDirection(currentDirection?: SortDirection) {
  if (!currentDirection) {
    return "asc";
  }

  if (currentDirection === "asc") {
    return "desc";
  }

  return null;
}
