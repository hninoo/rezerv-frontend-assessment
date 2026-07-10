import type * as Three from "three";
import type { BufferGeometry, Material, Object3D, ShaderMaterial, Texture } from "three";

import { clamp, seeded } from "./blobverse-math";
import { backgroundFragmentShader, backgroundVertexShader, heroBackgroundFragmentShader } from "./blobverse-shaders";
import type { SolarPlanetSpec } from "./blobverse-webgl-config";

type ThreeRuntime = typeof Three;

interface TextureCacheOptions {
  THREE: ThreeRuntime;
  cutoutTextureSize: number;
  maxAnisotropy: number;
  maxTextureSize: number;
  renderOnLoad: () => void;
  textureLoader: Three.TextureLoader;
  textures: Texture[];
}

interface BackgroundOptions {
  THREE: ThreeRuntime;
  accent?: number;
  backgroundLayers: { material: ShaderMaterial; index: number }[];
  basePlaneGeometry: BufferGeometry;
  color: number;
  depth?: number;
  group: Object3D;
  groups: Object3D[];
  materials: Material[];
}

export function disposeMaterial(material: Material) {
  material.dispose();
}

export function applySceneOpacity(object: Object3D, opacity: number) {
  object.traverse((child) => {
    const maybeMaterial = (child as Object3D & { material?: Material | Material[] }).material;

    if (!maybeMaterial) {
      return;
    }

    const materials = Array.isArray(maybeMaterial) ? maybeMaterial : [maybeMaterial];

    materials.forEach((material) => {
      if (material.userData.keepOpaque) {
        return;
      }

      const baseOpacity =
        typeof material.userData.baseOpacity === "number" ? (material.userData.baseOpacity as number) : material.opacity;

      material.userData.baseOpacity = baseOpacity;
      material.opacity = baseOpacity * opacity;
      material.transparent = true;
    });
  });
}

export function renderPixelRatio() {
  if (typeof window === "undefined") {
    return 1;
  }

  const pixels = window.innerWidth * window.innerHeight;
  const cap = pixels > 2_400_000 ? 1.35 : window.innerWidth >= 1440 ? 1.6 : 1.45;

  return Math.min(window.devicePixelRatio || 1, cap);
}

export function createBlobverseRenderer(THREE: ThreeRuntime, className: string) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.domElement.className = className;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(renderPixelRatio());

  return renderer;
}

export function registerMaterial<T extends Material>(materials: Material[], material: T, baseOpacity = material.opacity) {
  material.userData.baseOpacity = baseOpacity;
  materials.push(material);

  return material;
}

export function createTextureCache({
  THREE,
  cutoutTextureSize,
  maxAnisotropy,
  maxTextureSize,
  renderOnLoad,
  textureLoader,
  textures
}: TextureCacheOptions) {
  const loadedTextures = new Map<string, Texture>();
  const loadedCutoutTextures = new Map<string, Texture>();

  function loadTexture(url: string, cutoutDarkBackground = false) {
    const texture = textureLoader.load(url, (loaded) => {
      const source = loaded.image as (HTMLImageElement & { width: number; height: number }) | undefined;

      if (source?.width && source?.height) {
        const textureSize = cutoutDarkBackground ? cutoutTextureSize : maxTextureSize;
        const scaleFactor = Math.min(1, textureSize / Math.max(source.width, source.height));

        if (scaleFactor < 1 || cutoutDarkBackground) {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          canvas.width = Math.max(1, Math.round(source.width * scaleFactor));
          canvas.height = Math.max(1, Math.round(source.height * scaleFactor));

          if (context) {
            context.drawImage(source, 0, 0, canvas.width, canvas.height);

            if (cutoutDarkBackground) {
              try {
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const { data } = imageData;

                for (let index = 0; index < data.length; index += 4) {
                  const red = data[index];
                  const green = data[index + 1];
                  const blue = data[index + 2];
                  const alpha = data[index + 3];
                  const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;

                  if (alpha > 0 && luma < 62) {
                    data[index + 3] = Math.round(alpha * clamp((luma - 28) / 34, 0, 1));
                  }
                }

                context.putImageData(imageData, 0, 0);
              } catch {
              }
            }

            loaded.image = canvas as unknown as typeof loaded.image;
          }
        }
      }

      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = maxAnisotropy;
      loaded.needsUpdate = true;
      renderOnLoad();
    });

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    textures.push(texture);

    return texture;
  }

  return (url: string, cutoutDarkBackground = false) => {
    const cache = cutoutDarkBackground ? loadedCutoutTextures : loadedTextures;
    const existing = cache.get(url);

    if (existing) {
      return existing;
    }

    const texture = loadTexture(url, cutoutDarkBackground);

    cache.set(url, texture);

    return texture;
  };
}

export function createSolarPlanetTexture(THREE: ThreeRuntime, spec: SolarPlanetSpec, maxAnisotropy: number, textures: Texture[]) {
  const canvas = document.createElement("canvas");
  const width = 256;
  const height = 128;
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  if (context) {
    const gradient = context.createLinearGradient(0, 0, width, height);

    gradient.addColorStop(0, spec.accent);
    gradient.addColorStop(0.45, spec.base);
    gradient.addColorStop(1, spec.stripe);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    if (spec.id === "earth") {
      context.fillStyle = "rgba(53, 178, 103, 0.9)";
      for (let index = 0; index < 14; index += 1) {
        const x = seeded(index + 810) * width;
        const y = seeded(index + 820) * height;
        const rx = 10 + seeded(index + 830) * 28;
        const ry = 6 + seeded(index + 840) * 18;

        context.beginPath();
        context.ellipse(x, y, rx, ry, seeded(index + 850) * Math.PI, 0, Math.PI * 2);
        context.fill();
      }

      context.fillStyle = "rgba(255, 255, 255, 0.58)";
      for (let index = 0; index < 12; index += 1) {
        context.fillRect(seeded(index + 860) * width, seeded(index + 870) * height, 18 + seeded(index + 880) * 46, 2 + seeded(index + 890) * 4);
      }
    } else if (spec.id === "mercury" || spec.id === "mars") {
      context.fillStyle = "rgba(255, 255, 255, 0.16)";
      for (let index = 0; index < 28; index += 1) {
        const radius = 1.4 + seeded(index + 900) * 4.6;

        context.beginPath();
        context.arc(seeded(index + 910) * width, seeded(index + 920) * height, radius, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      for (let index = 0; index < 13; index += 1) {
        const y = (index / 13) * height + Math.sin(index * 1.7) * 4;
        const alpha = spec.id === "jupiter" || spec.id === "saturn" ? 0.34 : 0.16;

        context.fillStyle = index % 2 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(20, 10, 30, ${alpha * 0.75})`;
        context.fillRect(0, y, width, 4 + seeded(index + 930) * 9);
      }
    }

    if (spec.id === "jupiter") {
      context.fillStyle = "rgba(139, 48, 32, 0.72)";
      context.beginPath();
      context.ellipse(width * 0.68, height * 0.58, 18, 8, -0.18, 0, Math.PI * 2);
      context.fill();
    }

    const shade = context.createLinearGradient(0, 0, width, 0);

    shade.addColorStop(0, "rgba(255, 255, 255, 0.22)");
    shade.addColorStop(0.42, "rgba(255, 255, 255, 0)");
    shade.addColorStop(1, "rgba(5, 0, 20, 0.26)");
    context.fillStyle = shade;
    context.fillRect(0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = maxAnisotropy;
  textures.push(texture);

  return texture;
}

export function createGlowTexture(THREE: ThreeRuntime, textures: Texture[]) {
  const canvas = document.createElement("canvas");
  const size = 256;
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    gradient.addColorStop(0, "rgba(142, 107, 255, 0.72)");
    gradient.addColorStop(0.34, "rgba(142, 107, 255, 0.32)");
    gradient.addColorStop(1, "rgba(142, 107, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  textures.push(texture);

  return texture;
}

export function addBackground({ THREE, accent, backgroundLayers, basePlaneGeometry, color, depth = -6.8, group, groups, materials }: BackgroundOptions) {
  const nextAccent = accent ?? color;
  const colorA = new THREE.Color(color);
  const colorB = colorA.clone().lerp(new THREE.Color(nextAccent), 0.4);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_opacity: { value: 1 },
      u_colorA: { value: colorA },
      u_colorB: { value: colorB },
      u_accent: { value: new THREE.Color(nextAccent) }
    },
    vertexShader: backgroundVertexShader,
    fragmentShader: backgroundFragmentShader,
    depthWrite: false,
    transparent: true
  });

  materials.push(material);

  const background = new THREE.Mesh(basePlaneGeometry, material);

  background.position.z = depth;
  background.scale.set(24, 15, 1);
  group.add(background);
  backgroundLayers.push({ material, index: groups.findIndex((candidate) => candidate === group) });
}

export function addHeroBackground({ THREE, backgroundLayers, basePlaneGeometry, depth = -8.2, group, groups, materials }: BackgroundOptions) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_opacity: { value: 1 }
    },
    vertexShader: backgroundVertexShader,
    fragmentShader: heroBackgroundFragmentShader,
    depthWrite: false,
    transparent: true
  });

  materials.push(material);

  const background = new THREE.Mesh(basePlaneGeometry, material);

  background.position.z = depth;
  background.scale.set(24, 15, 1);
  group.add(background);
  backgroundLayers.push({ material, index: groups.findIndex((candidate) => candidate === group) });
}
