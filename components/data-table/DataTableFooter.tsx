import type { PaginationState } from "./DataTable.types";
import { formatCount } from "./DataTable.helpers";

interface DataTableFooterProps {
  activePagination: PaginationState;
  endRow: number;
  isLoading: boolean | undefined;
  isPageInputValid: boolean;
  onPageInputBlur: () => void;
  onPageInputChange: (value: string) => void;
  onPageJump: () => void;
  onPageSizeChange: (pageSize: number) => void;
  onPaginationChange: (pagination: PaginationState) => void;
  pageCount: number;
  pageIndex: number;
  pageInput: string;
  pageSizeOptions: number[];
  rowCount: number;
  startRow: number;
}

export function DataTableFooter({
  activePagination,
  endRow,
  isLoading,
  isPageInputValid,
  onPageInputBlur,
  onPageInputChange,
  onPageJump,
  onPageSizeChange,
  onPaginationChange,
  pageCount,
  pageIndex,
  pageInput,
  pageSizeOptions,
  rowCount,
  startRow
}: DataTableFooterProps) {
  return (
    <div className="data-table__footer">
      <span>
        Showing {formatCount(startRow)}-{formatCount(endRow)} of {formatCount(rowCount)}
      </span>
      <span>
        Page {formatCount(pageIndex + 1)} of {formatCount(pageCount)}
      </span>
      <label>
        <span>Rows</span>
        <select
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          value={activePagination.pageSize}
        >
          {pageSizeOptions.map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </select>
      </label>
      <div className="data-table__pager">
        <button
          disabled={pageIndex === 0 || isLoading}
          onClick={() => onPaginationChange({ ...activePagination, pageIndex: pageIndex - 1 })}
          type="button"
        >
          Previous
        </button>
        <button
          disabled={pageIndex >= pageCount - 1 || isLoading}
          onClick={() => onPaginationChange({ ...activePagination, pageIndex: pageIndex + 1 })}
          type="button"
        >
          Next
        </button>
      </div>
      <label className="data-table__jump">
        <span>Go to page</span>
        <input
          inputMode="numeric"
          max={pageCount}
          min={1}
          onBlur={onPageInputBlur}
          onChange={(event) => onPageInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onPageJump();
            }
          }}
          placeholder={`${pageIndex + 1}`}
          type="number"
          value={pageInput}
        />
        <button disabled={isLoading || !isPageInputValid} onClick={onPageJump} type="button">
          Go
        </button>
      </label>
    </div>
  );
}
