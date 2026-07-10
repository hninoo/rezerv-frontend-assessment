import type * as THREE from "three";
import type { BufferGeometry, Material, Object3D, ShaderMaterial, Texture, WebGLRenderer } from "three";

import { createHeroBlobScatter, type HeroDepthBand } from "../lib/hero-blob-scatter";
import { confettiFragmentShader, confettiVertexShader } from "../lib/blobverse-shaders";
import { clamp, cyclicDistance, easeOutBack, seeded, smoothstep } from "../lib/blobverse-math";
import { createBlobversePostprocessing } from "../lib/blobverse-postprocessing";
import {
  addBackground,
  addHeroBackground,
  applySceneOpacity,
  createBlobverseRenderer,
  createGlowTexture,
  createSolarPlanetTexture,
  createTextureCache,
  disposeMaterial,
  registerMaterial as registerTrackedMaterial,
  renderPixelRatio
} from "../lib/blobverse-webgl-resources";
import {
  bloomRadius as BLOOM_RADIUS,
  bloomStrength as BLOOM_STRENGTH,
  bloomThreshold as BLOOM_THRESHOLD,
  bubbleHighlightOpacity,
  bubbleRimOpacity,
  bubbleShellOpacity,
  bubbleTints,
  colors,
  confettiPalette,
  dofAperture as DOF_APERTURE,
  dofFocus as DOF_FOCUS,
  dofMaxBlur as DOF_MAXBLUR,
  glowIntensity as GLOW_INTENSITY,
  heroScale as HERO_SCALE,
  solarAsteroidCount as SOLAR_ASTEROID_COUNT,
  solarJupiterRadius as SOLAR_JUPITER_RADIUS,
  solarMinVisibleRadius as SOLAR_MIN_VISIBLE_RADIUS,
  solarPlanetSpecs as SOLAR_PLANET_SPECS
} from "../lib/blobverse-webgl-config";
import {
  characterTextureUrls,
  featuredTextureUrls,
  blobverseScenes,
  type BlobverseSceneKind
} from "../blobverse-scenes";
import styles from "../blobverse.module.scss";
import { createBlobversePopEffects } from "./blobverse-pop-effects";
import type { BlobverseStageHandle, BlobverseStageParams } from "./blobverse-stage.types";

const sceneCount = blobverseScenes.length;

export function createBlobverseStage({
  interactionRef,
  motionOK,
  mountRef,
  progressRef,
  scrollStateRef
}: BlobverseStageParams): BlobverseStageHandle {
  const mount = mountRef.current;

  if (!mount) {
    return { dispose: () => undefined };
  }

  const currentMount = mount;
    let cancelled = false;
    let raf = 0;
    let renderer: WebGLRenderer | null = null;
    let overlayRenderer: WebGLRenderer | null = null;
    let composer: { render(): void; setSize(width: number, height: number): void; dispose?(): void } | null = null;
    let bokehPass: { enabled: boolean; uniforms: Record<string, { value: number }> } | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const textures: Texture[] = [];
    const geometries: BufferGeometry[] = [];
    const materials: Material[] = [];
    const backgroundLayers: { material: ShaderMaterial; index: number }[] = [];
    const pointer = { x: 0, y: 0 };
    const easedProgress = { current: progressRef.current };
    let confettiMaterial: ShaderMaterial | null = null;
    let confettiPoints: Object3D | null = null;

    const setup = async () => {
      const THREE = await import("three");

      if (cancelled || !mountRef.current) {
        return;
      }

      const scene = new THREE.Scene();
      const overlayScene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
      const textureLoader = new THREE.TextureLoader();
      const sceneGroups = blobverseScenes.map(() => new THREE.Group());
      const openingIndex = blobverseScenes.findIndex((sceneItem) => sceneItem.kind === "opening");
      const spaceIndex = blobverseScenes.findIndex((sceneItem) => sceneItem.kind === "space");
      const returnIndex = blobverseScenes.findIndex((sceneItem) => sceneItem.kind === "return");
      const groupFor = (kind: BlobverseSceneKind) => {
        const index = blobverseScenes.findIndex((sceneItem) => sceneItem.kind === kind);

        return sceneGroups[index] ?? sceneGroups[0];
      };
      const basePlaneGeometry = new THREE.PlaneGeometry(1, 1);
      const sphereGeometry = new THREE.SphereGeometry(1, 32, 18);
      const torusGeometry = new THREE.TorusGeometry(1, 0.015, 8, 96);
      const solarOrbitGeometry = new THREE.TorusGeometry(1, 0.022, 10, 160);

      geometries.push(basePlaneGeometry, sphereGeometry, torusGeometry, solarOrbitGeometry);

      renderer = createBlobverseRenderer(THREE, `${styles.webglCanvas} ${styles.webglCanvasBase}`);
      mount.appendChild(renderer.domElement);

      overlayRenderer = createBlobverseRenderer(THREE, `${styles.webglCanvas} ${styles.webglCanvasOverlay}`);
      mount.appendChild(overlayRenderer.domElement);

      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      const ambient = new THREE.HemisphereLight(0xfff5df, 0x071226, 1.25);
      const key = new THREE.DirectionalLight(0xffffff, 1.75);
      const rim = new THREE.PointLight(0xb77cff, 1.1, 18);
      const heroLight = new THREE.PointLight(0x8e6bff, 2.65, 8.5, 1.8);

      key.position.set(-3.8, 5.2, 5.4);
      rim.position.set(3.6, 0.6, 3.8);
      heroLight.position.set(0.1, 1.55, 1.35);
      heroLight.userData.sceneRole = "hero-light";
      heroLight.userData.phase = 0.6;
      heroLight.userData.baseIntensity = heroLight.intensity;
      camera.position.set(0, 0, 9.4);
      scene.add(ambient, key, rim, heroLight);
      sceneGroups.forEach((group) => scene.add(group));

      function registerMaterial<T extends Material>(material: T, baseOpacity = material.opacity) {
        return registerTrackedMaterial(materials, material, baseOpacity);
      }

      const maxTextureSize = 640;
      const cutoutTextureSize = window.innerWidth < 760 ? 320 : 512;

      const textureFor = createTextureCache({
        THREE,
        cutoutTextureSize,
        maxAnisotropy,
        maxTextureSize,
        renderOnLoad: () => renderer?.render(scene, camera),
        textureLoader,
        textures
      });

      const heroGlowTexture = createGlowTexture(THREE, textures);
      const hoverableBlobRoots: Object3D[] = [];
      const hoverGlowMaterial = registerMaterial(
        new THREE.SpriteMaterial({
          blending: THREE.AdditiveBlending,
          color: 0xff7ccf,
          depthWrite: false,
          map: heroGlowTexture,
          opacity: 0,
          transparent: true
        }),
        0
      );
      const hoverGlow = new THREE.Sprite(hoverGlowMaterial);
      const hoverGlowPosition = new THREE.Vector3();
      const hoverProjection = new THREE.Vector3();
      let hoveredBlob: Object3D | null = null;

      hoverGlow.visible = false;
      hoverGlow.renderOrder = 9;
      scene.add(hoverGlow);

      function registerHoverableBlob(root: Object3D, options: { material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial; sceneKind: "opening" | "return"; size: number }) {
        root.userData.hoverableBlob = true;
        root.userData.hoverFaceMaterial = options.material;
        root.userData.hoverBaseColor = options.material.color.clone();
        root.userData.hoverSceneKind = options.sceneKind;
        root.userData.hoverSize = options.size;
        root.userData.hoverT = 0;
        hoverableBlobRoots.push(root);
      }

      function addCard(
        group: Object3D,
        url: string,
        options: {
          angle?: number;
          height?: number;
          opacity?: number;
          phase?: number;
          renderOrder?: number;
          sceneRole?: string;
          tint?: number;
          width?: number;
          x: number;
          y: number;
          z: number;
        }
      ) {
        const width = options.width ?? 1.25;
        const height = options.height ?? 1.7;
        const sceneRole = options.sceneRole ?? "float-card";
        const card = new THREE.Group();
        const face = new THREE.Mesh(
          basePlaneGeometry,
          registerMaterial(
            new THREE.MeshBasicMaterial({
              alphaTest: 0.08,
              color: options.tint ?? colors.white,
              depthWrite: false,
              map: textureFor(url, true),
              opacity: options.opacity ?? 1,
              transparent: true
            }),
            options.opacity ?? 1
          )
        );

        face.position.z = 0.06;
        face.scale.set(width, height, 1);
        face.renderOrder = options.renderOrder ?? 2;
        card.position.set(options.x, options.y, options.z);
        card.rotation.set(0, 0, ((options.angle ?? 0) * Math.PI) / 180);
        card.userData.baseX = options.x;
        card.userData.baseY = options.y;
        card.userData.baseZ = options.z;
        card.userData.baseRotation = card.rotation.z;
        card.userData.phase = options.phase ?? 0;
        card.userData.sceneRole = sceneRole;
        card.add(face);

        if (sceneRole.startsWith("hero-") || sceneRole === "return-card" || sceneRole === "hero-card") {
          const hoverSceneKind = sceneRole === "return-card" || sceneRole === "hero-card" ? "return" : "opening";
          const faceMaterial = face.material as THREE.MeshBasicMaterial;

          registerHoverableBlob(card, {
            material: faceMaterial,
            sceneKind: hoverSceneKind,
            size: Math.max(width, height)
          });
        }

        group.add(card);

        return card;
      }

      function addBlob(group: Object3D, x: number, y: number, z: number, scale: number, color: number, opacity: number, phase: number) {
        const material = registerMaterial(
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0,
            metalness: 0.02,
            opacity,
            roughness: 0.72,
            transparent: true
          }),
          opacity
        );
        const blob = new THREE.Mesh(
          sphereGeometry,
          material
        );

        blob.position.set(x, y, z);
        blob.scale.set(scale * 1.24, scale * 0.82, scale * 0.42);
        blob.userData.baseX = x;
        blob.userData.baseY = y;
        blob.userData.baseScaleX = scale * 1.24;
        blob.userData.baseScaleY = scale * 0.82;
        blob.userData.baseScaleZ = scale * 0.42;
        blob.userData.phase = phase;
        blob.userData.sceneRole = "blob";
        registerHoverableBlob(blob, {
          material,
          sceneKind: "return",
          size: scale * 1.45
        });
        group.add(blob);
      }

      function addOpeningScene() {
        const group = groupFor("opening");
        const compactHero = window.innerWidth < 760;

        addHeroBackground({
          THREE,
          backgroundLayers,
          basePlaneGeometry,
          color: colors.night,
          group,
          groups: sceneGroups,
          materials
        });

        const glow = new THREE.Sprite(
          registerMaterial(
            new THREE.SpriteMaterial({
              blending: THREE.AdditiveBlending,
              color: 0x8e6bff,
              depthWrite: false,
              map: heroGlowTexture,
              opacity: GLOW_INTENSITY,
              transparent: true
            }),
            GLOW_INTENSITY
          )
        );

        glow.position.set(0, 1.05, -1.45);
        glow.scale.set(compactHero ? 4.8 : 6.4, compactHero ? 4.8 : 6.4, 1);
        glow.userData.sceneRole = "hero-glow";
        glow.userData.baseX = glow.position.x;
        glow.userData.baseY = glow.position.y;
        glow.userData.baseZ = glow.position.z;
        glow.userData.baseScale = glow.scale.x;
        glow.userData.phase = 0.2;
        group.add(glow);

        Array.from({ length: compactHero ? 2 : 3 }, (_, index) => {
          const ringMaterial = registerMaterial(
            new THREE.MeshBasicMaterial({
              blending: THREE.AdditiveBlending,
              color: index === 1 ? colors.jade : colors.blue,
              depthWrite: false,
              opacity: 0.1 - index * 0.018,
              transparent: true
            }),
            0.1 - index * 0.018
          );
          const ring = new THREE.Mesh(torusGeometry, ringMaterial);
          const scaleX = (compactHero ? 2.2 : 2.82) + index * 0.34;
          const scaleY = (compactHero ? 0.72 : 0.94) + index * 0.13;

          ring.position.set(0.08, 1.32, -1.12 - index * 0.28);
          ring.scale.set(scaleX, scaleY, 1);
          ring.rotation.x = 0.18 + index * 0.055;
          ring.rotation.z = -0.26 + index * 0.48;
          ring.userData.baseRotation = ring.rotation.z;
          ring.userData.baseScaleX = scaleX;
          ring.userData.baseScaleY = scaleY;
          ring.userData.phase = 0.8 + index * 1.2;
          ring.userData.sceneRole = "hero-halo-ring";
          group.add(ring);

          return ring;
        });

        createHeroBlobScatter(compactHero).forEach((placement) => {
          const card = addCard(group, placement.url, {
            angle: placement.angle,
            height: placement.height,
            opacity: placement.opacity,
            phase: placement.phase,
            renderOrder: placement.band === "near" ? 4 : placement.band === "mid" ? 3 : 1,
            sceneRole: placement.role,
            tint: placement.tint,
            width: placement.width,
            x: placement.x,
            y: placement.y,
            z: placement.z
          });

          card.userData.band = placement.band;
          card.userData.parallax = placement.parallax;
        });

        addCard(group, "/images/purple16.webp", {
          angle: -4,
          height: HERO_SCALE,
          opacity: 1,
          phase: 0.5,
          renderOrder: 6,
          sceneRole: "hero-focal-card",
          tint: colors.white,
          width: HERO_SCALE,
          x: 0.08,
          y: 1.35,
          z: -0.62
        });
      }

      function addSpaceScene() {
        const group = groupFor("space");
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(240 * 3);

        for (let index = 0; index < 240; index += 1) {
          starPositions[index * 3] = (seeded(index) - 0.5) * 16;
          starPositions[index * 3 + 1] = (seeded(index + 300) - 0.5) * 9;
          starPositions[index * 3 + 2] = -2.2 - seeded(index + 600) * 7;
        }

        starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
        geometries.push(starGeometry);
        addBackground({
          THREE,
          accent: colors.plumMid,
          backgroundLayers,
          basePlaneGeometry,
          color: colors.night,
          depth: -7.8,
          group,
          groups: sceneGroups,
          materials
        });

        const stars = new THREE.Points(
          starGeometry,
          registerMaterial(new THREE.PointsMaterial({ color: colors.white, opacity: 0.62, size: 0.024, transparent: true }), 0.62)
        );

        stars.userData.sceneRole = "stars";
        group.add(stars);

        const solarGroup = new THREE.Group();
        const solarCenter = { x: 0.15, y: 0.02, z: -2.15 };

        solarGroup.position.set(solarCenter.x, solarCenter.y, solarCenter.z);
        solarGroup.rotation.x = -0.18;
        solarGroup.userData.sceneRole = "solar-system";
        solarGroup.userData.baseX = solarCenter.x;
        solarGroup.userData.baseY = solarCenter.y;
        solarGroup.userData.baseZ = solarCenter.z;
        solarGroup.userData.baseScale = window.innerWidth < 760 ? 0.74 : 1;
        solarGroup.userData.phase = 0.4;
        group.add(solarGroup);

        const solarKeyLight = new THREE.PointLight(0xffffff, 2.1, 8.5, 1.35);
        const solarRimLight = new THREE.PointLight(0x91d8ff, 1.2, 10, 1.6);

        solarKeyLight.position.set(-1.8, 2.25, 2.35);
        solarRimLight.position.set(2.8, -1.2, 1.2);
        solarGroup.add(solarKeyLight, solarRimLight);

        const sunGlow = new THREE.Sprite(
          registerMaterial(
            new THREE.SpriteMaterial({
              blending: THREE.AdditiveBlending,
              color: 0xffd26a,
              depthWrite: false,
              map: heroGlowTexture,
              opacity: 0.22,
              transparent: true
            }),
            0.22
          )
        );

        sunGlow.position.set(0, 0, -0.34);
        sunGlow.scale.set(2.15, 2.15, 1);
        sunGlow.userData.sceneRole = "solar-glow";
        sunGlow.userData.baseScale = 2.15;
        sunGlow.userData.phase = 1.1;
        solarGroup.add(sunGlow);

        const sun = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 32, 16),
          registerMaterial(
            new THREE.MeshStandardMaterial({
              color: 0xffc44d,
              emissive: 0xff7a2b,
              emissiveIntensity: 1.8,
              metalness: 0,
              roughness: 0.45
            }),
            1
          )
        );

        geometries.push(sun.geometry);
        sun.userData.sceneRole = "solar-sun";
        sun.userData.phase = 0.2;
        solarGroup.add(sun);

        SOLAR_PLANET_SPECS.forEach((spec, index) => {
          const orbitOpacity = spec.orbitRadius < 1.8 ? 0.34 : 0.23;
          const orbit = new THREE.Mesh(
            solarOrbitGeometry,
            registerMaterial(
              new THREE.MeshBasicMaterial({
                blending: THREE.AdditiveBlending,
                color: index < 4 ? 0x9dc0ff : 0xffe4b2,
                depthWrite: false,
                opacity: orbitOpacity,
                transparent: true
              }),
              orbitOpacity
            )
          );
          const radiusY = spec.orbitRadius * 0.36;

          orbit.scale.set(spec.orbitRadius, radiusY, 1);
          orbit.rotation.x = 0.88;
          orbit.rotation.z = -0.08 + index * 0.025;
          orbit.userData.sceneRole = "solar-orbit";
          orbit.userData.phase = spec.phase;
          orbit.userData.baseRotation = orbit.rotation.z;
          solarGroup.add(orbit);

          const orbitGlow = new THREE.Mesh(
            solarOrbitGeometry,
            registerMaterial(
              new THREE.MeshBasicMaterial({
                blending: THREE.AdditiveBlending,
                color: index < 4 ? 0x7c9fff : 0xffce72,
                depthWrite: false,
                opacity: orbitOpacity * 0.28,
                transparent: true
              }),
              orbitOpacity * 0.28
            )
          );

          orbitGlow.scale.set(spec.orbitRadius * 1.006, radiusY * 1.018, 1);
          orbitGlow.rotation.x = 0.88;
          orbitGlow.rotation.z = -0.08 + index * 0.025;
          orbitGlow.userData.sceneRole = "solar-orbit-glow";
          orbitGlow.userData.phase = spec.phase + 0.7;
          orbitGlow.userData.baseRotation = orbitGlow.rotation.z;
          solarGroup.add(orbitGlow);

          const radius = Math.max(spec.radiusRatio * SOLAR_JUPITER_RADIUS, SOLAR_MIN_VISIBLE_RADIUS);
          const planet = new THREE.Mesh(
            sphereGeometry,
            registerMaterial(
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: new THREE.Color(spec.base).multiplyScalar(0.08),
                emissiveIntensity: 0.82,
                map: createSolarPlanetTexture(THREE, spec, maxAnisotropy, textures),
                metalness: 0.02,
                roughness: 0.5
              }),
              1
            )
          );

          planet.scale.setScalar(radius);
          planet.rotation.x = spec.axialTilt;
          planet.userData.sceneRole = "solar-planet";
          planet.userData.planetId = spec.id;
          planet.userData.orbitRadiusX = spec.orbitRadius;
          planet.userData.orbitRadiusY = radiusY;
          planet.userData.orbitSpeed = spec.orbitSpeed;
          planet.userData.rotationSpeed = spec.rotationSpeed;
          planet.userData.phase = spec.phase;
          planet.userData.axialTilt = spec.axialTilt;
          planet.userData.baseScale = radius;
          planet.userData.zAmp = 0.28 + index * 0.022;
          planet.renderOrder = spec.id === "jupiter" || spec.id === "saturn" ? 3 : 2;
          solarGroup.add(planet);

          if (spec.id === "saturn" || spec.id === "uranus") {
            const ringInner = spec.id === "saturn" ? 1.35 : 1.18;
            const ringOuter = spec.id === "saturn" ? 2.25 : 1.75;
            const ringGeometry = new THREE.RingGeometry(ringInner, ringOuter, 96);
            const ring = new THREE.Mesh(
              ringGeometry,
              registerMaterial(
                new THREE.MeshBasicMaterial({
                  color: spec.id === "saturn" ? 0xf2d28c : 0xa9f2ff,
                  depthWrite: false,
                  opacity: spec.id === "saturn" ? 0.56 : 0.26,
                  side: THREE.DoubleSide,
                  transparent: true
                }),
                spec.id === "saturn" ? 0.56 : 0.26
              )
            );

            geometries.push(ringGeometry);
            ring.rotation.x = spec.id === "saturn" ? 1.28 : 1.62;
            ring.rotation.y = spec.id === "saturn" ? 0.16 : 0.34;
            ring.userData.sceneRole = "solar-planet-ring";
            ring.userData.phase = spec.phase;
            planet.add(ring);
          }

          if (spec.id === "earth" || spec.id === "jupiter" || spec.id === "saturn") {
            const moonPivot = new THREE.Group();
            const moonRadius = spec.id === "earth" ? radius * 0.28 : radius * 0.16;
            const moonDistance = spec.id === "earth" ? radius * 1.75 : radius * 1.5;
            const moon = new THREE.Mesh(
              sphereGeometry,
              registerMaterial(
                new THREE.MeshStandardMaterial({
                  color: spec.id === "earth" ? 0xd8d5cc : 0xc8bfa8,
                  emissive: 0x2b2140,
                  emissiveIntensity: 0.18,
                  metalness: 0,
                  roughness: 0.68
                }),
                1
              )
            );

            moon.scale.setScalar(moonRadius);
            moon.position.set(moonDistance, 0, 0.04);
            moonPivot.rotation.x = 0.72;
            moonPivot.rotation.z = spec.phase;
            moonPivot.userData.sceneRole = "solar-moon-pivot";
            moonPivot.userData.phase = spec.phase;
            moonPivot.userData.orbitSpeed = spec.id === "earth" ? 0.72 : 0.34;
            moonPivot.add(moon);
            planet.add(moonPivot);
          }
        });

        const asteroidGeometry = new THREE.BufferGeometry();
        const asteroidPositions = new Float32Array(SOLAR_ASTEROID_COUNT * 3);
        const asteroidColors = new Float32Array(SOLAR_ASTEROID_COUNT * 3);
        const asteroidColor = new THREE.Color();

        for (let index = 0; index < SOLAR_ASTEROID_COUNT; index += 1) {
          const angle = (index / SOLAR_ASTEROID_COUNT) * Math.PI * 2 + seeded(index + 960) * 0.2;
          const radius = 2.04 + seeded(index + 970) * 0.34;
          const yRadius = radius * (0.34 + seeded(index + 980) * 0.04);
          const zJitter = (seeded(index + 990) - 0.5) * 0.13;

          asteroidPositions[index * 3] = Math.cos(angle) * radius;
          asteroidPositions[index * 3 + 1] = Math.sin(angle) * yRadius;
          asteroidPositions[index * 3 + 2] = Math.sin(angle * 1.7) * 0.16 + zJitter;

          asteroidColor.set(index % 3 === 0 ? 0xffdf9a : index % 3 === 1 ? 0xaed7ff : 0xffffff);
          asteroidColor.multiplyScalar(0.55 + seeded(index + 1000) * 0.36);
          asteroidColors[index * 3] = asteroidColor.r;
          asteroidColors[index * 3 + 1] = asteroidColor.g;
          asteroidColors[index * 3 + 2] = asteroidColor.b;
        }

        asteroidGeometry.setAttribute("position", new THREE.BufferAttribute(asteroidPositions, 3));
        asteroidGeometry.setAttribute("color", new THREE.BufferAttribute(asteroidColors, 3));
        geometries.push(asteroidGeometry);

        const asteroidBelt = new THREE.Points(
          asteroidGeometry,
          registerMaterial(
            new THREE.PointsMaterial({
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              opacity: 0.58,
              size: 0.032,
              transparent: true,
              vertexColors: true
            }),
            0.58
          )
        );

        asteroidBelt.rotation.x = 0.88;
        asteroidBelt.rotation.z = -0.03;
        asteroidBelt.userData.sceneRole = "solar-asteroid-belt";
        asteroidBelt.userData.phase = 0.9;
        asteroidBelt.userData.baseRotation = asteroidBelt.rotation.z;
        solarGroup.add(asteroidBelt);

        const bubbleCount = 18;

        for (let index = 0; index < bubbleCount; index += 1) {
          const url = characterTextureUrls[imageCursor];

          imageCursor = (imageCursor + 1) % characterTextureUrls.length;

          const angle = (index / bubbleCount) * Math.PI * 2 + seeded(index + 40) * 0.42;
          const nearLayer = index % 3 === 0;
          const sideRadiusX = nearLayer ? 4.2 + seeded(index + 43) * 1.15 : 5.05 + seeded(index + 43) * 1.05;
          const sideRadiusY = nearLayer ? 2.15 + seeded(index + 44) * 0.62 : 2.78 + seeded(index + 44) * 0.72;

          addSoapBubble({
            opacityScale: nearLayer ? 0.92 : 0.78,
            phase: index * 0.55,
            radius: (nearLayer ? 0.56 : 0.42) + seeded(index + 30) * (nearLayer ? 0.34 : 0.24),
            url,
            x: Math.cos(angle) * sideRadiusX + (seeded(index + 45) - 0.5) * 0.86,
            y: Math.sin(angle * 0.92) * sideRadiusY + (seeded(index + 50) - 0.5) * 0.62,
            z: nearLayer ? -0.8 - seeded(index + 80) * 1.15 : -2.2 - seeded(index + 80) * 2.1
          });
        }
      }

      function addReturnScene() {
        const group = groupFor("return");

        addBackground({
          THREE,
          accent: colors.gold,
          backgroundLayers,
          basePlaneGeometry,
          color: colors.night,
          depth: -7.1,
          group,
          groups: sceneGroups,
          materials
        });

        const returnGlow = new THREE.Sprite(
          registerMaterial(
            new THREE.SpriteMaterial({
              blending: THREE.AdditiveBlending,
              color: colors.gold,
              depthWrite: false,
              map: heroGlowTexture,
              opacity: 0.11,
              transparent: true
            }),
            0.11
          )
        );

        returnGlow.position.set(0, -0.12, -2.2);
        returnGlow.scale.set(6.4, 4.15, 1);
        returnGlow.userData.baseX = returnGlow.position.x;
        returnGlow.userData.baseY = returnGlow.position.y;
        returnGlow.userData.baseScale = returnGlow.scale.x;
        returnGlow.userData.phase = 1.1;
        returnGlow.userData.sceneRole = "return-glow";
        group.add(returnGlow);

        Array.from({ length: 8 }, (_, index) => {
          const palette = [colors.gold, colors.pink, colors.jade, colors.blue];
          const baseOpacity = 0.27 - index * 0.014;
          const ring = new THREE.Mesh(
            torusGeometry,
            registerMaterial(
              new THREE.MeshBasicMaterial({
                blending: THREE.AdditiveBlending,
                color: palette[index % palette.length],
                depthWrite: false,
                opacity: baseOpacity,
                transparent: true
              }),
              baseOpacity
            )
          );
          const scaleX = 1.85 + index * 0.58;
          const scaleY = 0.58 + index * 0.23;

          ring.position.set(0, -0.05, -1.05 - index * 0.32);
          ring.scale.set(scaleX, scaleY, 1);
          ring.rotation.x = 0.22 + index * 0.016;
          ring.rotation.z = index * 0.34;
          ring.userData.sceneRole = "return-ring";
          ring.userData.phase = index * 0.4;
          ring.userData.baseRotation = ring.rotation.z;
          ring.userData.baseScaleX = scaleX;
          ring.userData.baseScaleY = scaleY;
          group.add(ring);

          return ring;
        });

        characterTextureUrls.slice(10, 38).forEach((url, index) => {
          const angle = index * 2.3999632297 + seeded(index + 140) * 0.32;
          const radiusX = 2.75 + Math.sqrt(index + 1) * 0.42 + seeded(index + 150) * 0.42;
          const radiusY = 1.22 + Math.sqrt(index + 1) * 0.16 + seeded(index + 160) * 0.34;
          let x = Math.cos(angle) * radiusX;
          let y = Math.sin(angle) * radiusY * 0.72 + (seeded(index + 170) - 0.5) * 0.5;

          if (Math.abs(x) < 2.2 && Math.abs(y) < 1.18) {
            x = (x >= 0 ? 1 : -1) * (2.24 + seeded(index + 180) * 1.1);
            y += (y >= 0 ? 1 : -1) * (0.56 + seeded(index + 190) * 0.42);
          }

          addCard(group, url, {
            angle: angle * 57.2958,
            height: 0.72 + seeded(index + 70) * 0.32,
            opacity: 0.78 + seeded(index + 80) * 0.18,
            phase: index * 0.24,
            renderOrder: index % 5 === 0 ? 5 : 3,
            sceneRole: "return-card",
            width: 0.52 + seeded(index + 90) * 0.22,
            x,
            y,
            z: -0.62 - (index % 9) * 0.13 - index * 0.012
          });
        });

        addCard(group, featuredTextureUrls[1], {
          angle: 7,
          height: 2.38,
          opacity: 1,
          phase: 0.5,
          renderOrder: 8,
          sceneRole: "hero-card",
          width: 1.55,
          x: -3.75,
          y: 0.62,
          z: -0.48
        });
        addCard(group, featuredTextureUrls[0], {
          angle: -10,
          height: 2.08,
          opacity: 1,
          phase: 1.4,
          renderOrder: 8,
          sceneRole: "hero-card",
          width: 1.36,
          x: 3.72,
          y: -0.42,
          z: -0.58
        });
        addBlob(group, -4.3, -1.85, -2.8, 1.45, colors.jade, 0.13, 2.3);
        addBlob(group, 4.12, 2.12, -3.3, 1.16, colors.pink, 0.12, 1.2);
      }

      const bubbleGroup = groupFor("space");
      const whiteColor = new THREE.Color(0xffffff);
      const pointerNdc = new THREE.Vector2(5, 5);
      let lastElapsed = 0;
      let hoveredBubble: THREE.Object3D | null = null;
      let imageCursor = 0;

      let bubbleEnvMap: Texture | null = null;
      let envRenderTarget: import("three").WebGLRenderTarget | null = null;

      try {
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");

        if (!cancelled && renderer) {
          const pmrem = new THREE.PMREMGenerator(renderer);
          const roomEnv = new RoomEnvironment();

          envRenderTarget = pmrem.fromScene(roomEnv, 0.04);
          bubbleEnvMap = envRenderTarget.texture;
          roomEnv.traverse((child) => {
            const mesh = child as THREE.Mesh;

            mesh.geometry?.dispose?.();
            const roomMaterial = mesh.material;

            if (Array.isArray(roomMaterial)) {
              roomMaterial.forEach((entry) => entry.dispose());
            } else {
              roomMaterial?.dispose?.();
            }
          });
          pmrem.dispose();
        }
      } catch {
        bubbleEnvMap = null;
      }

      const bubbleTimeUniform = { value: 0 };
      const bubbleGeometry = new THREE.SphereGeometry(1, 48, 32);
      const cardGeometry = new THREE.BoxGeometry(1, 1, 1);
      const bubbleGroups: THREE.Object3D[] = [];
      const bubbleShells: THREE.Mesh[] = [];
      const tintFamilies: Record<string, number> = {
        blue: bubbleTints[0],
        green: bubbleTints[1],
        orange: bubbleTints[2],
        pink: bubbleTints[3],
        purple: bubbleTints[4]
      };

      geometries.push(bubbleGeometry, cardGeometry);

      function tintForUrl(url: string) {
        const match = url.match(/\/(blue|green|orange|pink|purple)/);

        return match ? tintFamilies[match[1]] : bubbleTints[0];
      }

      function makeShellMaterial(tint: THREE.Color) {
        const rimUniform = { value: tint.clone().lerp(whiteColor, 0.6) };
        const material = new THREE.MeshPhysicalMaterial({
          color: tint.clone(),
          metalness: 0,
          roughness: 0.12,
          transmission: 1,
          thickness: 1,
          ior: 1.2,
          transparent: true,
          opacity: bubbleShellOpacity,
          iridescence: 1,
          iridescenceIOR: 1.3,
          iridescenceThicknessRange: [100, 400],
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          envMap: bubbleEnvMap ?? undefined,
          envMapIntensity: 0.72,
          depthWrite: false,
          side: THREE.FrontSide
        });

        material.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = bubbleTimeUniform;
          shader.uniforms.uRimColor = rimUniform;
          shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
             float wob = sin(position.x * 3.0 + uTime * 1.5) * cos(position.y * 3.0 + uTime * 1.2) * 0.5
                       + sin(position.z * 3.5 + uTime * 1.1) * 0.5;
             transformed += normal * wob * 0.035;`
          );
          shader.fragmentShader = `uniform vec3 uRimColor;\n${shader.fragmentShader}`.replace(
            "#include <opaque_fragment>",
            `#include <opaque_fragment>
             float fres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.5);
             gl_FragColor.rgb += uRimColor * fres * 0.35;
             gl_FragColor.a = clamp(gl_FragColor.a + fres * 0.18, 0.0, 1.0);`
          );
        };

        material.userData.rimUniform = rimUniform;
        materials.push(material);

        return material;
      }

      function addSoapBubble(options: { opacityScale?: number; x: number; y: number; z: number; radius: number; url: string; phase: number }) {
        const tint = new THREE.Color(tintForUrl(options.url));
        const opacityScale = options.opacityScale ?? 1;
        const group = new THREE.Group();

        group.position.set(options.x, options.y, options.z);

        const cardSize = options.radius * 1.25;
        const cardDepth = options.radius * 0.09;
        const cardBase = new THREE.Vector3(cardSize, cardSize, cardDepth);
        const frontMaterial = new THREE.MeshBasicMaterial({
          alphaTest: 0.08,
          depthWrite: false,
          map: textureFor(options.url, true),
          opacity: opacityScale,
          transparent: true
        });
        const edgeMaterial = new THREE.MeshStandardMaterial({
          color: tint.clone().multiplyScalar(0.85),
          metalness: 0.15,
          opacity: 0,
          depthWrite: false,
          roughness: 0.5
        });

        frontMaterial.userData.keepOpaque = true;
        edgeMaterial.userData.keepOpaque = true;
        edgeMaterial.transparent = true;
        materials.push(frontMaterial, edgeMaterial);

        const card = new THREE.Mesh(cardGeometry, [
          edgeMaterial,
          edgeMaterial,
          edgeMaterial,
          edgeMaterial,
          frontMaterial,
          edgeMaterial
        ]);

        card.scale.copy(cardBase);
        card.renderOrder = 1;
        group.add(card);

        const shellMaterial = makeShellMaterial(tint);
        const shell = new THREE.Mesh(bubbleGeometry, shellMaterial);
        const rimMaterial = new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: tint.clone().lerp(whiteColor, 0.24),
          depthWrite: false,
          opacity: bubbleRimOpacity,
          toneMapped: true,
          transparent: true,
          wireframe: true
        });
        const rimShell = new THREE.Mesh(bubbleGeometry, rimMaterial);
        const highlightMaterial = new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: whiteColor,
          depthWrite: false,
          opacity: bubbleHighlightOpacity,
          toneMapped: true,
          transparent: true
        });
        const highlight = new THREE.Mesh(basePlaneGeometry, highlightMaterial);

        shell.scale.setScalar(options.radius);
        shell.renderOrder = 3;
        shell.userData.group = group;
        shellMaterial.userData.baseOpacity = bubbleShellOpacity * opacityScale;
        rimMaterial.userData.baseOpacity = bubbleRimOpacity * opacityScale;
        highlightMaterial.userData.baseOpacity = bubbleHighlightOpacity * opacityScale;
        materials.push(rimMaterial, highlightMaterial);
        rimShell.scale.setScalar(options.radius * 1.012);
        rimShell.renderOrder = 4;
        highlight.position.set(-options.radius * 0.26, options.radius * 0.32, options.radius * 0.72);
        highlight.scale.set(options.radius * 0.32, options.radius * 0.13, 1);
        highlight.rotation.z = -0.52;
        highlight.renderOrder = 5;
        group.add(shell, rimShell, highlight);

        const data = group.userData;

        data.tint = tint;
        data.baseX = options.x;
        data.baseY = options.y;
        data.baseZ = options.z;
        data.radius = options.radius;
        data.opacityScale = opacityScale;
        data.phase = options.phase;
        data.driftAmp = 0.12 + (options.radius - 0.5) * 0.22;
        data.driftSpeed = 0.32 + options.phase * 0.05;
        data.state = "idle";
        data.popElapsed = 0;
        data.hoverT = 0;
        data.bornAt = -1;
        data.cardVx = 0;
        data.cardVy = 0;
        data.cardSpinX = 0;
        data.cardSpinZ = 0;
        data.card = card;
        data.shell = shell;
        data.rimShell = rimShell;
        data.highlight = highlight;
        data.frontMaterial = frontMaterial;
        data.edgeMaterial = edgeMaterial;
        data.shellMaterial = shellMaterial;
        data.rimMaterial = rimMaterial;
        data.highlightMaterial = highlightMaterial;
        data.rimUniform = shellMaterial.userData.rimUniform;
        data.cardBase = cardBase;
        data.sceneRole = "soap-bubble";
        bubbleGroup.add(group);
        bubbleGroups.push(group);
        bubbleShells.push(shell);
      }

      function respawnBubble(group: THREE.Object3D, elapsed: number) {
        const data = group.userData;
        const url = characterTextureUrls[imageCursor];

        imageCursor = (imageCursor + 1) % characterTextureUrls.length;
        (data.tint as THREE.Color).set(tintForUrl(url));

        const frontMaterial = data.frontMaterial as THREE.MeshBasicMaterial;
        const edgeMaterial = data.edgeMaterial as THREE.MeshStandardMaterial;
        const shellMaterial = data.shellMaterial as THREE.MeshPhysicalMaterial;
        const rimMaterial = data.rimMaterial as THREE.MeshBasicMaterial;
        const highlightMaterial = data.highlightMaterial as THREE.MeshBasicMaterial;
        const card = data.card as THREE.Mesh;
        const shell = data.shell as THREE.Mesh;
        const rimShell = data.rimShell as THREE.Mesh;
        const highlight = data.highlight as THREE.Mesh;
        const opacityScale = (data.opacityScale as number | undefined) ?? 1;

        frontMaterial.map = textureFor(url, true);
        frontMaterial.needsUpdate = true;
        frontMaterial.transparent = true;
        frontMaterial.opacity = opacityScale;
        edgeMaterial.color.copy(data.tint as THREE.Color).multiplyScalar(0.85);
        edgeMaterial.transparent = true;
        edgeMaterial.opacity = 0;
        shellMaterial.color.copy(data.tint as THREE.Color);
        rimMaterial.color.copy(data.tint as THREE.Color).lerp(whiteColor, 0.24);
        (data.rimUniform as { value: THREE.Color }).value.copy(data.tint as THREE.Color).lerp(whiteColor, 0.6);
        shellMaterial.userData.baseOpacity = 0;
        shell.visible = true;
        shell.scale.setScalar(data.radius as number);
        rimMaterial.userData.baseOpacity = 0;
        highlightMaterial.userData.baseOpacity = 0;
        rimShell.visible = true;
        rimShell.scale.setScalar((data.radius as number) * 1.012);
        highlight.visible = true;
        card.position.set(0, 0, 0);
        card.rotation.set(0, 0, 0);
        card.scale.copy(data.cardBase as THREE.Vector3);
        data.state = "idle";
        data.bornAt = elapsed;
        data.popElapsed = 0;
        data.hoverT = 0;
        data.cardVx = 0;
        data.cardVy = 0;
      }

      const popEffects = createBlobversePopEffects({
        THREE,
        bubbleGroup,
        geometries,
        materials,
        whiteColor
      });

      function popBubble(group: THREE.Object3D) {
        const data = group.userData;

        if (data.state !== "idle") {
          return;
        }

        data.state = "popping";
        data.popElapsed = 0;
        data.cardVy = 0.8 + Math.random() * 0.6;
        data.cardVx = (Math.random() - 0.5) * 1.2;
        data.cardSpinX = (Math.random() - 0.5) * 6;
        data.cardSpinZ = (Math.random() - 0.5) * 6;
        popEffects.spawnBurst(group.position.x, group.position.y, group.position.z, data.tint as THREE.Color);
        popEffects.spawnRing(group.position.x, group.position.y, group.position.z, data.tint as THREE.Color);

        if (interactionRef?.current) {
          interactionRef.current.lastPopAt = performance.now();
          interactionRef.current.popX = interactionRef.current.pointerX ?? 0;
          interactionRef.current.popY = interactionRef.current.pointerY ?? 0;
        }
      }

      function updateBubbles(elapsed: number, delta: number, sceneOpacity: number) {
        for (const group of bubbleGroups) {
          const data = group.userData;
          const card = data.card as THREE.Mesh;
          const shell = data.shell as THREE.Mesh;
          const shellMaterial = data.shellMaterial as THREE.MeshPhysicalMaterial;
          const rimShell = data.rimShell as THREE.Mesh;
          const rimMaterial = data.rimMaterial as THREE.MeshBasicMaterial;
          const highlight = data.highlight as THREE.Mesh;
          const highlightMaterial = data.highlightMaterial as THREE.MeshBasicMaterial;
          const frontMaterial = data.frontMaterial as THREE.MeshBasicMaterial;
          const edgeMaterial = data.edgeMaterial as THREE.MeshStandardMaterial;
          const radius = data.radius as number;
          const phase = data.phase as number;
          const amp = data.driftAmp as number;
          const speed = data.driftSpeed as number;
          const cardBase = data.cardBase as THREE.Vector3;
          const opacityScale = (data.opacityScale as number | undefined) ?? 1;

          group.position.x = (data.baseX as number) + Math.sin(elapsed * speed + phase) * amp;
          group.position.y = (data.baseY as number) + Math.sin(elapsed * speed * 1.3 + phase * 1.7) * amp * 1.3;
          group.position.z = (data.baseZ as number) + Math.cos(elapsed * speed * 0.8 + phase) * amp * 0.6;

          if (data.state === "popping") {
            data.popElapsed = (data.popElapsed as number) + delta;

            const popElapsed = data.popElapsed as number;
            const shellT = Math.min(1, popElapsed / 0.12);

            if (popElapsed < 0.12) {
              shell.scale.setScalar(radius * (1 + easeOutBack(shellT) * 0.5));
              rimShell.scale.setScalar(radius * 1.012 * (1 + easeOutBack(shellT) * 0.5));
              shellMaterial.userData.baseOpacity = bubbleShellOpacity * opacityScale * (1 - shellT);
              rimMaterial.userData.baseOpacity = bubbleRimOpacity * opacityScale * (1 - shellT);
              highlightMaterial.userData.baseOpacity = bubbleHighlightOpacity * opacityScale * (1 - shellT);
            } else if (shell.visible) {
              shell.visible = false;
              rimShell.visible = false;
              highlight.visible = false;
            }

            data.cardVy = (data.cardVy as number) - 6 * delta;
            card.position.x += (data.cardVx as number) * delta;
            card.position.y += (data.cardVy as number) * delta;
            card.rotation.x += (data.cardSpinX as number) * delta;
            card.rotation.y += (data.cardSpinX as number) * 0.5 * delta;
            card.rotation.z += (data.cardSpinZ as number) * delta;

            const cardPop = 1 + easeOutBack(shellT) * 0.25;

            card.scale.set(cardBase.x * cardPop, cardBase.y * cardPop, cardBase.z * cardPop);

            const cardFade = 1 - Math.min(1, popElapsed / 0.7);

            frontMaterial.transparent = true;
            frontMaterial.opacity = cardFade * opacityScale;
            edgeMaterial.transparent = true;
            edgeMaterial.opacity = 0;

            if (popElapsed >= 0.7) {
              respawnBubble(group, elapsed);
            }

            continue;
          }

          const hoverTarget = group === hoveredBubble && data.state === "idle" ? 1 : 0;

          data.hoverT = (data.hoverT as number) + (hoverTarget - (data.hoverT as number)) * Math.min(1, delta * 12);

          const hoverT = data.hoverT as number;
          const bornAt = data.bornAt as number;

          const intro = !motionOK || bornAt < 0 ? 1 : easeOutBack(Math.min(1, (elapsed - bornAt) / 0.32));
          const introOpacity = !motionOK || bornAt < 0 ? 1 : Math.min(1, (elapsed - bornAt) / 0.25);

          group.scale.setScalar(intro * (1 + 0.16 * hoverT));

          card.rotation.y = Math.sin(elapsed * 0.4 + phase) * 0.6 + pointer.x * 0.5 * hoverT;
          card.rotation.x = Math.sin(elapsed * 0.33 + phase * 1.3) * 0.18 - pointer.y * 0.42 * hoverT;
          card.rotation.z = 0;

          const cardOpaque = sceneOpacity >= 0.999;

          frontMaterial.transparent = true;
          frontMaterial.opacity = (cardOpaque ? 1 : sceneOpacity) * opacityScale;
          edgeMaterial.transparent = true;
          edgeMaterial.opacity = 0;
          shellMaterial.emissive.copy(data.tint as THREE.Color).multiplyScalar(0.24 * hoverT);
          shellMaterial.userData.baseOpacity = bubbleShellOpacity * opacityScale * introOpacity;
          rimMaterial.userData.baseOpacity = (bubbleRimOpacity + hoverT * 0.14) * opacityScale * introOpacity;
          highlightMaterial.userData.baseOpacity = (bubbleHighlightOpacity + hoverT * 0.18) * opacityScale * introOpacity;
        }
      }

      const raycaster = new THREE.Raycaster();

      function pickHoverBlob(activeSceneKind: "opening" | "return" | null) {
        if (!activeSceneKind || pointerNdc.x < -1 || pointerNdc.x > 1) {
          return null;
        }

        scene.updateMatrixWorld(true);
        let nearest: Object3D | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const root of hoverableBlobRoots) {
          if (!root.visible || root.userData.hoverSceneKind !== activeSceneKind) {
            continue;
          }

          root.getWorldPosition(hoverProjection);
          hoverProjection.project(camera);

          if (hoverProjection.z < -1 || hoverProjection.z > 1) {
            continue;
          }

          const hoverSize = (root.userData.hoverSize as number | undefined) ?? 1;
          const distanceToCamera = Math.max(1, camera.position.distanceTo(root.getWorldPosition(hoverGlowPosition)));
          const viewHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * distanceToCamera;
          const isReturnHover = activeSceneKind === "return";
          const radius = clamp((hoverSize / viewHeight) * (isReturnHover ? 2.25 : 1.75), isReturnHover ? 0.12 : 0.085, isReturnHover ? 0.36 : 0.28);
          const dx = pointerNdc.x - hoverProjection.x;
          const dy = (pointerNdc.y - hoverProjection.y) * camera.aspect;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < radius && distance < nearestDistance) {
            nearest = root;
            nearestDistance = distance;
          }
        }

        return nearest;
      }

      function raycastBubble() {
        if (pointerNdc.x < -1 || pointerNdc.x > 1) {
          return null;
        }

        bubbleGroup.updateMatrixWorld(true);
        raycaster.setFromCamera(pointerNdc, camera);

        const hits = raycaster.intersectObjects(bubbleShells, false);

        for (const hit of hits) {
          const mesh = hit.object as THREE.Mesh;
          const group = mesh.userData.group as THREE.Object3D | undefined;

          if (mesh.visible && group?.userData.state === "idle") {
            return group;
          }
        }

        return null;
      }

      function onPointerDown(event: PointerEvent) {
        const rect = currentMount.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / Math.max(rect.width, 1);
        const ny = (event.clientY - rect.top) / Math.max(rect.height, 1);

        pointerNdc.set(nx * 2 - 1, -(ny * 2 - 1));

        if (smoothstep(1 - cyclicDistance(easedProgress.current * sceneCount, spaceIndex, sceneCount)) < 0.5) {
          return;
        }

        const group = raycastBubble();

        if (group) {
          popBubble(group);
        }
      }

      addOpeningScene();
      addSpaceScene();
      addReturnScene();

      const confettiCount = 360;
      const confettiGeometry = new THREE.BufferGeometry();
      const confettiPositions = new Float32Array(confettiCount * 3);
      const confettiColors = new Float32Array(confettiCount * 3);
      const confettiPhase = new Float32Array(confettiCount);
      const confettiScale = new Float32Array(confettiCount);
      const confettiColor = new THREE.Color();

      for (let index = 0; index < confettiCount; index += 1) {
        confettiPositions[index * 3] = (seeded(index) - 0.5) * 20;
        confettiPositions[index * 3 + 1] = (seeded(index + 800) - 0.5) * 12;
        confettiPositions[index * 3 + 2] = -1.5 - seeded(index + 1600) * 6.5;
        confettiColor.setHex(confettiPalette[Math.floor(seeded(index + 2400) * confettiPalette.length) % confettiPalette.length]);
        confettiColors[index * 3] = confettiColor.r;
        confettiColors[index * 3 + 1] = confettiColor.g;
        confettiColors[index * 3 + 2] = confettiColor.b;
        confettiPhase[index] = seeded(index + 3200) * Math.PI * 2;
        confettiScale[index] = 0.6 + seeded(index + 4000) * 1.1;
      }

      confettiGeometry.setAttribute("position", new THREE.BufferAttribute(confettiPositions, 3));
      confettiGeometry.setAttribute("aColor", new THREE.BufferAttribute(confettiColors, 3));
      confettiGeometry.setAttribute("aPhase", new THREE.BufferAttribute(confettiPhase, 1));
      confettiGeometry.setAttribute("aScale", new THREE.BufferAttribute(confettiScale, 1));
      geometries.push(confettiGeometry);

      confettiMaterial = new THREE.ShaderMaterial({
        uniforms: {
          u_opacity: { value: 0.18 },
          u_time: { value: 0 },
          u_pixelRatio: { value: renderPixelRatio() }
        },
        vertexShader: confettiVertexShader,
        fragmentShader: confettiFragmentShader,
        depthWrite: false,
        transparent: true
      });
      materials.push(confettiMaterial);

      confettiPoints = new THREE.Points(confettiGeometry, confettiMaterial);
      overlayScene.add(confettiPoints);

      if (!cancelled && renderer) {
        const postprocessing = await createBlobversePostprocessing({
          THREE,
          aperture: DOF_APERTURE,
          bloomRadius: BLOOM_RADIUS,
          bloomStrength: BLOOM_STRENGTH,
          bloomThreshold: BLOOM_THRESHOLD,
          camera,
          focus: DOF_FOCUS,
          maxBlur: DOF_MAXBLUR,
          renderer,
          scene
        });

        bokehPass = postprocessing.bokehPass;
        composer = postprocessing.composer;
      }

      let mountRect: DOMRect = currentMount.getBoundingClientRect();

      function resize() {
        if (!renderer || !mountRef.current) {
          return;
        }

        mountRect = mountRef.current.getBoundingClientRect();
        const width = Math.max(1, Math.round(mountRect.width));
        const height = Math.max(1, Math.round(mountRect.height));
        const aspect = width / height;
        const pixelRatio = renderPixelRatio();

        renderer.setPixelRatio(pixelRatio);
        overlayRenderer?.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        overlayRenderer?.setSize(width, height, false);
        composer?.setSize(width, height);
        if (confettiMaterial) {
          confettiMaterial.uniforms.u_pixelRatio.value = pixelRatio;
        }
        camera.aspect = aspect;
        camera.position.z = aspect < 0.76 ? 10.8 : aspect < 1.1 ? 9.8 : 8.7;
        sceneGroups.forEach((group) => {
          group.scale.setScalar(aspect < 0.76 ? 0.74 : aspect < 1.1 ? 0.88 : 1);
        });
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        overlayRenderer?.render(overlayScene, camera);
      }

      function updatePointer(event: PointerEvent) {
        if (event.target instanceof HTMLElement && event.target.closest("[data-blobverse-chrome]")) {
          resetPointer();

          return;
        }

        const nx = (event.clientX - mountRect.left) / Math.max(mountRect.width, 1);
        const ny = (event.clientY - mountRect.top) / Math.max(mountRect.height, 1);

        if (interactionRef?.current) {
          interactionRef.current.pointerX = event.clientX;
          interactionRef.current.pointerY = event.clientY;
        }

        pointer.x = motionOK ? (nx - 0.5) * 2 : 0;
        pointer.y = motionOK ? (ny - 0.5) * 2 : 0;
        pointerNdc.set(nx * 2 - 1, -(ny * 2 - 1));
      }

      function resetPointer() {
        pointer.x = 0;
        pointer.y = 0;
        pointerNdc.set(5, 5);
        hoveredBubble = null;
        hoveredBlob = null;

        if (interactionRef?.current) {
          interactionRef.current.hoveringBubble = false;
        }
      }

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      window.addEventListener("pointermove", updatePointer, { passive: true });
      window.addEventListener("pointerleave", resetPointer, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      resize();

      let startedAt = performance.now();
      let ambientElapsed = 0;

      const renderFrame = () => {
        if (cancelled || !renderer) {
          return;
        }

        raf = window.requestAnimationFrame(renderFrame);

        easedProgress.current = scrollStateRef.current.global ?? progressRef.current;
        const realElapsed = (performance.now() - startedAt) / 1000;
        const delta = Math.min(0.05, realElapsed - lastElapsed);

        lastElapsed = realElapsed;

        if (motionOK) {
          ambientElapsed += delta;
        }

        const elapsed = ambientElapsed;
        const sceneFloat = easedProgress.current * sceneCount;
        const { localProgress, sectionIndex } = scrollStateRef.current;
        const bubbleSceneOpacity = smoothstep(1 - cyclicDistance(sceneFloat, spaceIndex, sceneCount));

        bubbleTimeUniform.value = elapsed;
        updateBubbles(elapsed, delta, bubbleSceneOpacity);
        popEffects.updateParticles(delta);
        popEffects.updateRings(delta);

        const groupOpacities = sceneGroups.map((group, index) => {
          const opacity = smoothstep(1 - cyclicDistance(sceneFloat, index, sceneCount));

          group.visible = opacity > 0.01;
          group.position.x = pointer.x * 0.14 * opacity;
          group.position.y = -pointer.y * 0.1 * opacity;
          group.position.z = (1 - opacity) * -1.4 + (index === sectionIndex ? Math.sin(localProgress * Math.PI) * 0.12 : 0);
          applySceneOpacity(group, opacity);

          return opacity;
        });

        const activeBlobSceneKind = sectionIndex === openingIndex ? "opening" : sectionIndex === returnIndex ? "return" : null;

        hoveredBlob = pickHoverBlob(activeBlobSceneKind);

        backgroundLayers.forEach(({ material, index }) => {
          if (material.uniforms.u_time) {
            material.uniforms.u_time.value = elapsed;
          }

          if (material.uniforms.u_opacity) {
            material.uniforms.u_opacity.value = index >= 0 ? groupOpacities[index] ?? 0 : 0;
          }
        });

        const openingOpacity = groupOpacities[openingIndex] ?? 0;
        const returnOpacity = groupOpacities[returnIndex] ?? 0;

        if (bokehPass) {
          bokehPass.enabled = motionOK && openingOpacity > 0.04;
          bokehPass.uniforms.focus.value = DOF_FOCUS + (camera.position.z - 8.7);
          bokehPass.uniforms.aperture.value = DOF_APERTURE * openingOpacity;
          bokehPass.uniforms.maxblur.value = DOF_MAXBLUR;
        }

        if (confettiMaterial) {
          confettiMaterial.uniforms.u_time.value = elapsed;
          confettiMaterial.uniforms.u_opacity.value = 0.08 + openingOpacity * 0.08 + returnOpacity * 0.46;
        }

        if (confettiPoints) {
          confettiPoints.rotation.y = elapsed * 0.02;
          confettiPoints.position.x = pointer.x * 0.3;
          confettiPoints.position.y = -pointer.y * 0.2;
        }

        scene.traverse((object) => {
          const role = object.userData.sceneRole as string | undefined;

          if (!role) {
            return;
          }

          if ((role === "return-card" || role === "hero-card") && sectionIndex !== returnIndex) {
            object.visible = false;

            return;
          }

          object.visible = true;

          const phase = (object.userData.phase as number | undefined) ?? 0;
          const baseX = (object.userData.baseX as number | undefined) ?? object.position.x;
          const baseY = (object.userData.baseY as number | undefined) ?? object.position.y;
          const baseZ = (object.userData.baseZ as number | undefined) ?? object.position.z;
          const baseRotation = (object.userData.baseRotation as number | undefined) ?? object.rotation.z;

          if (role.includes("card")) {
            object.position.x = baseX + Math.sin(elapsed * 0.48 + phase) * 0.1;
            object.position.y = baseY + Math.sin(elapsed * 0.78 + phase) * 0.16;
            object.position.z = baseZ + Math.cos(elapsed * 0.36 + phase) * 0.1;
            object.rotation.z = baseRotation + Math.sin(elapsed * 0.54 + phase) * 0.045;
            object.rotation.y = pointer.x * 0.11 + Math.sin(elapsed * 0.22 + phase) * 0.05;
          }

          if (role === "hero-far-card" || role === "hero-mid-card" || role === "hero-near-card") {
            const band = object.userData.band as HeroDepthBand | undefined;
            const parallax = (object.userData.parallax as number | undefined) ?? 0.2;
            const bandDepth = band === "far" ? 0.22 : band === "mid" ? 0.48 : 0.72;
            const floatAmp = band === "far" ? 0.055 : band === "mid" ? 0.095 : 0.135;
            const scrollPush = openingOpacity * (localProgress - 0.5) * bandDepth;

            object.position.x = baseX + pointer.x * parallax + Math.sin(elapsed * (0.22 + bandDepth * 0.08) + phase) * floatAmp;
            object.position.y = baseY - pointer.y * parallax * 0.54 + Math.cos(elapsed * (0.28 + bandDepth * 0.07) + phase) * floatAmp * 1.12;
            object.position.z = baseZ + scrollPush + Math.sin(elapsed * 0.18 + phase) * 0.08;
            object.rotation.z = baseRotation + Math.sin(elapsed * 0.24 + phase) * (band === "near" ? 0.08 : 0.045);
            object.rotation.y = pointer.x * parallax * 0.14 + Math.sin(elapsed * 0.18 + phase) * 0.035;
            object.scale.setScalar(1 + Math.sin(elapsed * 0.25 + phase) * (band === "near" ? 0.026 : 0.014));
          }

          if (role === "hero-focal-card") {
            object.position.x = baseX + pointer.x * 0.1 + Math.sin(elapsed * 0.28 + phase) * 0.045;
            object.position.y = baseY - pointer.y * 0.06 + Math.sin(elapsed * 0.44 + phase) * 0.09;
            object.position.z = baseZ + openingOpacity * Math.sin(localProgress * Math.PI) * 0.16;
            object.rotation.z = baseRotation + Math.sin(elapsed * 0.34 + phase) * 0.08;
            object.rotation.y = pointer.x * 0.16 + Math.sin(elapsed * 0.22 + phase) * 0.07;
            object.rotation.x = -pointer.y * 0.08 + Math.cos(elapsed * 0.24 + phase) * 0.035;
            object.scale.setScalar(1 + Math.sin(elapsed * 0.72 + phase) * 0.025);
          }

          if (role === "hero-glow") {
            const baseScale = (object.userData.baseScale as number | undefined) ?? object.scale.x;
            const pulse = 1 + Math.sin(elapsed * 0.62 + phase) * 0.035;

            object.position.x = baseX + pointer.x * 0.08;
            object.position.y = baseY - pointer.y * 0.04;
            object.scale.set(baseScale * pulse, baseScale * pulse, 1);
          }

          if (role === "hero-halo-ring") {
            const baseScaleX = (object.userData.baseScaleX as number | undefined) ?? object.scale.x;
            const baseScaleY = (object.userData.baseScaleY as number | undefined) ?? object.scale.y;
            const pulse = 1 + Math.sin(elapsed * 0.46 + phase) * 0.018;

            object.position.x = baseX + pointer.x * 0.045;
            object.position.y = baseY - pointer.y * 0.024;
            object.rotation.z = baseRotation + elapsed * (0.035 + phase * 0.002);
            object.rotation.y = Math.sin(elapsed * 0.2 + phase) * 0.055;
            object.scale.set(baseScaleX * pulse, baseScaleY * pulse, 1);
          }

          if (role === "hero-light" && "intensity" in object) {
            const light = object as THREE.PointLight;
            const baseIntensity = (object.userData.baseIntensity as number | undefined) ?? light.intensity;

            light.intensity = baseIntensity * (0.2 + openingOpacity * 0.8);
            light.position.x = baseX + pointer.x * 0.32 + Math.sin(elapsed * 0.32 + phase) * 0.08;
            light.position.y = baseY - pointer.y * 0.18 + Math.cos(elapsed * 0.28 + phase) * 0.06;
          }

          if (role === "orbit-card") {
            object.rotation.z += 0.0025;
          }

          if (role === "collage-card") {
            object.position.x = baseX + Math.sin(elapsed * 0.62 + phase) * 0.16;
            object.position.y = baseY + Math.cos(elapsed * 0.72 + phase) * 0.2;
            object.scale.setScalar(1 + Math.sin(elapsed * 0.5 + phase) * 0.035);
          }

          if (role === "return-card") {
            object.position.x = baseX + Math.cos(elapsed * 0.28 + phase) * 0.16 + pointer.x * 0.08;
            object.position.y = baseY + Math.sin(elapsed * 0.34 + phase) * 0.12 - pointer.y * 0.045;
            object.position.z = baseZ + Math.sin(elapsed * 0.18 + phase) * 0.08;
            object.rotation.z = baseRotation + elapsed * (0.11 + phase * 0.002) + Math.sin(elapsed * 0.22 + phase) * 0.045;
            object.rotation.y = pointer.x * 0.09 + Math.sin(elapsed * 0.2 + phase) * 0.055;
            object.scale.setScalar(1 + Math.sin(elapsed * 0.36 + phase) * 0.018);
          }

          if (role === "hero-card") {
            object.position.x = baseX + Math.sin(elapsed * 0.24 + phase) * 0.09 + pointer.x * 0.13;
            object.position.y = baseY + Math.cos(elapsed * 0.28 + phase) * 0.1 - pointer.y * 0.07;
            object.position.z = baseZ + Math.sin(elapsed * 0.18 + phase) * 0.06;
            object.rotation.z = baseRotation + Math.sin(elapsed * 0.26 + phase) * 0.055;
            object.rotation.y = pointer.x * 0.14 + Math.sin(elapsed * 0.16 + phase) * 0.05;
            object.rotation.x = -pointer.y * 0.07 + Math.cos(elapsed * 0.18 + phase) * 0.035;
            object.scale.setScalar(1 + Math.sin(elapsed * 0.3 + phase) * 0.018);
          }

          if (role === "bubble-card") {
            object.rotation.y += 0.006;
            object.rotation.x = Math.sin(elapsed * 0.34 + phase) * 0.06;
          }

          if (role === "blob") {
            const baseScaleX = (object.userData.baseScaleX as number | undefined) ?? object.scale.x;
            const baseScaleY = (object.userData.baseScaleY as number | undefined) ?? object.scale.y;
            const baseScaleZ = (object.userData.baseScaleZ as number | undefined) ?? object.scale.z;
            const pulse = 1 + Math.sin(elapsed * 0.3 + phase) * 0.02;

            object.position.y = baseY + Math.sin(elapsed * 0.34 + phase) * 0.18;
            object.rotation.y += 0.004;
            object.scale.set(baseScaleX * pulse, baseScaleY * pulse, baseScaleZ * pulse);
          }

          if (object.userData.hoverableBlob) {
            const target = object === hoveredBlob ? 1 : 0;
            const hoverT = ((object.userData.hoverT as number | undefined) ?? 0) + (target - ((object.userData.hoverT as number | undefined) ?? 0)) * Math.min(1, delta * 11);
            const faceMaterial = object.userData.hoverFaceMaterial as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | undefined;
            const baseColor = object.userData.hoverBaseColor as THREE.Color | undefined;

            object.userData.hoverT = hoverT;
            object.scale.multiplyScalar(1 + hoverT * 0.2);

            if (faceMaterial && baseColor) {
              faceMaterial.color.copy(baseColor).lerp(whiteColor, hoverT * 0.34);

              if ("emissive" in faceMaterial) {
                faceMaterial.emissive.copy(baseColor).multiplyScalar(hoverT * 0.48);
                faceMaterial.emissiveIntensity = hoverT * 1.25;
              }
            }
          }

          if (role === "solar-system") {
            const baseScale = (object.userData.baseScale as number | undefined) ?? 1;

            object.position.x = baseX + pointer.x * 0.28 + Math.sin(elapsed * 0.08 + phase) * 0.05;
            object.position.y = baseY - pointer.y * 0.18 + Math.sin(localProgress * Math.PI) * 0.12;
            object.position.z = baseZ + Math.sin(localProgress * Math.PI) * 0.18;
            object.rotation.x = -0.18 - pointer.y * 0.035;
            object.rotation.y = pointer.x * 0.06 + Math.sin(elapsed * 0.055 + phase) * 0.035;
            object.rotation.z = Math.sin(elapsed * 0.045 + phase) * 0.024;
            object.scale.setScalar(baseScale);
          }

          if (role === "solar-glow") {
            const baseScale = (object.userData.baseScale as number | undefined) ?? object.scale.x;
            const pulse = 1 + Math.sin(elapsed * 0.52 + phase) * 0.075;

            object.scale.set(baseScale * pulse, baseScale * pulse, 1);
          }

          if (role === "solar-sun") {
            object.rotation.y += motionOK ? 0.006 : 0.001;
            object.scale.setScalar(1 + Math.sin(elapsed * 0.88 + phase) * 0.045);
          }

          if (role === "solar-planet") {
            const orbitRadiusX = (object.userData.orbitRadiusX as number | undefined) ?? 1;
            const orbitRadiusY = (object.userData.orbitRadiusY as number | undefined) ?? 0.4;
            const orbitSpeed = (object.userData.orbitSpeed as number | undefined) ?? 0.1;
            const rotationSpeed = (object.userData.rotationSpeed as number | undefined) ?? 0.005;
            const axialTilt = (object.userData.axialTilt as number | undefined) ?? 0;
            const baseScale = (object.userData.baseScale as number | undefined) ?? object.scale.x;
            const zAmp = (object.userData.zAmp as number | undefined) ?? 0.28;
            const motionScale = motionOK ? 1 : 0.12;
            const orbitAngle = phase + elapsed * orbitSpeed * motionScale + localProgress * 1.15;
            const depth = Math.sin(orbitAngle);
            const scaleByDepth = 1 + depth * 0.035;

            object.position.x = Math.cos(orbitAngle) * orbitRadiusX;
            object.position.y = Math.sin(orbitAngle) * orbitRadiusY;
            object.position.z = depth * zAmp;
            object.rotation.x = axialTilt + Math.sin(elapsed * 0.18 + phase) * 0.018;
            object.rotation.y += rotationSpeed * motionScale;
            object.scale.setScalar(baseScale * scaleByDepth);
          }

          if (role === "solar-planet-ring") {
            object.rotation.z += (motionOK ? 0.0022 : 0.0004) + phase * 0.00008;
          }

          if (role === "solar-moon-pivot") {
            const orbitSpeed = (object.userData.orbitSpeed as number | undefined) ?? 0.4;

            object.rotation.z += (motionOK ? orbitSpeed : orbitSpeed * 0.12) * 0.018;
          }

          if (role === "solar-orbit" || role === "solar-orbit-glow") {
            const pulse = role === "solar-orbit-glow" ? 0.026 : 0.015;

            object.rotation.z = baseRotation + Math.sin(elapsed * 0.16 + phase) * pulse;
          }

          if (role === "solar-asteroid-belt") {
            object.rotation.z = baseRotation + elapsed * (motionOK ? 0.018 : 0.003) + Math.sin(elapsed * 0.13 + phase) * 0.01;
            object.rotation.y = Math.sin(elapsed * 0.08 + phase) * 0.035;
          }

          if (role === "wave" && object instanceof THREE.Mesh) {
            const geometry = object.geometry;
            const position = geometry.getAttribute("position");

            for (let index = 0; index < position.count; index += 1) {
              const x = position.getX(index);
              const y = position.getY(index);

              position.setZ(index, Math.sin(x * 0.86 + elapsed * 0.9) * 0.24 + Math.cos(y * 1.2 + elapsed * 0.55) * 0.1);
            }

            position.needsUpdate = true;
            geometry.computeVertexNormals();
          }

          if (role === "return-ring") {
            const baseScaleX = (object.userData.baseScaleX as number | undefined) ?? object.scale.x;
            const baseScaleY = (object.userData.baseScaleY as number | undefined) ?? object.scale.y;
            const pulse = 1 + Math.sin(elapsed * 0.32 + phase) * 0.016;

            object.rotation.z = baseRotation + elapsed * (0.055 + phase * 0.0015);
            object.rotation.y = Math.sin(elapsed * 0.18 + phase) * 0.1;
            object.scale.set(baseScaleX * pulse, baseScaleY * pulse, 1);
          }

          if (role === "return-glow") {
            const baseScale = (object.userData.baseScale as number | undefined) ?? object.scale.x;
            const pulse = 1 + Math.sin(elapsed * 0.5 + phase) * 0.045;

            object.position.x = baseX + pointer.x * 0.07;
            object.position.y = baseY - pointer.y * 0.035;
            object.scale.set(baseScale * pulse, baseScale * 0.66 * pulse, 1);
          }

          if (role === "stars") {
            object.rotation.y = elapsed * 0.012;
          }
        });

        if (hoveredBlob) {
          const hoverT = (hoveredBlob.userData.hoverT as number | undefined) ?? 0;
          const hoverSize = (hoveredBlob.userData.hoverSize as number | undefined) ?? 1.4;
          const sceneOpacity = activeBlobSceneKind === "opening" ? openingOpacity : returnOpacity;

          hoveredBlob.getWorldPosition(hoverGlowPosition);
          hoverGlow.visible = hoverT > 0.01 && sceneOpacity > 0.2;
          hoverGlow.position.copy(hoverGlowPosition);
          hoverGlow.position.z -= 0.18;
          hoverGlow.scale.setScalar(hoverSize * (1.7 + hoverT * 0.5));
          hoverGlowMaterial.opacity = hoverT * sceneOpacity * 0.52;
          hoverGlowMaterial.color.set(hoveredBlob.userData.hoverSceneKind === "return" ? 0xff79c9 : 0x8e6bff);
        } else {
          hoverGlowMaterial.opacity += (0 - hoverGlowMaterial.opacity) * Math.min(1, delta * 10);
          hoverGlow.visible = hoverGlowMaterial.opacity > 0.01;
        }

        hoveredBubble = smoothstep(1 - cyclicDistance(sceneFloat, spaceIndex, sceneCount)) > 0.5 ? raycastBubble() : null;

        if (interactionRef?.current) {
          interactionRef.current.hoveringBubble = hoveredBubble !== null;
        }

        document.body.style.cursor = hoveredBubble || hoveredBlob ? "pointer" : "";

        camera.position.x += (pointer.x * (0.16 + openingOpacity * 0.12) - camera.position.x) * 0.075;
        camera.position.y += (-pointer.y * (0.12 + openingOpacity * 0.08) - camera.position.y) * 0.075;
        camera.lookAt(0, 0, -1.2);

        if (composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }

        overlayRenderer?.render(overlayScene, camera);
      };

      renderFrame();

      function handleVisibilityChange() {
        if (document.hidden) {
          if (raf) {
            window.cancelAnimationFrame(raf);
            raf = 0;
          }
        } else if (!cancelled && !raf) {
          startedAt = performance.now() - lastElapsed * 1000;
          renderFrame();
        }
      }

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        window.removeEventListener("pointermove", updatePointer);
        window.removeEventListener("pointerleave", resetPointer);
        window.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.body.style.cursor = "";
        popEffects.dispose();
        envRenderTarget?.dispose();
      };
    };

    let removeListeners: (() => void) | undefined;

    setup()
      .then((cleanup) => {
        removeListeners = cleanup;
      })
      .catch((error) => {
        console.error("Blobverse WebGL setup failed", error);
      });

  return {
    dispose: () => {
      cancelled = true;
      removeListeners?.();
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(raf);
      composer?.dispose?.();
      if (renderer?.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer?.dispose();
      if (overlayRenderer?.domElement.parentNode) {
        overlayRenderer.domElement.parentNode.removeChild(overlayRenderer.domElement);
      }
      overlayRenderer?.dispose();
      textures.forEach((texture) => texture.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach(disposeMaterial);
    }
  };
}
