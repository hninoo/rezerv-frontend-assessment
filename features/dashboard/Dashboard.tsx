"use client";

import { useState } from "react";

import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/DataTable.types";
import { CapacityCell } from "@/components/ui/CapacityCell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCapacityUsed } from "@/lib/format/capacity";
import type { FitnessClass } from "@/lib/data/classes";
import { APP_GMT_OFFSET_MINUTES, formatTimeRange, getGmtOffsetLabel } from "@/lib/time/time-zone";

import { AttendeeList } from "./components/AttendeeList";
import { useAttendees } from "./hooks/useAttendees";

const columns: ColumnDef<FitnessClass>[] = [
  {
    id: "title",
    header: "Class",
    accessor: (row) => row.title,
    sortable: true,
    pinned: "left",
    width: 220
  },
  {
    id: "instructor",
    header: "Instructor",
    accessor: (row) => row.instructor,
    sortable: true,
    width: 180
  },
  {
    id: "time",
    header: `Time (${getGmtOffsetLabel(APP_GMT_OFFSET_MINUTES)})`,
    accessor: (row) => formatTimeRange(row.startsAtUtc, row.endsAtUtc, APP_GMT_OFFSET_MINUTES),
    sortValue: (row) => Date.parse(row.startsAtUtc),
    sortable: true,
    width: 230
  },
  {
    id: "attendance",
    header: "Attendance",
    accessor: (row) => <CapacityCell value={row.attendance} />,
    sortValue: (row) => getCapacityUsed(row.attendance),
    sortable: true,
    width: 140
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => <StatusBadge status={row.status} />,
    sortValue: (row) => row.status,
    sortable: true,
    width: 140
  }
];

type DashboardProps = {
  rows: FitnessClass[];
};

type ClassStatusFilter = FitnessClass["status"] | "All";

const statusOptions: ClassStatusFilter[] = ["All", "Scheduled", "Full", "Cancelled"];

export function Dashboard({ rows }: DashboardProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatusFilter>("All");
  const {
    errorsByClassId,
    getAttendeePageForClass,
    getAttendeePagination,
    handleAttendeePageChange,
    handleExpandedRowChange,
    isInlineClass,
    loadingClassIds
  } = useAttendees();
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      row.title.toLowerCase().includes(normalizedQuery) ||
      row.instructor.toLowerCase().includes(normalizedQuery) ||
      row.status.toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === "All" || row.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <>
      <div className="table-toolbar" aria-label="Class table controls">
        <div className="table-toolbar__fields">
          <label className="table-toolbar__field">
            <span>Search</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Class or instructor"
              type="search"
              value={query}
            />
          </label>
          <label className="table-toolbar__field">
            <span>Status</span>
            <select
              onChange={(event) => setStatusFilter(event.target.value as ClassStatusFilter)}
              value={statusFilter}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="table-toolbar__summary">
          Showing {filteredRows.length} of {rows.length} classes
        </p>
      </div>

      <DataTable
        ariaLabel="Fitness class timetable"
        columns={columns}
        getRowExpansionState={(row) => ({
          error: errorsByClassId[row.id],
          isLoading: loadingClassIds.has(row.id)
        })}
        getRowId={(row) => row.id}
        onExpandedRowChange={handleExpandedRowChange}
        renderExpandedRow={(row) => {
          const attendeePage = getAttendeePageForClass(row.id);
          const isInline = isInlineClass(row.id);

          return (
            <AttendeeList
              attendees={attendeePage.rows}
              onPageChange={isInline ? undefined : (nextPagination) => handleAttendeePageChange(row, nextPagination)}
              pagination={isInline ? undefined : getAttendeePagination(row.id)}
              totalRows={attendeePage.totalRows}
            />
          );
        }}
        rows={filteredRows}
      />
    </>
  );
}
