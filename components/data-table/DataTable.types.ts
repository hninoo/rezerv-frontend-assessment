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

export type RowExpansionState = {
  isLoading?: boolean;
  error?: string | null;
};

export type ColumnDef<T> = {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  pinned?: "left";
  width?: number;
};

export type DataTableProps<T> = {
  rows: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  ariaLabel?: string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  manualSorting?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  manualPagination?: boolean;
  totalRows?: number;
  canExpandRow?: (row: T) => boolean;
  renderExpandedRow?: (row: T) => ReactNode;
  getRowExpansionState?: (row: T) => RowExpansionState;
  onExpandedRowChange?: (row: T, isExpanded: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
};
