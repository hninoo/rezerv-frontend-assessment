import type { ReactNode } from "react";

import { blobverseScenes, type BlobverseScene } from "../blobverse-scenes";
import styles from "../blobverse.module.scss";
import { SectionText } from "./SectionText";

interface SceneOverlayProps {
  children?: ReactNode;
  scene: BlobverseScene;
}

const totalScenes = String(blobverseScenes.length).padStart(2, "0");

export function SceneOverlay({ children, scene }: SceneOverlayProps) {
  const sectionIndex = blobverseScenes.findIndex((item) => item.id === scene.id);
  const order = String(sectionIndex + 1).padStart(2, "0");
  const openingTitleLines = scene.kind === "opening" ? scene.title.split("\n") : [];

  return (
    <article
      aria-hidden="true"
      className={styles.scenePanel}
      data-scene-kind={scene.kind}
      data-scene-theme={scene.theme}
      data-section={sectionIndex}
      data-section-visibility="false"
      data-blobverse-panel=""
    >
      <div className={styles.sceneTopline}>
        <span className={styles.sceneTag}>
          <i className={styles.sceneTagDot} />
          {scene.kicker}
        </span>
        <span className={styles.sceneProgressMark}>
          <span className={styles.sceneDots}>
            {blobverseScenes.map((item, index) => (
              <b
                key={item.id}
                data-done={index <= sectionIndex ? "true" : undefined}
                data-current={index === sectionIndex ? "true" : undefined}
              />
            ))}
          </span>
          <span className={styles.sceneCount}>
            <b>{order}</b>
            <span>/</span>
            <em>{totalScenes}</em>
          </span>
        </span>
      </div>
      <div className={styles.sceneCopy}>
        {scene.kind === "opening" ? (
          <div aria-hidden="true" className={styles.openingTitleArt}>
            {openingTitleLines.map((line, index) => (
              <span key={`${line}-${index}`}>
                {line}
              </span>
            ))}
          </div>
        ) : null}
        <SectionText as="h2" text={scene.title} />
        <SectionText as="p" text={scene.body} />
      </div>
      {children}
    </article>
  );
}
