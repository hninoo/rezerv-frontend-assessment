import { parseCapacity } from "@/lib/format/capacity";

export function CapacityCell({ value, barVariant }: { value: string; barVariant?: "brass" }) {
  const { used, total } = parseCapacity(value);
  const percentage = total === 0 ? 0 : Math.round((used / total) * 100);
  const barClassName = barVariant ? `capacity-cell__bar capacity-cell__bar--${barVariant}` : "capacity-cell__bar";

  return (
    <div className="capacity-cell">
      <span>{value}</span>
      <span className="capacity-cell__track" aria-hidden="true">
        <span className={barClassName} style={{ width: `${percentage}%` }} />
      </span>
    </div>
  );
}
