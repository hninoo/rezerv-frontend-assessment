import type { DataTableProps, SortState } from "./DataTable.types";
import { getCellClassName, getColumnStyle } from "./DataTable.helpers";
import { DataTableSortIcon } from "./DataTableSortIcon";

interface DataTableHeaderProps<T> {
  activeSort: SortState | null;
  columns: DataTableProps<T>["columns"];
  onSort: (columnId: string) => void;
}

export function DataTableHeader<T>({ activeSort, columns, onSort }: DataTableHeaderProps<T>) {
  function getColumnAriaSort(column: DataTableProps<T>["columns"][number]) {
    if (!column.sortable) {
      return undefined;
    }

    if (activeSort?.columnId !== column.id) {
      return "none";
    }

    return activeSort.direction === "asc" ? "ascending" : "descending";
  }

  function renderHeader(column: DataTableProps<T>["columns"][number]) {
    const isSorted = activeSort?.columnId === column.id;
    const sortLabel = isSorted ? activeSort.direction : "none";

    if (!column.sortable) {
      return column.header;
    }

    return (
      <button
        aria-label={`Sort by ${column.header}`}
        className="data-table__sort-button"
        onClick={() => onSort(column.id)}
        type="button"
      >
        <span>{column.header}</span>
        <span aria-hidden="true" className="data-table__sort-mark">
          <DataTableSortIcon direction={sortLabel} />
        </span>
      </button>
    );
  }

  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th
            aria-sort={getColumnAriaSort(column)}
            className={getCellClassName(column.pinned === "left")}
            key={column.id}
            style={getColumnStyle(column.width)}
          >
            {renderHeader(column)}
          </th>
        ))}
      </tr>
    </thead>
  );
}
