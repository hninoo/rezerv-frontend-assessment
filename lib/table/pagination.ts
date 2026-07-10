export function paginateRows<T>(rows: T[], pageIndex: number, pageSize: number) {
  const start = pageIndex * pageSize;

  return rows.slice(start, start + pageSize);
}
