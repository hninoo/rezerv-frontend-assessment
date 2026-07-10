"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

import { createBlobverseStage } from "./scene/createBlobverseStage";
import type { BlobverseInteraction } from "./blobverse-scenes";
import styles from "./blobverse.module.scss";
import type { ScrollSectionState } from "./hooks/useScrollSections";

interface BlobverseWebglStageProps {
  interactionRef: MutableRefObject<BlobverseInteraction>;
  motionOK: boolean;
  progressRef: MutableRefObject<number>;
  ready: boolean;
  scrollStateRef: MutableRefObject<ScrollSectionState>;
}

export function BlobverseWebglStage({ interactionRef, motionOK, progressRef, ready, scrollStateRef }: BlobverseWebglStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = createBlobverseStage({ interactionRef, motionOK, mountRef, progressRef, scrollStateRef });

    return stage.dispose;
  }, [interactionRef, motionOK, progressRef, scrollStateRef]);

  return <div aria-hidden="true" className={styles.webglStage} data-ready={ready} ref={mountRef} />;
}
