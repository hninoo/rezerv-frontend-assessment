import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";

import { blobverseScenes } from "../blobverse-scenes";
import styles from "../blobverse.module.scss";

export function BlobverseChrome({ ready }: { ready: boolean }) {
  const [activeScene, setActiveScene] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const liveId = useId();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

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

  const goToScene = (index: number) => {
    window.dispatchEvent(new CustomEvent("blobverse:navigate", { detail: { index } }));
    setMenuOpen(false);
  };

  return (
    <motion.header
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: -18 }}
      className={styles.chromeHeader}
      data-blobverse-chrome=""
      initial={false}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        aria-label="Return to BLOBVERSE opening scene"
        className={styles.brandMark}
        onClick={() => goToScene(0)}
        type="button"
      >
        <span>BLOBVERSE</span>
      </button>
      <button
        aria-controls={menuId}
        aria-describedby={liveId}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close BLOBVERSE scene menu" : "Open BLOBVERSE scene menu"}
        className={styles.menuPill}
        data-open={menuOpen ? "true" : undefined}
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>
      <span className={styles.sceneLive} id={liveId} aria-live="polite">
        Scene {activeScene + 1} of {blobverseScenes.length}: {blobverseScenes[activeScene]?.kicker}
      </span>
      <AnimatePresence>
        {menuOpen ? (
          <motion.nav
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label="BLOBVERSE scenes"
            className={styles.sceneMenu}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            id={menuId}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className={styles.sceneMenuTitle}>Scenes</p>
            <p className={styles.sceneMenuHelp}>Scroll, swipe, or use arrow keys. Choose a scene for direct access.</p>
            <div className={styles.sceneMenuList}>
              {blobverseScenes.map((scene, index) => {
                const isCurrent = activeScene === index;

                return (
                  <button
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Go to scene ${index + 1}: ${scene.title.replace(/\n/g, " ")}`}
                    className={styles.sceneMenuButton}
                    data-current={isCurrent ? "true" : undefined}
                    key={scene.id}
                    onClick={() => goToScene(index)}
                    type="button"
                  >
                    <span className={styles.sceneMenuIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.sceneMenuText}>
                      <strong>{scene.kicker}</strong>
                      <em>{scene.title.replace(/\n/g, " ")}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
