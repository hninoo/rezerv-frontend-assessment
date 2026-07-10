import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/DataTable.types";
import { roomBookings, type RoomBooking } from "@/features/table-demo/demo-data";

const columns: ColumnDef<RoomBooking>[] = [
  {
    id: "room",
    header: "Room",
    accessor: (row) => row.room,
    pinned: "left",
    sortable: true,
    width: 200
  },
  {
    id: "ownerTeam",
    header: "Owner Team",
    accessor: (row) => row.ownerTeam,
    sortable: true,
    width: 180
  },
  {
    id: "window",
    header: "Window",
    accessor: (row) => row.window,
    sortable: true,
    width: 190
  },
  {
    id: "capacity",
    header: "Capacity",
    accessor: (row) => row.capacity,
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

export default function TableDemoPage() {
  return (
    <main className="page page--light">
      <section className="container">
        <p className="eyebrow eyebrow--red">
          Reusability Demo
        </p>
        <h1 className="title">Second DataTable Dataset</h1>
        <p className="copy">
          This route uses the same DataTable component with room-booking data to
          prove that the table is not tied to the fitness class domain.
        </p>

        <DataTable columns={columns} getRowId={(row) => row.id} rows={roomBookings} />
      </section>
    </main>
  );
}
