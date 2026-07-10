import { characterTextureUrls } from "../blobverse-scenes";
import { clamp, seeded } from "./blobverse-math";
import { heroBlobCounts, heroNegativeSpace } from "./blobverse-webgl-config";

export type HeroDepthBand = "far" | "mid" | "near";

export interface HeroBlobPlacement {
  angle: number;
  band: HeroDepthBand;
  height: number;
  opacity: number;
  parallax: number;
  phase: number;
  role: string;
  tint: number;
  url: string;
  width: number;
  x: number;
  y: number;
  z: number;
}

const heroTextureGroups = {
  blue: characterTextureUrls.filter((url) => url.includes("/blue")),
  green: characterTextureUrls.filter((url) => url.includes("/green")),
  orange: characterTextureUrls.filter((url) => url.includes("/orange")),
  pink: characterTextureUrls.filter((url) => url.includes("/pink")),
  purple: characterTextureUrls.filter((url) => url.includes("/purple"))
} as const;

function isInsideHeroNegativeSpace(x: number, y: number) {
  return x > heroNegativeSpace.minX && x < heroNegativeSpace.maxX && y > heroNegativeSpace.minY && y < heroNegativeSpace.maxY;
}

function pickHeroTexture(index: number, x: number, y: number) {
  const flow = clamp(((x + 6.2) / 12.4) * 0.58 + ((y + 3.3) / 6.6) * 0.34 + seeded(index + 710) * 0.16, 0, 0.999);
  const groups = [heroTextureGroups.blue, heroTextureGroups.green, heroTextureGroups.orange, heroTextureGroups.pink, heroTextureGroups.purple];
  const group = groups[Math.floor(flow * groups.length)] ?? heroTextureGroups.purple;

  return group[Math.floor(seeded(index + 720) * group.length) % group.length] ?? characterTextureUrls[index % characterTextureUrls.length];
}

function pushOutOfHeroNegativeSpace(x: number, y: number, index: number) {
  if (!isInsideHeroNegativeSpace(x, y)) {
    return { x, y };
  }

  const pushRight = seeded(index + 730) > 0.5;
  const edgeX = pushRight
    ? heroNegativeSpace.maxX + 0.54 + seeded(index + 731) * 1.05
    : heroNegativeSpace.minX - 0.54 - seeded(index + 732) * 1.05;
  const edgeY = y + (seeded(index + 733) - 0.5) * 0.7;

  return {
    x: edgeX,
    y: clamp(edgeY, -3.25, 3.15)
  };
}

export function createHeroBlobScatter(compact = false): HeroBlobPlacement[] {
  const counts = compact ? heroBlobCounts.mobile : heroBlobCounts.desktop;
  const bandOrder: HeroDepthBand[] = ["far", "mid", "near"];
  const placements: HeroBlobPlacement[] = [];
  let cursor = 0;

  bandOrder.forEach((band) => {
    const count = counts[band];

    for (let index = 0; index < count; index += 1) {
      const id = cursor + index;
      const sideBias = seeded(id + 20) > 0.5 ? 1 : -1;
      const arc = (index / Math.max(1, count - 1)) * Math.PI * 2 + seeded(id + 21) * 0.9;
      const radiusX = band === "far" ? 5.2 + seeded(id + 22) * 1.25 : band === "mid" ? 4.1 + seeded(id + 22) * 1.65 : 3.45 + seeded(id + 22) * 2.35;
      const radiusY = band === "far" ? 2.65 + seeded(id + 23) * 0.92 : band === "mid" ? 2.15 + seeded(id + 23) * 1.15 : 2.3 + seeded(id + 23) * 1.35;
      const rawX = Math.cos(arc) * radiusX + sideBias * seeded(id + 24) * 0.72;
      const rawY = Math.sin(arc * 0.86) * radiusY + (seeded(id + 25) - 0.5) * 1.1;
      const { x, y } = pushOutOfHeroNegativeSpace(clamp(rawX, -6.2, 6.2), clamp(rawY, -3.25, 3.2), id);
      const scale = band === "far" ? 0.44 + seeded(id + 30) * 0.34 : band === "mid" ? 0.78 + seeded(id + 30) * 0.48 : 1.08 + seeded(id + 30) * 0.62;

      placements.push({
        angle: -22 + seeded(id + 40) * 44,
        band,
        height: scale,
        opacity: band === "far" ? 0.36 + seeded(id + 50) * 0.16 : band === "mid" ? 0.7 + seeded(id + 50) * 0.18 : 0.78 + seeded(id + 50) * 0.16,
        parallax: band === "far" ? 0.12 : band === "mid" ? 0.26 : 0.42,
        phase: id * 0.37 + seeded(id + 60) * Math.PI,
        role: `hero-${band}-card`,
        tint: band === "far" ? 0xa89ac2 : band === "mid" ? 0xd7c8ff : 0xffffff,
        url: pickHeroTexture(id, x, y),
        width: scale,
        x,
        y,
        z: band === "far" ? -5.25 - seeded(id + 70) * 2.65 : band === "mid" ? -2.35 - seeded(id + 70) * 1.65 : -0.38 + seeded(id + 70) * 0.9
      });
    }

    cursor += count;
  });

  return placements;
}
