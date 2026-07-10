"use client";

import { useRef } from "react";
import type { MutableRefObject, ReactNode } from "react";

import { useScrollSections, type ScrollSectionState } from "../hooks/useScrollSections";
import { BlobverseWebglStage } from "../BlobverseWebglStage";
import { blobverseScenes, type BlobverseInteraction, type BlobverseScene } from "../blobverse-scenes";
import styles from "../blobverse.module.scss";
import { BubblePopAffordance } from "./BubblePopAffordance";
import { OpeningCollage } from "./OpeningCollage";
import { ReturnLoop } from "./ReturnLoop";
import { SpaceCommunity } from "./SpaceCommunity";

interface ScrollSceneExperienceProps {
  interactionRef: MutableRefObject<BlobverseInteraction>;
  motionOK: boolean;
  progressRef: MutableRefObject<number>;
  ready: boolean;
}

const sceneCount = blobverseScenes.length;

function renderScene(scene: BlobverseScene, key: string): ReactNode {
  switch (scene.kind) {
    case "opening":
      return <OpeningCollage key={key} scene={scene} />;
    case "space":
      return <SpaceCommunity key={key} scene={scene} />;
    case "return":
      return <ReturnLoop key={key} scene={scene} />;
  }
}

export function ScrollSceneExperience({ interactionRef, motionOK, progressRef, ready }: ScrollSceneExperienceProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLSpanElement>(null);
  const scrollStateRef = useRef<ScrollSectionState>({ global: 0, localProgress: 0, sectionIndex: 0 });
  useScrollSections({
    motionOK,
    progressBarRef,
    progressRef,
    ready,
    rootRef: sceneRef,
    scrollStateRef,
    sectionCount: sceneCount,
    spacerRef
  });

  return (
    <section aria-label="BLOBVERSE scene sequence" className={styles.scrollScene} data-motion-ok={motionOK} ref={sceneRef}>
      <BlobverseWebglStage
        interactionRef={interactionRef}
        motionOK={motionOK}
        progressRef={progressRef}
        ready={ready}
        scrollStateRef={scrollStateRef}
      />
      <div aria-live="polite" className={styles.scrollContent}>
        {blobverseScenes.map((scene) => renderScene(scene, scene.id))}
      </div>
      <BubblePopAffordance interactionRef={interactionRef} motionOK={motionOK} />
      <div aria-hidden="true" className={styles.scrollSpacer} ref={spacerRef} />
      <div aria-hidden="true" className={styles.sceneProgress}>
        <span data-scene-progress="" ref={progressBarRef} />
      </div>
    </section>
  );
}
