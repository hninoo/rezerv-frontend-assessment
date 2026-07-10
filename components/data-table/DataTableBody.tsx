import { Fragment } from "react";

import type { DataTableProps } from "./DataTable.types";
import { getCellClassName, getColumnStyle, getSafeId, getSkeletonRows } from "./DataTable.helpers";
import { DataTableExpandedContent } from "./DataTableExpandedContent";

interface DataTableBodyProps<T> {
  activePageSize: number;
  canExpandRow: DataTableProps<T>["canExpandRow"];
  closingExpandedIds: Set<string>;
  columns: DataTableProps<T>["columns"];
  expandedIds: Set<string>;
  getRowExpansionState: DataTableProps<T>["getRowExpansionState"];
  getRowId: DataTableProps<T>["getRowId"];
  isLoading: boolean | undefined;
  onExpandedPanelAnimationEnd: (rowId: string) => void;
  onExpandedRowChange: (row: T) => void;
  pageRows: T[];
  renderExpandedRow: DataTableProps<T>["renderExpandedRow"];
}

export function DataTableBody<T>({
  activePageSize,
  canExpandRow,
  closingExpandedIds,
  columns,
  expandedIds,
  getRowExpansionState,
  getRowId,
  isLoading,
  onExpandedPanelAnimationEnd,
  onExpandedRowChange,
  pageRows,
  renderExpandedRow
}: DataTableBodyProps<T>) {
  return (
    <tbody>
      {isLoading ? (
        getSkeletonRows(activePageSize).map((rowId) => (
          <tr aria-hidden="true" key={rowId}>
            {columns.map((column) => (
              <td
                className={getCellClassName(column.pinned === "left")}
                key={column.id}
                style={getColumnStyle(column.width)}
              >
                <span className="data-table__skeleton" />
              </td>
            ))}
          </tr>
        ))
      ) : pageRows.length > 0 ? (
        pageRows.map((row) => {
          const rowId = getRowId(row);
          const canExpand = Boolean(renderExpandedRow && (canExpandRow ? canExpandRow(row) : true));
          const isExpanded = expandedIds.has(rowId);
          const isClosing = closingExpandedIds.has(rowId);
          const shouldRenderExpandedRow = canExpand && (isExpanded || isClosing);
          const expandedPanelId = `row-${getSafeId(rowId)}-details`;

          return (
            <Fragment key={rowId}>
              <tr key={rowId}>
                {columns.map((column, columnIndex) => (
                  <td
                    className={getCellClassName(column.pinned === "left")}
                    key={column.id}
                    style={getColumnStyle(column.width)}
                  >
                    {columnIndex === 0 && canExpand ? (
                      <button
                        aria-controls={expandedPanelId}
                        aria-expanded={isExpanded}
                        className="data-table__expand-button"
                        onClick={() => onExpandedRowChange(row)}
                        type="button"
                      >
                        <span aria-hidden="true">{isExpanded ? "-" : "+"}</span>
                        <span>{column.accessor(row)}</span>
                      </button>
                    ) : (
                      column.accessor(row)
                    )}
                  </td>
                ))}
              </tr>
              {shouldRenderExpandedRow ? (
                <tr className="data-table__expanded-row" key={`${rowId}-expanded`}>
                  <td colSpan={columns.length}>
                    <div
                      className="data-table__expanded-panel"
                      data-state={isClosing ? "closing" : "open"}
                      id={expandedPanelId}
                      onAnimationEnd={() => onExpandedPanelAnimationEnd(rowId)}
                    >
                      <DataTableExpandedContent
                        getRowExpansionState={getRowExpansionState}
                        renderExpandedRow={renderExpandedRow}
                        row={row}
                      />
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })
      ) : (
        <tr>
          <td className="data-table__empty" colSpan={columns.length}>
            No rows found.
          </td>
        </tr>
      )}
    </tbody>
  );
}
