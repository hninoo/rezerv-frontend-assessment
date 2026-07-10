"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import styles from "../blobverse.module.scss";
import type { BlobverseInteraction } from "../blobverse-scenes";

interface BubblePopAffordanceProps {
  interactionRef: MutableRefObject<BlobverseInteraction>;
  motionOK: boolean;
}

const communitySceneIndex = 1;

export function BubblePopAffordance({ interactionRef, motionOK }: BubblePopAffordanceProps) {
  const popRef = useRef<HTMLSpanElement>(null);
  const lastPopRef = useRef(0);
  const [activeScene, setActiveScene] = useState(() => {
    if (typeof document === "undefined") {
      return 0;
    }

    const current = Number(document.body.dataset.glSection);

    return Number.isFinite(current) ? current : 0;
  });
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const onSectionChange = (event: Event) => {
      const index = Number((event as CustomEvent<{ sectionIndex?: number }>).detail?.sectionIndex);

      if (Number.isFinite(index)) {
        setActiveScene(index);
      }
    };

    window.addEventListener("blobverse:section-change", onSectionChange);

    return () => window.removeEventListener("blobverse:section-change", onSectionChange);
  }, []);

  useEffect(() => {
    const pop = popRef.current;

    if (!pop) {
      return;
    }

    let raf = 0;

    const flashPop = (x: number, y: number) => {
      gsap.killTweensOf(pop);
      gsap.set(pop, {
        autoAlpha: 1,
        scale: 0.72,
        x,
        y
      });
      gsap.timeline()
        .to(pop, { duration: motionOK ? 0.2 : 0, ease: "back.out(2.6)", scale: 1.15, y: y - 18 })
        .to(pop, { autoAlpha: 0, duration: motionOK ? 0.2 : 0, ease: "power2.out", y: y - 32 }, "-=0.04");
    };

    const frame = () => {
      const interaction = interactionRef.current;
      const active = activeScene === communitySceneIndex;
      const x = (interaction.pointerX ?? 0) + 24;
      const y = (interaction.pointerY ?? 0) - 20;

      setAnnouncement(active && interaction.hoveringBubble ? "Bubble ready. Click to pop." : "");

      const lastPopAt = interaction.lastPopAt ?? 0;

      if (active && lastPopAt > lastPopRef.current) {
        lastPopRef.current = lastPopAt;
        flashPop(interaction.popX ?? x, interaction.popY ?? y);
      }

      raf = window.requestAnimationFrame(frame);
    };

    gsap.set(pop, { autoAlpha: 0 });
    raf = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(raf);
      gsap.killTweensOf(pop);
    };
  }, [activeScene, interactionRef, motionOK]);

  return (
    <>
      <span aria-hidden="true" className={styles.bubblePopBurst} ref={popRef}>
        pop!
      </span>
      <div className={styles.bubbleTouchHint} data-active={activeScene === communitySceneIndex ? "true" : undefined}>
        Tap a bubble to pop
      </div>
      <span className={styles.sceneLive}>{announcement}</span>
    </>
  );
}
