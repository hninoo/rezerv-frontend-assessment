import type { CSSProperties } from "react";

import { formatCount } from "@/lib/format/number";
import type { DataTableProps } from "./DataTable.types";

export const defaultPageSizeOptions = [5, 10, 20];

export { formatCount };

export function getColumnStyle(width?: number): CSSProperties | undefined {
  return width ? { minWidth: `${width}px`, width: `${width}px` } : undefined;
}

export function getCellClassName(isPinned: boolean) {
  return isPinned ? "data-table__cell--pinned" : undefined;
}

export function getDisplayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return String(value ?? "");
}

export function getSortValue<T>(row: T, column: DataTableProps<T>["columns"][number]) {
  if (column.sortValue) {
    return column.sortValue(row);
  }

  return getDisplayValue(column.accessor(row));
}

export function getSkeletonRows(rowCount: number) {
  return Array.from({ length: rowCount }, (_, index) => `skeleton-${index}`);
}

export function getSafeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
