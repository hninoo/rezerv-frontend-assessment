"use client";

import { useEffect, useRef } from "react";

type SectionTextTag = "h2" | "p" | "span";

interface SectionTextProps {
  as: SectionTextTag;
  className?: string;
  text: string;
}

const headlineColorStops = [
  { color: [255, 179, 71], stop: 0 },
  { color: [255, 95, 162], stop: 0.4 },
  { color: [91, 216, 230], stop: 0.72 },
  { color: [142, 107, 255], stop: 1 }
] as const;

function mixChannel(start: number, end: number, amount: number) {
  return Math.round(start + (end - start) * amount);
}

function headlineCharColor(index: number, total: number) {
  const progress = total <= 1 ? 0 : index / (total - 1);
  const nextStopIndex = headlineColorStops.findIndex((entry) => progress <= entry.stop);
  const endIndex = nextStopIndex === -1 ? headlineColorStops.length - 1 : nextStopIndex;
  const startIndex = Math.max(0, endIndex - 1);
  const start = headlineColorStops[startIndex];
  const end = headlineColorStops[endIndex];
  const span = Math.max(0.001, end.stop - start.stop);
  const amount = Math.min(1, Math.max(0, (progress - start.stop) / span));
  const red = mixChannel(start.color[0], end.color[0], amount);
  const green = mixChannel(start.color[1], end.color[1], amount);
  const blue = mixChannel(start.color[2], end.color[2], amount);

  return `rgb(${red}, ${green}, ${blue})`;
}

export function splitChars(element: HTMLElement) {
  if (element.dataset.splitReady === "true") {
    return Array.from(element.querySelectorAll<HTMLElement>("[data-char]"));
  }

  const text = element.dataset.rawText ?? element.textContent ?? "";
  const chars: HTMLElement[] = [];
  const paintableChars = Array.from(text).filter((char) => char !== "\n");
  let charIndex = 0;

  element.textContent = "";
  element.setAttribute("aria-label", text.replace(/\s+/g, " ").trim());

  Array.from(text).forEach((char) => {
    if (char === "\n") {
      element.appendChild(document.createElement("br"));
      return;
    }

    const span = document.createElement("span");

    span.dataset.char = "";
    span.setAttribute("aria-hidden", "true");
    span.style.display = "inline-block";
    span.style.opacity = "0";
    span.style.transform = "translate3d(0, 14px, 0)";
    span.style.setProperty("--char-color", headlineCharColor(charIndex, paintableChars.length));
    span.textContent = char === " " ? "\u00A0" : char;

    element.appendChild(span);
    chars.push(span);
    charIndex += 1;
  });

  element.dataset.splitReady = "true";

  return chars;
}

export function SectionText({ as, className, text }: SectionTextProps) {
  const textRef = useRef<HTMLElement>(null);

  const setTextRef = (node: HTMLHeadingElement | HTMLParagraphElement | HTMLSpanElement | null) => {
    textRef.current = node;
  };

  useEffect(() => {
    if (!textRef.current) {
      return;
    }

    textRef.current.dataset.splitReady = "false";
    splitChars(textRef.current);
  }, [text]);

  const sharedProps = {
    className,
    "data-raw-text": text,
    "data-split-text": "",
    suppressHydrationWarning: true
  };

  if (as === "h2") {
    return (
      <h2 {...sharedProps} ref={setTextRef}>
        {text}
      </h2>
    );
  }

  if (as === "span") {
    return (
      <span {...sharedProps} ref={setTextRef}>
        {text}
      </span>
    );
  }

  return (
    <p {...sharedProps} ref={setTextRef}>
      {text}
    </p>
  );
}
