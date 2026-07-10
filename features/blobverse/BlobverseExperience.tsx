"use client";

import { Loader } from "@/components/Loader/Loader";
import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./blobverse.module.scss";
import { ScrollSceneExperience } from "./sections/ScrollSceneExperience";
import { BlobverseChrome } from "./sections/BlobverseChrome";
import type { BlobverseInteraction } from "./blobverse-scenes";

type Phase = "loading" | "entering" | "idle";
const loaderAssets = ["/images/purple16.webp"] as const;

export function BlobverseExperience() {
  const [phase, setPhase] = useState<Phase>("loading");
  const reducedMotion = useReducedMotion();
  const progressRef = useRef(0);
  const interactionRef = useRef<BlobverseInteraction>({ hoveringBubble: false, lastPopAt: 0, pointerX: 0, pointerY: 0, popX: 0, popY: 0 });
  const ready = phase !== "loading";
  const motionOK = reducedMotion !== true;

  const handleLoaderComplete = useCallback(() => {
    setPhase("entering");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.blobversePage = "true";
    document.body.dataset.blobversePage = "true";

    return () => {
      delete document.documentElement.dataset.blobversePage;
      delete document.body.dataset.blobversePage;
    };
  }, []);

  useEffect(() => {
    if (phase !== "loading") {
      return;
    }

    const timeout = window.setTimeout(() => setPhase("entering"), 7600);

    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "entering") {
      return;
    }

    const timeout = window.setTimeout(() => setPhase("idle"), 620);

    return () => window.clearTimeout(timeout);
  }, [phase]);

  return (
    <main className={styles.blobversePage} data-phase={phase} id="top">
      {phase === "loading" ? <Loader assets={loaderAssets} minDisplayMs={800} onComplete={handleLoaderComplete} /> : null}
      <BlobverseChrome ready={ready} />
      <ScrollSceneExperience interactionRef={interactionRef} motionOK={motionOK} progressRef={progressRef} ready={ready} />
    </main>
  );
}
