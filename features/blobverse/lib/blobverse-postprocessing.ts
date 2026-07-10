import type * as Three from "three";
import type { PerspectiveCamera, Scene, WebGLRenderer } from "three";

type ThreeRuntime = typeof Three;

export interface BlobversePostprocessing {
  bokehPass: { enabled: boolean; uniforms: Record<string, { value: number }> } | null;
  composer: { render(): void; setSize(width: number, height: number): void; dispose?(): void } | null;
}

interface PostprocessingOptions {
  THREE: ThreeRuntime;
  aperture: number;
  bloomRadius: number;
  bloomStrength: number;
  bloomThreshold: number;
  camera: PerspectiveCamera;
  focus: number;
  maxBlur: number;
  renderer: WebGLRenderer;
  scene: Scene;
}

export async function createBlobversePostprocessing({
  THREE,
  aperture,
  bloomRadius,
  bloomStrength,
  bloomThreshold,
  camera,
  focus,
  maxBlur,
  renderer,
  scene
}: PostprocessingOptions): Promise<BlobversePostprocessing> {
  try {
    const [{ EffectComposer }, { RenderPass }, { BokehPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import("three/examples/jsm/postprocessing/EffectComposer.js"),
      import("three/examples/jsm/postprocessing/RenderPass.js"),
      import("three/examples/jsm/postprocessing/BokehPass.js"),
      import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
      import("three/examples/jsm/postprocessing/OutputPass.js")
    ]);

    const composer = new EffectComposer(renderer);
    const bokehPass = new BokehPass(scene, camera, {
      aperture,
      focus,
      maxblur: maxBlur
    });
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), bloomStrength, bloomRadius, bloomThreshold);

    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bokehPass);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    return {
      bokehPass: bokehPass as unknown as { enabled: boolean; uniforms: Record<string, { value: number }> },
      composer
    };
  } catch {
    return {
      bokehPass: null,
      composer: null
    };
  }
}
