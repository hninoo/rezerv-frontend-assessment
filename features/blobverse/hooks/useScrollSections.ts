"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import Lenis from "lenis";

export interface ScrollSectionState {
  sectionIndex: number;
  localProgress: number;
  global: number;
}

interface UseScrollSectionsOptions {
  motionOK: boolean;
  onInteracted?: () => void;
  progressBarRef: RefObject<HTMLElement | null>;
  progressRef: MutableRefObject<number>;
  ready: boolean;
  rootRef: RefObject<HTMLElement | null>;
  scrollStateRef: MutableRefObject<ScrollSectionState>;
  sectionCount: number;
  sectionLength?: number;
  spacerRef: RefObject<HTMLElement | null>;
}

const initialScrollState: ScrollSectionState = {
  global: 0,
  localProgress: 0,
  sectionIndex: 0
};

export const virtualSectionLength = 1.4;
export const butteryScrollDuration = 1.4;
export const butteryScrollEase = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));
export const slideTransitionDuration = 0.82;

const slideInputCooldownMs = 760;
const wheelIntentThreshold = 18;
const touchIntentThreshold = 34;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function wrap(value: number, length: number) {
  return ((value % length) + length) % length;
}

function parkChars(chars: HTMLElement[]) {
  chars.forEach((char) => {
    char.style.opacity = "0";
    char.style.transform = "translate3d(0, 14px, 0)";
  });
}

function revealChars(chars: HTMLElement[], localProgress: number, time: number, motionOK: boolean, slideMode: boolean) {
  if (!motionOK) {
    chars.forEach((char) => {
      char.style.opacity = "1";
      char.style.transform = "translate3d(0, 0, 0)";
    });

    return;
  }

  chars.forEach((char, index) => {
    const delay = slideMode ? Math.min(index * 0.006, 0.22) : index * 0.012;
    const enterDuration = slideMode ? 0.28 : 0.25;
    const enter = easeOutCubic(clamp((localProgress - delay) / enterDuration, 0, 1));
    const exit = slideMode ? 0 : easeOutCubic(clamp((localProgress - 0.75 + delay * 0.18) / 0.25, 0, 1));
    const idleWave = enter > 0.98 && exit < 0.02 ? Math.sin(time * 1.5 + index * 0.35) * 2.5 : 0;
    const y = (1 - enter) * 14 + exit * 16 + idleWave;
    const opacity = clamp(enter * (1 - exit), 0, 1);

    char.style.opacity = opacity.toFixed(3);
    char.style.transform = `translate3d(0, ${y.toFixed(3)}px, 0)`;
  });
}

export function useScrollSections({
  motionOK,
  onInteracted,
  progressBarRef,
  progressRef,
  ready,
  rootRef,
  scrollStateRef,
  sectionCount,
  sectionLength = virtualSectionLength,
  spacerRef
}: UseScrollSectionsOptions) {
  const lenisRef = useRef<Lenis | null>(null);
  const activeSectionRef = useRef(0);
  const dimensionsRef = useRef({ scrollDistance: 1, spacerHeight: 1 });
  const previousSectionRef = useRef(-1);
  const sectionElsRef = useRef<HTMLElement[]>([]);
  const charGroupsRef = useRef<HTMLElement[][]>([]);
  const settledFloatRef = useRef(0);
  const slideLockUntilRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const transitionRef = useRef<{
    fromFloat: number;
    startedAt: number;
    targetFloat: number;
    targetSection: number;
  } | null>(null);
  const [state, setState] = useState<ScrollSectionState>(initialScrollState);

  const setSpacerHeight = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const scrollDistance = Math.max(1, sectionCount * viewportHeight * sectionLength);
    const spacerHeight = scrollDistance + viewportHeight;

    dimensionsRef.current = { scrollDistance, spacerHeight };

    if (spacerRef.current) {
      spacerRef.current.style.height = `${spacerHeight}px`;
    }

    lenisRef.current?.resize();
  }, [sectionCount, sectionLength, spacerRef]);

  const collectSections = useCallback(() => {
    const root = rootRef.current;

    if (!root) {
      sectionElsRef.current = [];
      charGroupsRef.current = [];

      return;
    }

    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-section]"));

    sectionElsRef.current = sections;
    charGroupsRef.current = sections.map((section) => Array.from(section.querySelectorAll<HTMLElement>("[data-char]")));
  }, [rootRef]);

  const publishState = useCallback(
    (next: ScrollSectionState) => {
      progressRef.current = next.global;
      scrollStateRef.current = next;

      const sectionKey = String(next.sectionIndex);

      if (document.body.dataset.glSection !== sectionKey) {
        document.body.dataset.glSection = sectionKey;
      }

      if (next.sectionIndex !== previousSectionRef.current) {
        previousSectionRef.current = next.sectionIndex;
        window.dispatchEvent(new CustomEvent("blobverse:section-change", { detail: next }));

        sectionElsRef.current.forEach((section, index) => {
          const visible = index === next.sectionIndex;
          const visibility = visible ? "true" : "false";

          if (section.dataset.sectionVisibility !== visibility) {
            section.dataset.sectionVisibility = visibility;
            section.setAttribute("aria-hidden", visible ? "false" : "true");
          }

          if (!visible) {
            parkChars(charGroupsRef.current[index] ?? []);
          }
        });

        setState(next);
      }
    },
    [progressRef, scrollStateRef]
  );

  const applySlideFrame = useCallback(
    (sectionIndex: number, localProgress: number, virtualFloat: number, time: number) => {
      const global = virtualFloat / sectionCount;
      const loopedProgress = wrap(virtualFloat, sectionCount) / sectionCount;
      const next = { global, localProgress, sectionIndex };

      publishState(next);
      rootRef.current?.style.setProperty("--scene-progress", String(loopedProgress));
      rootRef.current?.style.setProperty("--section-local-progress", String(localProgress));
      progressBarRef.current?.style.setProperty("transform", `scaleX(${loopedProgress})`);
      revealChars(charGroupsRef.current[sectionIndex] ?? [], localProgress, time, motionOK, true);
    },
    [motionOK, progressBarRef, publishState, rootRef, sectionCount]
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    setSpacerHeight();
    collectSections();

    const onResize = () => {
      setSpacerHeight();
      collectSections();
    };

    window.addEventListener("resize", onResize, { passive: true });

    const slideDurationMs = motionOK ? slideTransitionDuration * 1000 : 0;
    let raf = 0;

    const lenis = new Lenis({
      duration: slideTransitionDuration,
      easing: butteryScrollEase,
      infinite: true,
      smoothWheel: false,
      touchMultiplier: 1.4,
      wheelMultiplier: 0.9
    });

    lenisRef.current = lenis;

    const scrollNativeToFloat = (targetFloat: number) => {
      const targetSectionFloat = wrap(targetFloat, sectionCount);
      const target = targetSectionFloat * window.innerHeight * sectionLength;

      if (motionOK) {
        lenis.scrollTo(target, { duration: slideTransitionDuration, easing: butteryScrollEase });
      } else {
        window.scrollTo({ behavior: "auto", top: target });
      }
    };

    const startTransition = (direction: number) => {
      const now = performance.now();

      if (now < slideLockUntilRef.current || direction === 0) {
        return;
      }

      const fromFloat = settledFloatRef.current;
      const targetFloat = fromFloat + direction;
      const targetSection = wrap(Math.round(targetFloat), sectionCount);

      activeSectionRef.current = targetSection;
      transitionRef.current = {
        fromFloat,
        startedAt: now,
        targetFloat,
        targetSection
      };
      slideLockUntilRef.current = now + slideInputCooldownMs;
      onInteracted?.();
      scrollNativeToFloat(targetFloat);
      applySlideFrame(targetSection, 0, fromFloat, now / 1000);
    };

    const startAbsoluteTransition = (targetSection: number) => {
      const currentIndex = wrap(Math.round(settledFloatRef.current), sectionCount);
      let direction = wrap(targetSection, sectionCount) - currentIndex;

      if (direction > sectionCount / 2) {
        direction -= sectionCount;
      } else if (direction < -sectionCount / 2) {
        direction += sectionCount;
      }

      startTransition(direction);
    };

    const onSceneNavigate = (event: Event) => {
      const index = Number((event as CustomEvent<{ index?: number }>).detail?.index);

      if (!Number.isFinite(index)) {
        return;
      }

      startAbsoluteTransition(clamp(Math.round(index), 0, sectionCount - 1));
    };

    const onWheel = (event: WheelEvent) => {
      const intent = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

      event.preventDefault();
      event.stopPropagation();

      if (Math.abs(intent) < wheelIntentThreshold) {
        return;
      }

      startTransition(intent > 0 ? 1 : -1);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const startY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY;

      event.preventDefault();
      event.stopPropagation();

      if (startY == null || currentY == null) {
        return;
      }

      const delta = startY - currentY;

      if (Math.abs(delta) < touchIntentThreshold) {
        return;
      }

      touchStartYRef.current = null;
      startTransition(delta > 0 ? 1 : -1);
    };

    const onTouchEnd = () => {
      touchStartYRef.current = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.target instanceof HTMLElement && event.target.closest("[data-blobverse-chrome]")) {
        return;
      }

      const nextKeys = ["ArrowDown", "ArrowRight", "PageDown"];
      const previousKeys = ["ArrowUp", "ArrowLeft", "PageUp"];

      if (event.key === " " && event.shiftKey) {
        event.preventDefault();
        startTransition(-1);
      } else if (event.key === " " || nextKeys.includes(event.key)) {
        event.preventDefault();
        startTransition(1);
      } else if (previousKeys.includes(event.key)) {
        event.preventDefault();
        startTransition(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        startAbsoluteTransition(0);
      } else if (event.key === "End") {
        event.preventDefault();
        startAbsoluteTransition(sectionCount - 1);
      }
    };

    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    window.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blobverse:navigate", onSceneNavigate);

    const frame = (time: number) => {
      lenis.raf(time);

      const transition = transitionRef.current;

      if (transition) {
        const rawProgress = slideDurationMs === 0 ? 1 : clamp((time - transition.startedAt) / slideDurationMs, 0, 1);
        const easedProgress = motionOK ? easeOutCubic(rawProgress) : 1;
        const virtualFloat = transition.fromFloat + (transition.targetFloat - transition.fromFloat) * easedProgress;

        applySlideFrame(transition.targetSection, easedProgress, virtualFloat, time / 1000);

        if (rawProgress >= 1) {
          settledFloatRef.current = transition.targetFloat;
          activeSectionRef.current = transition.targetSection;
          transitionRef.current = null;
          applySlideFrame(transition.targetSection, 1, transition.targetFloat, time / 1000);
        }
      } else {
        applySlideFrame(activeSectionRef.current, 1, settledFloatRef.current, time / 1000);
      }

      raf = window.requestAnimationFrame(frame);
    };

    applySlideFrame(activeSectionRef.current, 1, settledFloatRef.current, performance.now() / 1000);
    raf = window.requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("touchend", onTouchEnd, { capture: true });
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blobverse:navigate", onSceneNavigate);
      window.cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
      delete document.body.dataset.glSection;
    };
  }, [applySlideFrame, collectSections, motionOK, onInteracted, ready, sectionCount, sectionLength, setSpacerHeight]);

  const scrollToSection = useCallback(
    (index: number) => {
      const targetSection = clamp(index, 0, sectionCount - 1);
      const target = targetSection * window.innerHeight * sectionLength;

      onInteracted?.();
      activeSectionRef.current = targetSection;
      settledFloatRef.current = targetSection;
      transitionRef.current = null;
      applySlideFrame(targetSection, 1, targetSection, performance.now() / 1000);

      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, { duration: slideTransitionDuration, easing: butteryScrollEase });
      } else {
        window.scrollTo({ behavior: motionOK ? "smooth" : "auto", top: target });
      }
    },
    [applySlideFrame, motionOK, onInteracted, sectionCount, sectionLength]
  );

  return {
    lenisRef,
    scrollState: state,
    scrollStateRef,
    scrollToSection
  };
}
