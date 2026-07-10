import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export type SortState = {
  columnId: string;
  direction: SortDirection;
};

export type PaginationState = {
  pageIndex: number;
  pageSize: number;
};

export type ColumnDef<T> = {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  pinned?: "left";
  width?: number;
};

export type DataTableProps<T> = {
  rows: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  sort?: SortState | null;
  pagination?: PaginationState;
  isLoading?: boolean;
  error?: string | null;
};
