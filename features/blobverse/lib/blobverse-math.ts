export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(value: number) {
  const next = clamp(value, 0, 1);

  return next * next * (3 - 2 * next);
}

export function cyclicDistance(a: number, b: number, span: number) {
  const diff = Math.abs(a - b) % span;

  return Math.min(diff, span - diff);
}

export function seeded(index: number) {
  const value = Math.sin(index * 999.91) * 10000;

  return value - Math.floor(value);
}

export function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = t - 1;

  return 1 + c3 * p * p * p + c1 * p * p;
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
