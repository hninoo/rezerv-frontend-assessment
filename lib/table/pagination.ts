export function paginateRows<T>(rows: T[], pageIndex: number, pageSize: number) {
  const start = pageIndex * pageSize;

  return rows.slice(start, start + pageSize);
}

export function getPageCount(totalRows: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalRows / pageSize));
}

export function clampPageIndex(pageIndex: number, pageCount: number) {
  return Math.min(Math.max(pageIndex, 0), pageCount - 1);
}
