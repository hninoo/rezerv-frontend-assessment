import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import type { SortState } from "./DataTable.types";

interface DataTableSortIconProps {
  direction: SortState["direction"] | "none";
}

export function DataTableSortIcon({ direction }: DataTableSortIconProps) {
  if (direction === "asc") {
    return <ArrowUp size={14} strokeWidth={2.4} />;
  }

  if (direction === "desc") {
    return <ArrowDown size={14} strokeWidth={2.4} />;
  }

  return <ChevronsUpDown size={14} strokeWidth={2.4} />;
}
