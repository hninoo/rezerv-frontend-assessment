export function toggleExpandedRow(expandedIds: Set<string>, rowId: string) {
  const next = new Set(expandedIds);

  if (next.has(rowId)) {
    next.delete(rowId);
  } else {
    next.add(rowId);
  }

  return next;
}
