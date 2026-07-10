"use client";

import { useMemo, useRef, useState } from "react";

import { clampPageIndex, getPageCount, paginateRows } from "@/lib/table/pagination";
import { compareValues, getNextSortDirection } from "@/lib/table/sorting";
import { toggleExpandedRow } from "@/lib/table/expansion";

import { DataTableBody } from "./DataTableBody";
import { DataTableFooter } from "./DataTableFooter";
import { DataTableHeader } from "./DataTableHeader";
import { defaultPageSizeOptions, getSortValue } from "./DataTable.helpers";
import type { DataTableProps, PaginationState, SortState } from "./DataTable.types";

export function DataTable<T>({
  columns,
  ariaLabel,
  defaultPageSize = 5,
  pageSizeOptions = defaultPageSizeOptions,
  error,
  getRowId,
  canExpandRow,
  getRowExpansionState,
  isLoading,
  manualPagination,
  manualSorting,
  onExpandedRowChange,
  onPaginationChange,
  onSortChange,
  pagination,
  renderExpandedRow,
  rows,
  sort,
  totalRows
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<SortState | null>(null);
  const [localPagination, setLocalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [closingExpandedIds, setClosingExpandedIds] = useState<Set<string>>(new Set());
  const [hasPinnedShadow, setHasPinnedShadow] = useState(false);
  const [pageInputDraft, setPageInputDraft] = useState("");
  const [isPageInputDirty, setIsPageInputDirty] = useState(false);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  const activeSort = sort === undefined ? localSort : sort;
  const activePagination = pagination ?? localPagination;

  const sortedRows = useMemo(() => {
    if (manualSorting) {
      return rows;
    }

    if (!activeSort) {
      return rows;
    }

    const sortColumn = columns.find((column) => column.id === activeSort.columnId);

    if (!sortColumn) {
      return rows;
    }

    return [...rows].sort((a, b) => compareValues(getSortValue(a, sortColumn), getSortValue(b, sortColumn), activeSort.direction));
  }, [activeSort, columns, manualSorting, rows]);

  const rowCount = totalRows ?? sortedRows.length;
  const pageCount = getPageCount(rowCount, activePagination.pageSize);
  const pageIndex = clampPageIndex(activePagination.pageIndex, pageCount);
  const pageRows = manualPagination ? sortedRows : paginateRows(sortedRows, pageIndex, activePagination.pageSize);
  const startRow = rowCount === 0 ? 0 : pageIndex * activePagination.pageSize + 1;
  const endRow = rowCount === 0 ? 0 : Math.min(startRow + pageRows.length - 1, rowCount);
  const currentPageInput = String(pageIndex + 1);
  const pageInput = isPageInputDirty ? pageInputDraft : currentPageInput;
  const canSubmitPageJump = isValidPageJumpValue(pageInput);

  function isValidPageJumpValue(value: string) {
    if (value.trim().length === 0) {
      return false;
    }

    const nextPage = Number(value);

    return Number.isInteger(nextPage) && nextPage >= 1;
  }

  function updateSort(nextSort: SortState | null) {
    if (sort === undefined) {
      setLocalSort(nextSort);
      setLocalPagination((current) => ({ ...current, pageIndex: 0 }));
    }

    onSortChange?.(nextSort);

    if (pagination) {
      onPaginationChange?.({ ...activePagination, pageIndex: 0 });
    }

    setPageInputDraft("");
    setIsPageInputDirty(false);
  }

  function updatePagination(nextPagination: PaginationState) {
    setPageInputDraft("");
    setIsPageInputDirty(false);

    if (!pagination) {
      setLocalPagination(nextPagination);
    }

    onPaginationChange?.(nextPagination);
  }

  function handleSort(columnId: string) {
    const currentDirection = activeSort?.columnId === columnId ? activeSort.direction : undefined;
    const nextDirection = getNextSortDirection(currentDirection);

    updateSort(nextDirection ? { columnId, direction: nextDirection } : null);
  }

  function handlePageSizeChange(pageSize: number) {
    setPageInputDraft("");
    setIsPageInputDirty(false);
    updatePagination({ pageIndex: 0, pageSize });
  }

  function handlePageInputChange(value: string) {
    setPageInputDraft(value);
    setIsPageInputDirty(true);
  }

  function handlePageJump() {
    if (pageInput.trim().length === 0) {
      setPageInputDraft("");
      setIsPageInputDirty(false);
      return;
    }

    const nextPage = Number(pageInput);

    if (!Number.isInteger(nextPage) || nextPage < 1) {
      setPageInputDraft("");
      setIsPageInputDirty(false);
      return;
    }

    const nextPagination = { ...activePagination, pageIndex: clampPageIndex(nextPage - 1, pageCount) };

    updatePagination(nextPagination);
  }

  function handlePageInputBlur() {
    if (pageInput.trim().length === 0) {
      setPageInputDraft("");
      setIsPageInputDirty(false);
    }
  }

  function handleExpandedRowChange(row: T) {
    const rowId = getRowId(row);
    const nextExpanded = !expandedIds.has(rowId);

    if (nextExpanded) {
      setClosingExpandedIds((current) => {
        const next = new Set(current);
        next.delete(rowId);
        return next;
      });
      setExpandedIds((current) => toggleExpandedRow(current, rowId));
    } else {
      setExpandedIds((current) => toggleExpandedRow(current, rowId));
      setClosingExpandedIds((current) => new Set(current).add(rowId));
    }

    onExpandedRowChange?.(row, nextExpanded);
  }

  function handleExpandedPanelAnimationEnd(rowId: string) {
    setClosingExpandedIds((current) => {
      if (!current.has(rowId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
  }

  function handleTableScroll() {
    const tableWrap = tableWrapRef.current;

    if (!tableWrap) {
      return;
    }

    setHasPinnedShadow(tableWrap.scrollLeft > 0);
  }

  if (error) {
    return (
      <div className="state-card state-card--error" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div aria-live="polite" className="data-table-wrap">
      <div
        className="table-card"
        data-pinned-shadow={hasPinnedShadow ? "true" : undefined}
        onScroll={handleTableScroll}
        ref={tableWrapRef}
      >
        <table aria-busy={isLoading} aria-label={ariaLabel} className="data-table">
          <DataTableHeader activeSort={activeSort} columns={columns} onSort={handleSort} />
          <DataTableBody
            activePageSize={activePagination.pageSize}
            canExpandRow={canExpandRow}
            closingExpandedIds={closingExpandedIds}
            columns={columns}
            expandedIds={expandedIds}
            getRowExpansionState={getRowExpansionState}
            getRowId={getRowId}
            isLoading={isLoading}
            onExpandedPanelAnimationEnd={handleExpandedPanelAnimationEnd}
            onExpandedRowChange={handleExpandedRowChange}
            pageRows={pageRows}
            renderExpandedRow={renderExpandedRow}
          />
        </table>
      </div>

      <DataTableFooter
        activePagination={activePagination}
        endRow={endRow}
        isLoading={isLoading}
        isPageInputValid={canSubmitPageJump}
        onPageInputBlur={handlePageInputBlur}
        onPageInputChange={handlePageInputChange}
        onPageJump={handlePageJump}
        onPageSizeChange={handlePageSizeChange}
        onPaginationChange={updatePagination}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageInput={pageInput}
        pageSizeOptions={pageSizeOptions}
        rowCount={rowCount}
        startRow={startRow}
      />
    </div>
  );
}
