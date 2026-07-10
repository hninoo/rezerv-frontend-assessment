import type * as THREE from "three";
import type { BufferGeometry, Color, Group, Material } from "three";

import { easeOutCubic } from "../lib/blobverse-math";

interface CreateBlobversePopEffectsParams {
  THREE: typeof THREE;
  bubbleGroup: Group;
  geometries: BufferGeometry[];
  materials: Material[];
  whiteColor: Color;
}

export function createBlobversePopEffects({
  THREE,
  bubbleGroup,
  geometries,
  materials,
  whiteColor
}: CreateBlobversePopEffectsParams) {
  const particleMax = 320;
  const dropletGeometry = new THREE.SphereGeometry(0.055, 8, 8);
  const dropletMaterial = new THREE.MeshBasicMaterial({ depthWrite: false, toneMapped: false, transparent: true });
  const droplets = new THREE.InstancedMesh(dropletGeometry, dropletMaterial, particleMax);
  const dropletDummy = new THREE.Object3D();
  const dropletColor = new THREE.Color();
  const dropletState = Array.from({ length: particleMax }, () => ({
    active: false,
    life: 0,
    maxLife: 1,
    size: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    x: 0,
    y: 0,
    z: 0
  }));
  let dropletCursor = 0;

  geometries.push(dropletGeometry);
  materials.push(dropletMaterial);
  droplets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  droplets.frustumCulled = false;
  dropletDummy.scale.setScalar(0);
  dropletDummy.updateMatrix();

  for (let index = 0; index < particleMax; index += 1) {
    droplets.setMatrixAt(index, dropletDummy.matrix);
  }

  droplets.instanceMatrix.needsUpdate = true;
  bubbleGroup.add(droplets);

  const ringGeometry = new THREE.RingGeometry(0.72, 1, 48);

  geometries.push(ringGeometry);

  const ringPool = Array.from({ length: 8 }, () => {
    const ringMaterial = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
      depthWrite: false,
      opacity: 0,
      side: THREE.DoubleSide,
      toneMapped: false,
      transparent: true
    });

    ringMaterial.userData.baseOpacity = 0;
    materials.push(ringMaterial);

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);

    ring.visible = false;
    ring.userData.life = 0;
    bubbleGroup.add(ring);

    return ring;
  });
  let ringCursor = 0;

  function spawnBurst(x: number, y: number, z: number, tint: Color) {
    const count = 26 + Math.floor(Math.random() * 12);

    for (let index = 0; index < count; index += 1) {
      const slot = dropletState[dropletCursor];
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.6 + Math.random() * 2.4;

      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = Math.sin(phi) * Math.cos(theta) * speed;
      slot.vy = Math.cos(phi) * speed + 0.6;
      slot.vz = Math.sin(phi) * Math.sin(theta) * speed * 0.6;
      slot.maxLife = 0.45 + Math.random() * 0.35;
      slot.life = slot.maxLife;
      slot.size = 0.5 + Math.random() * 0.8;
      slot.active = true;
      dropletColor.copy(tint).lerp(whiteColor, 0.35 + Math.random() * 0.5);
      droplets.setColorAt(dropletCursor, dropletColor);
      dropletCursor = (dropletCursor + 1) % particleMax;
    }

    if (droplets.instanceColor) {
      droplets.instanceColor.needsUpdate = true;
    }
  }

  function spawnRing(x: number, y: number, z: number, tint: Color) {
    const ring = ringPool[ringCursor];

    ringCursor = (ringCursor + 1) % ringPool.length;
    ring.position.set(x, y, z);
    ring.scale.setScalar(0.4);
    ring.visible = true;
    ring.userData.life = 0.5;
    (ring.material as THREE.MeshBasicMaterial).color.copy(tint).lerp(whiteColor, 0.5);
  }

  function updateParticles(delta: number) {
    let changed = false;

    for (let index = 0; index < particleMax; index += 1) {
      const particle = dropletState[index];

      if (!particle.active) {
        continue;
      }

      particle.life -= delta;

      if (particle.life <= 0) {
        particle.active = false;
        dropletDummy.position.set(0, 0, 0);
        dropletDummy.scale.setScalar(0);
        dropletDummy.updateMatrix();
        droplets.setMatrixAt(index, dropletDummy.matrix);
        changed = true;
        continue;
      }

      particle.vy -= 4.5 * delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.z += particle.vz * delta;
      dropletDummy.position.set(particle.x, particle.y, particle.z);
      dropletDummy.scale.setScalar(Math.max(0, particle.size * easeOutCubic(Math.min(1, particle.life / particle.maxLife))));
      dropletDummy.rotation.set(0, 0, 0);
      dropletDummy.updateMatrix();
      droplets.setMatrixAt(index, dropletDummy.matrix);
      changed = true;
    }

    if (changed) {
      droplets.instanceMatrix.needsUpdate = true;
    }
  }

  function updateRings(delta: number) {
    for (const ring of ringPool) {
      if (!ring.visible) {
        continue;
      }

      ring.userData.life = (ring.userData.life as number) - delta;

      const life = ring.userData.life as number;
      const material = ring.material as THREE.MeshBasicMaterial;

      if (life <= 0) {
        ring.visible = false;
        material.userData.baseOpacity = 0;
        continue;
      }

      const progress = 1 - life / 0.5;

      ring.scale.setScalar(0.4 + easeOutCubic(progress) * 2.6);
      ring.rotation.z += delta * 1.2;
      material.userData.baseOpacity = (1 - progress) * 0.7;
    }
  }

  return {
    dispose: () => droplets.dispose(),
    spawnBurst,
    spawnRing,
    updateParticles,
    updateRings
  };
}
