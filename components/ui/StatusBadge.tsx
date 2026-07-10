export function getStatusBadgeClassName(status: string) {
  return `status-badge status-badge--${status.toLowerCase()}`;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={getStatusBadgeClassName(status)}>{status}</span>;
}
