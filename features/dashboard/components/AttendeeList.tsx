import type { PaginationState } from "@/components/data-table/DataTable.types";
import type { Attendee } from "@/lib/data/attendees";

export function AttendeeList({
  attendees,
  onPageChange,
  pagination,
  totalRows
}: {
  attendees: Attendee[];
  onPageChange?: (nextPagination: PaginationState) => void;
  pagination?: PaginationState;
  totalRows: number;
}) {
  const pageIndex = pagination?.pageIndex ?? 0;
  const pageSize = pagination?.pageSize ?? totalRows;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = totalRows === 0 ? 0 : Math.min(startRow + attendees.length - 1, totalRows);

  if (totalRows === 0) {
    return (
      <p className="attendee-list__empty" role="status">
        No attendee rows found.
      </p>
    );
  }

  return (
    <div aria-live="polite" className="attendee-list-wrap">
      <div className="attendee-list" role="list">
        {attendees.map((attendee) => (
          <div className="attendee-list__row" key={attendee.id} role="listitem">
            <span>{attendee.customerName}</span>
            <span>{attendee.paymentType}</span>
            <span>{attendee.bookingStatus}</span>
          </div>
        ))}
      </div>
      <div className="attendee-list__footer">
        <span>
          Showing {startRow}-{endRow} of {totalRows}
        </span>
        {onPageChange && pagination ? (
          <div className="attendee-list__pager">
            <button
              aria-label="Previous attendee page"
              disabled={pageIndex === 0}
              onClick={() => onPageChange({ ...pagination, pageIndex: pageIndex - 1 })}
              type="button"
            >
              Previous
            </button>
            <span>
              Page {pageIndex + 1} of {pageCount}
            </span>
            <button
              aria-label="Next attendee page"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => onPageChange({ ...pagination, pageIndex: pageIndex + 1 })}
              type="button"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
