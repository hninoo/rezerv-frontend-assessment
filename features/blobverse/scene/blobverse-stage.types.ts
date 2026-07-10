import type { MutableRefObject } from "react";

import type { BlobverseInteraction } from "../blobverse-scenes";
import type { ScrollSectionState } from "../hooks/useScrollSections";

export interface BlobverseStageParams {
  interactionRef: MutableRefObject<BlobverseInteraction>;
  motionOK: boolean;
  mountRef: MutableRefObject<HTMLDivElement | null>;
  progressRef: MutableRefObject<number>;
  scrollStateRef: MutableRefObject<ScrollSectionState>;
}

export interface BlobverseStageHandle {
  dispose: () => void;
}
