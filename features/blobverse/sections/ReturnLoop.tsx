import { SceneOverlay } from "./SceneOverlay";
import type { BlobverseScene } from "../blobverse-scenes";

export function ReturnLoop({ scene }: { scene: BlobverseScene }) {
  return <SceneOverlay scene={scene} />;
}
