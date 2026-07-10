import type { DataTableProps } from "./DataTable.types";
import { getSkeletonRows } from "./DataTable.helpers";

interface DataTableExpandedContentProps<T> {
  getRowExpansionState: DataTableProps<T>["getRowExpansionState"];
  renderExpandedRow: DataTableProps<T>["renderExpandedRow"];
  row: T;
}

export function DataTableExpandedContent<T>({
  getRowExpansionState,
  renderExpandedRow,
  row
}: DataTableExpandedContentProps<T>) {
  const expansionState = getRowExpansionState?.(row);

  if (expansionState?.isLoading) {
    return (
      <div className="attendee-list-wrap" role="status">
        <div aria-hidden="true" className="attendee-list attendee-list--loading">
          {getSkeletonRows(2).map((rowId) => (
            <div className="attendee-list__row" key={rowId}>
              <span className="data-table__skeleton" />
              <span className="data-table__skeleton" />
              <span className="data-table__skeleton" />
            </div>
          ))}
        </div>
        <span className="data-table__detail-state">Loading details...</span>
      </div>
    );
  }

  if (expansionState?.error) {
    return (
      <span className="data-table__detail-state data-table__detail-state--error" role="alert">
        {expansionState.error}
      </span>
    );
  }

  return renderExpandedRow?.(row);
}
