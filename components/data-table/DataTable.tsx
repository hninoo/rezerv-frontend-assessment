import type { DataTableProps } from "./DataTable.types";

function getColumnStyle(width?: number) {
  return width ? { minWidth: `${width}px`, width: `${width}px` } : undefined;
}

export function DataTable<T>({ columns, error, getRowId, isLoading, rows }: DataTableProps<T>) {
  if (isLoading) {
    return <div className="state-card">Loading rows...</div>;
  }

  if (error) {
    return <div className="state-card state-card--error">{error}</div>;
  }

  if (rows.length === 0) {
    return <div className="state-card">No rows found.</div>;
  }

  return (
    <div className="table-card">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={column.pinned === "left" ? "data-table__cell--pinned" : undefined}
                key={column.id}
                style={getColumnStyle(column.width)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)}>
              {columns.map((column) => (
                <td
                  className={column.pinned === "left" ? "data-table__cell--pinned" : undefined}
                  key={column.id}
                  style={getColumnStyle(column.width)}
                >
                  {column.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
