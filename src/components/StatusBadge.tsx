export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return <span className={`badge badge-${status}`}>{label}</span>;
}
