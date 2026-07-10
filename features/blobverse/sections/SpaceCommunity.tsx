import { SceneOverlay } from "./SceneOverlay";
import type { BlobverseScene } from "../blobverse-scenes";

export function SpaceCommunity({ scene }: { scene: BlobverseScene }) {
  return <SceneOverlay scene={scene} />;
}
