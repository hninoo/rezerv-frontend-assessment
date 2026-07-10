export function parseCapacity(value: string): { used: number; total: number } {
  const [used, total] = value.split(" / ").map(Number);

  return { used, total };
}

export function getCapacityUsed(value: string): number {
  return parseCapacity(value).used;
}
