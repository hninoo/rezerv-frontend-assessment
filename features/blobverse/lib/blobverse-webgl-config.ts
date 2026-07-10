export const colors = {
  blue: 0x6a3cff,
  cream: 0xfff2ec,
  gold: 0xffd23e,
  jade: 0x22d3ee,
  night: 0x1e0e24,
  pink: 0xff2d9b,
  plumMid: 0x3a1a38,
  plumTop: 0x2a1230,
  red: 0xff5a3c,
  white: 0xffffff
} as const;

export const confettiPalette = [0xff2d9b, 0x22d3ee, 0xb6ff3d, 0x6a3cff, 0xffd23e] as const;

export const bubbleTints = [0x9dc0ff, 0x9cf0c8, 0xffd59a, 0xffb0d4, 0xd8b6ff] as const;
export const bubbleShellOpacity = 0.34;
export const bubbleRimOpacity = 0.065;
export const bubbleHighlightOpacity = 0.12;

export interface SolarPlanetSpec {
  accent: string;
  axialTilt: number;
  base: string;
  id: string;
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  radiusRatio: number;
  rotationSpeed: number;
  stripe: string;
}

export const solarPlanetSpecs: SolarPlanetSpec[] = [
  {
    accent: "#f6d58e",
    axialTilt: 0.47,
    base: "#d9b978",
    id: "saturn",
    orbitRadius: 3.18,
    orbitSpeed: 0.08,
    phase: 5.05,
    radiusRatio: 0.836,
    rotationSpeed: 0.006,
    stripe: "#a97c4c"
  },
  {
    accent: "#f3d2a1",
    axialTilt: 0.05,
    base: "#c98b53",
    id: "jupiter",
    orbitRadius: 2.56,
    orbitSpeed: 0.1,
    phase: 4.16,
    radiusRatio: 1,
    rotationSpeed: 0.009,
    stripe: "#8f4d36"
  },
  {
    accent: "#d7fbff",
    axialTilt: 1.71,
    base: "#8bdceb",
    id: "uranus",
    orbitRadius: 3.82,
    orbitSpeed: 0.055,
    phase: 2.68,
    radiusRatio: 0.358,
    rotationSpeed: 0.004,
    stripe: "#5cb9ca"
  },
  {
    accent: "#a7c6ff",
    axialTilt: 0.49,
    base: "#4778e6",
    id: "neptune",
    orbitRadius: 4.42,
    orbitSpeed: 0.045,
    phase: 1.42,
    radiusRatio: 0.346,
    rotationSpeed: 0.0045,
    stripe: "#244bb6"
  },
  {
    accent: "#e8fff7",
    axialTilt: 0.41,
    base: "#297ad6",
    id: "earth",
    orbitRadius: 1.36,
    orbitSpeed: 0.19,
    phase: 0.72,
    radiusRatio: 0.089,
    rotationSpeed: 0.012,
    stripe: "#34b56c"
  },
  {
    accent: "#fff0b4",
    axialTilt: 3.1,
    base: "#d99a4b",
    id: "venus",
    orbitRadius: 1.08,
    orbitSpeed: 0.22,
    phase: 2.08,
    radiusRatio: 0.087,
    rotationSpeed: 0.003,
    stripe: "#f3cf80"
  },
  {
    accent: "#ffc0a0",
    axialTilt: 0.44,
    base: "#b95738",
    id: "mars",
    orbitRadius: 1.68,
    orbitSpeed: 0.155,
    phase: 3.34,
    radiusRatio: 0.047,
    rotationSpeed: 0.01,
    stripe: "#7a2d22"
  },
  {
    accent: "#f1e4ce",
    axialTilt: 0.03,
    base: "#8b8177",
    id: "mercury",
    orbitRadius: 0.82,
    orbitSpeed: 0.28,
    phase: 5.86,
    radiusRatio: 0.034,
    rotationSpeed: 0.008,
    stripe: "#4f4945"
  }
];

export const solarJupiterRadius = 0.92;
export const solarMinVisibleRadius = 0.07;
export const solarAsteroidCount = 160;

export const heroScale = 2.62;
export const glowIntensity = 0.46;
export const dofFocus = 9.35;
export const dofAperture = 0.004;
export const dofMaxBlur = 0.0025;
export const bloomStrength = 0.4;
export const bloomRadius = 0.6;
export const bloomThreshold = 0.85;

export const heroBlobCounts = {
  desktop: { far: 28, mid: 14, near: 6 },
  mobile: { far: 16, mid: 8, near: 3 }
} as const;

export const heroNegativeSpace = {
  maxX: 2.55,
  maxY: 0.76,
  minX: -2.55,
  minY: -2.42
} as const;
