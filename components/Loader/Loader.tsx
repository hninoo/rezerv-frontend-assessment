"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import styles from "./Loader.module.scss";

export interface LoaderProps {
  assets?: readonly string[];
  blobSrc?: string;
  minDisplayMs?: number;
  onComplete: () => void;
}

const defaultBlobSrc = "/images/purple16.webp";
const exitDurationMs = 760;
const reducedExitDurationMs = 220;
const imageLoadTimeoutMs = 3500;
const readinessTimeoutMs = 4200;
const maxDisplayMs = 6200;

function resolveWithTimeout(task: Promise<void>, timeoutMs = readinessTimeoutMs) {
  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, timeoutMs);

    task.then(
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      () => {
        window.clearTimeout(timeout);
        resolve();
      }
    );
  });
}

function loadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, imageLoadTimeoutMs);

    image.decoding = "async";
    image.onload = () => {
      if (typeof image.decode === "function") {
        image.decode().then(finish, finish);
        return;
      }

      finish();
    };
    image.onerror = finish;
    image.src = src;
  });
}

function waitForWindowLoad() {
  return resolveWithTimeout(new Promise<void>((resolve) => {
    if (document.readyState === "complete") {
      resolve();
      return;
    }

    window.addEventListener("load", () => resolve(), { once: true });
  }));
}

function waitForFonts() {
  if ("fonts" in document && document.fonts?.ready) {
    return resolveWithTimeout(document.fonts.ready.then(() => undefined, () => undefined));
  }

  return Promise.resolve();
}

export function Loader({ assets = [], blobSrc = defaultBlobSrc, minDisplayMs = 800, onComplete }: LoaderProps) {
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const progressRef = useRef(0);
  const measuredProgressRef = useRef(0);
  const readyRef = useRef(false);
  const exitStartedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const reducedMotionRef = useRef(false);
  const assetKey = useMemo(() => Array.from(new Set([blobSrc, ...assets])).filter(Boolean).join("\n"), [assets, blobSrc]);

  const blobStyle = useMemo(
    () =>
      ({
        "--blob": `url("${blobSrc}")`,
        "--progress": displayedProgress / 100
      }) as CSSProperties,
    [blobSrc, displayedProgress]
  );

  const particleStyles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 18 - Math.PI / 2;
        const distance = 54 + (index % 4) * 14;

        return {
          "--delay": `${(index % 5) * 18}ms`,
          "--x": `${(Math.cos(angle) * distance).toFixed(2)}px`,
          "--y": `${(Math.sin(angle) * distance).toFixed(2)}px`
        } as CSSProperties;
      }),
    []
  );

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => {
      reducedMotionRef.current = mediaQuery.matches;
    };

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let exitTimer = 0;
    let maxDisplayTimer = 0;
    const startedAt = performance.now();
    const uniqueAssets = assetKey.split("\n").filter(Boolean);
    const tasks = [waitForWindowLoad(), waitForFonts(), ...uniqueAssets.map((asset) => loadImage(asset))];
    const taskCount = Math.max(tasks.length, 1);
    let completedTasks = 0;

    const markTaskComplete = () => {
      completedTasks += 1;
      measuredProgressRef.current = Math.max(measuredProgressRef.current, (completedTasks / taskCount) * 100);

      if (completedTasks >= taskCount) {
        readyRef.current = true;
      }
    };

    tasks.forEach((task) => {
      task.then(markTaskComplete, markTaskComplete);
    });

    const startExit = () => {
      if (exitStartedRef.current || cancelled) {
        return;
      }

      exitStartedRef.current = true;
      setDisplayedProgress(100);
      setExiting(true);

      const duration = reducedMotionRef.current ? reducedExitDurationMs : exitDurationMs;

      exitTimer = window.setTimeout(() => {
        onCompleteRef.current();
      }, duration);
    };

    maxDisplayTimer = window.setTimeout(() => {
      readyRef.current = true;
      progressRef.current = 100;
      setDisplayedProgress(100);
      startExit();
    }, Math.max(maxDisplayMs, minDisplayMs));

    const tick = (now: number) => {
      if (cancelled) {
        return;
      }

      const elapsed = now - startedAt;
      const minimumDisplayMet = elapsed >= minDisplayMs;
      const forceComplete = elapsed >= maxDisplayMs;

      if (forceComplete) {
        readyRef.current = true;
      }

      const fallbackProgress = readyRef.current ? 100 : 90 * (1 - Math.pow(2, -elapsed / 700));
      const measuredProgress = Math.max(measuredProgressRef.current, Math.min(90, fallbackProgress));
      const target = readyRef.current && minimumDisplayMet ? 100 : Math.min(99, measuredProgress);
      const current = progressRef.current;
      const eased = current + (target - current) * (reducedMotionRef.current ? 0.32 : 0.095);
      const nextProgress = forceComplete ? 100 : Math.max(current, target === 100 && eased > 99.55 ? 100 : eased);

      progressRef.current = nextProgress;
      setDisplayedProgress((previous) => {
        const rounded = Math.round(nextProgress);

        return previous === rounded ? previous : rounded;
      });

      if (nextProgress >= 100 && readyRef.current && minimumDisplayMet) {
        startExit();
        return;
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(exitTimer);
      window.clearTimeout(maxDisplayTimer);
    };
  }, [assetKey, minDisplayMs]);

  return (
    <div
      aria-label="Loading BLOBVERSE"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={displayedProgress}
      className={styles.loader}
      data-exiting={exiting}
      role="progressbar"
      style={blobStyle}
    >
      <div aria-hidden="true" className={styles.bloom} />
      <div className={styles.blobWrap}>
        <div className={styles.blob}>
          <div className={styles.blobImage} />
          <div className={styles.blobSweep} />
        </div>
        <div aria-hidden="true" className={styles.particles}>
          {particleStyles.map((style, index) => (
            <span className={styles.particle} key={index} style={style} />
          ))}
        </div>
      </div>
      <div className={styles.progressHud}>
        <p className={styles.counter}>Loading</p>
        <span aria-hidden="true" className={styles.progressTrack}>
          <span className={styles.progressFill} />
        </span>
      </div>
    </div>
  );
}
