import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/DataTable.types";
import type { FitnessClass } from "@/lib/data/classes";

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
    header: "Time",
    accessor: (row) => row.time,
    sortable: true,
    width: 190
  },
  {
    id: "attendance",
    header: "Attendance",
    accessor: (row) => row.attendance,
    sortable: true,
    width: 140
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => row.status,
    sortable: true,
    width: 140
  }
];

type DashboardProps = {
  rows: FitnessClass[];
};

export function Dashboard({ rows }: DashboardProps) {
  return <DataTable columns={columns} getRowId={(row) => row.id} rows={rows} />;
}
