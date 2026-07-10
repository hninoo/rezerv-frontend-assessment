import type { ColumnDef } from "@/components/data-table/DataTable.types";
import { CapacityCell } from "@/components/ui/CapacityCell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCapacityUsed } from "@/lib/format/capacity";
import type { RoomBooking } from "@/lib/mock-api/room-bookings";

export const bookingPageSizeOptions = [10, 20, 50];

export const roomBookingColumns: ColumnDef<RoomBooking>[] = [
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
    accessor: (row) => <CapacityCell value={row.capacity} barVariant="brass" />,
    sortValue: (row) => getCapacityUsed(row.capacity),
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
