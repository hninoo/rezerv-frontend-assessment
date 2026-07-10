"use client";

import { useState } from "react";

import type { PaginationState } from "@/components/data-table/DataTable.types";
import type { Attendee } from "@/lib/data/attendees";
import { sampleAttendees } from "@/lib/data/attendees";
import type { FitnessClass } from "@/lib/data/classes";
import { attendeeApi } from "@/lib/mock-api/attendees";
import type { PagedResult } from "@/lib/mock-api/types";

type AttendeesByClassId = Record<string, PagedResult<Attendee>>;
type AttendeePaginationByClassId = Record<string, PaginationState>;

export const attendeePageSize = 2;
const inlineClassIds = new Set(["class-002"]);

function getInlineAttendeePage(classId: string) {
  const rows = sampleAttendees.filter((attendee) => attendee.classId === classId);

  return {
    rows,
    totalRows: rows.length
  };
}

export function useAttendees() {
  const [attendeesByClassId, setAttendeesByClassId] = useState<AttendeesByClassId>({});
  const [attendeePaginationByClassId, setAttendeePaginationByClassId] = useState<AttendeePaginationByClassId>({});
  const [loadingClassIds, setLoadingClassIds] = useState<Set<string>>(new Set());
  const [errorsByClassId, setErrorsByClassId] = useState<Record<string, string>>({});

  function isInlineClass(classId: string) {
    return inlineClassIds.has(classId);
  }

  function getAttendeePageForClass(classId: string) {
    if (inlineClassIds.has(classId)) {
      return getInlineAttendeePage(classId);
    }

    return attendeesByClassId[classId] ?? { rows: [], totalRows: 0 };
  }

  function getAttendeePagination(classId: string) {
    return attendeePaginationByClassId[classId] ?? { pageIndex: 0, pageSize: attendeePageSize };
  }

  async function loadAttendees(row: FitnessClass, pagination: PaginationState) {
    if (inlineClassIds.has(row.id) || loadingClassIds.has(row.id)) {
      return;
    }

    setLoadingClassIds((current) => new Set(current).add(row.id));
    setErrorsByClassId((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });

    try {
      const attendeePage = await attendeeApi.list({
        classId: row.id,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize
      });
      setAttendeesByClassId((current) => ({ ...current, [row.id]: attendeePage }));
      setAttendeePaginationByClassId((current) => ({ ...current, [row.id]: pagination }));
    } catch (error) {
      setErrorsByClassId((current) => ({
        ...current,
        [row.id]: error instanceof Error ? error.message : "Unable to load attendees."
      }));
    } finally {
      setLoadingClassIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  }

  async function handleExpandedRowChange(row: FitnessClass, isExpanded: boolean) {
    if (!isExpanded || inlineClassIds.has(row.id) || attendeesByClassId[row.id]) {
      return;
    }

    await loadAttendees(row, { pageIndex: 0, pageSize: attendeePageSize });
  }

  function handleAttendeePageChange(row: FitnessClass, pagination: PaginationState) {
    void loadAttendees(row, pagination);
  }

  return {
    errorsByClassId,
    getAttendeePageForClass,
    getAttendeePagination,
    handleAttendeePageChange,
    handleExpandedRowChange,
    isInlineClass,
    loadingClassIds
  };
}
