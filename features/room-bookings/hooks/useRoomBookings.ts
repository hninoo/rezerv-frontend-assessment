"use client";

import { useCallback, useState } from "react";

import type { PaginationState, SortState } from "@/components/data-table/DataTable.types";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { RoomBookingDetail } from "@/lib/mock-api/room-booking-details";
import { roomBookingApi } from "@/lib/mock-api/room-bookings";
import type { RoomBooking } from "@/lib/mock-api/room-bookings";
import type { PagedResult } from "@/lib/mock-api/types";

export type RoomStatusFilter = RoomBooking["status"] | "All";

type DetailsByBookingId = Record<string, RoomBookingDetail[]>;
type DetailErrorsByBookingId = Record<string, string>;
type RequestMode = {
  requestId: number;
  shouldFail: boolean;
};

const emptyBookingPage: PagedResult<RoomBooking> = {
  rows: [],
  totalRows: 0
};

export function useRoomBookings() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatusFilter>("All");
  const [sort, setSort] = useState<SortState | null>({ columnId: "room", direction: "asc" });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [requestMode, setRequestMode] = useState<RequestMode>({ requestId: 0, shouldFail: false });
  const [detailsByBookingId, setDetailsByBookingId] = useState<DetailsByBookingId>({});
  const [detailErrorsByBookingId, setDetailErrorsByBookingId] = useState<DetailErrorsByBookingId>({});
  const [loadingDetailIds, setLoadingDetailIds] = useState<Set<string>>(new Set());
  const debouncedQuery = useDebouncedValue(query, 250);

  const loadBookingStats = useCallback(() => {
    return roomBookingApi.stats ? roomBookingApi.stats() : Promise.resolve(null);
  }, []);

  const loadBookings = useCallback(() => {
    return roomBookingApi.list({
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      query: debouncedQuery,
      shouldFail: requestMode.shouldFail,
      status: statusFilter,
      sort
    });
  }, [debouncedQuery, pagination, requestMode, sort, statusFilter]);

  const { data: stats } = useAsyncData(loadBookingStats, null);
  const {
    data: bookingPage,
    error,
    isLoading
  } = useAsyncData(loadBookings, emptyBookingPage);
  const rows = bookingPage.rows;
  const totalRows = bookingPage.totalRows;

  function handleSortChange(nextSort: SortState | null) {
    setSort(nextSort);
  }

  function handlePaginationChange(nextPagination: PaginationState) {
    setPagination(nextPagination);
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  function handleStatusFilterChange(nextStatus: RoomStatusFilter) {
    setStatusFilter(nextStatus);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  function handleFailedRequestDemo() {
    setRequestMode((current) => ({
      requestId: current.requestId + 1,
      shouldFail: true
    }));
  }

  function handleRequestRecovery() {
    setRequestMode((current) => ({
      requestId: current.requestId + 1,
      shouldFail: false
    }));
  }

  async function loadRoomBookingDetails(row: RoomBooking) {
    if (detailsByBookingId[row.id] || loadingDetailIds.has(row.id)) {
      return;
    }

    setLoadingDetailIds((current) => new Set(current).add(row.id));
    setDetailErrorsByBookingId((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });

    try {
      const details = roomBookingApi.details ? await roomBookingApi.details(row.id) : [];
      setDetailsByBookingId((current) => ({ ...current, [row.id]: details }));
    } catch (detailError) {
      setDetailErrorsByBookingId((current) => ({
        ...current,
        [row.id]: detailError instanceof Error ? detailError.message : "Unable to load room booking details."
      }));
    } finally {
      setLoadingDetailIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  }

  function handleExpandedRowChange(row: RoomBooking, isExpanded: boolean) {
    if (!isExpanded) {
      return;
    }

    void loadRoomBookingDetails(row);
  }

  return {
    detailErrorsByBookingId,
    detailsByBookingId,
    error,
    handleExpandedRowChange,
    handleFailedRequestDemo,
    handlePaginationChange,
    handleQueryChange,
    handleRequestRecovery,
    handleSortChange,
    handleStatusFilterChange,
    isLoading,
    loadingDetailIds,
    pagination,
    query,
    requestMode,
    rows,
    sort,
    stats,
    statusFilter,
    totalRows
  };
}

export type RoomBookingsState = ReturnType<typeof useRoomBookings>;
