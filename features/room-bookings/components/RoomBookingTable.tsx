import { DataTable } from "@/components/data-table/DataTable";

import { RoomBookingDetails } from "./RoomBookingDetails";
import { bookingPageSizeOptions, roomBookingColumns } from "../room-booking-columns";
import type { RoomBookingsState } from "../hooks/useRoomBookings";

interface RoomBookingTableProps {
  bookings: RoomBookingsState;
}

export function RoomBookingTable({ bookings }: RoomBookingTableProps) {
  return (
    <DataTable
      ariaLabel="Room booking table"
      columns={roomBookingColumns}
      error={bookings.error}
      getRowId={(row) => row.id}
      getRowExpansionState={(row) => ({
        error: bookings.detailErrorsByBookingId[row.id],
        isLoading: bookings.loadingDetailIds.has(row.id)
      })}
      isLoading={bookings.isLoading}
      manualPagination
      manualSorting
      onExpandedRowChange={bookings.handleExpandedRowChange}
      onPaginationChange={bookings.handlePaginationChange}
      onSortChange={bookings.handleSortChange}
      pageSizeOptions={bookingPageSizeOptions}
      pagination={bookings.pagination}
      renderExpandedRow={(row) => <RoomBookingDetails details={bookings.detailsByBookingId[row.id] ?? []} />}
      rows={bookings.rows}
      sort={bookings.sort}
      totalRows={bookings.totalRows}
    />
  );
}
