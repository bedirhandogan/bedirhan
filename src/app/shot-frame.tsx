 "use client";

import { useSquircle } from "@cornerkit/react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const frameShape = {
  outer: {
    width: 424,
    height: 238.5,
    radius: 32,
    image: "url('/frame-glass.webp')",
  },
  inner: {
    inset: 10,
    radius: 24,
    fill: "transparent",
  },
  shadow:
    "drop-shadow(0 28px 18px rgb(0 0 0 / 4%)) " +
    "drop-shadow(0 14px 12px rgb(0 0 0 / 7%)) " +
    "drop-shadow(0 4px 6px rgb(0 0 0 / 8%))",
} as const;

export function ShotFrame() {
  const forwardVideoRef = useRef<HTMLVideoElement>(null);
  const reverseVideoRef = useRef<HTMLVideoElement>(null);
  const [activeVideo, setActiveVideo] = useState<"forward" | "reverse">(
    "forward",
  );
  const surfaceRef = useSquircle<HTMLDivElement>({
    radius: frameShape.inner.radius,
    smoothing: 1,
  });

  useEffect(() => {
    const video =
      activeVideo === "forward"
        ? forwardVideoRef.current
        : reverseVideoRef.current;

    if (!video) {
      return;
    }

    const otherVideo =
      activeVideo === "forward"
        ? reverseVideoRef.current
        : forwardVideoRef.current;

    if (otherVideo) {
      otherVideo.pause();
      otherVideo.currentTime = 0;
    }

    video.currentTime = 0;
    const playPromise = video.play();

    if (playPromise) {
      playPromise.catch(() => {
        // Muted inline video should autoplay; ignore browser race conditions.
      });
    }

    const handleEnded = () => {
      setActiveVideo(activeVideo === "forward" ? "reverse" : "forward");
    };

    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("ended", handleEnded);
    };
  }, [activeVideo]);

  const frameStyle = {
    "--frame-width": `${frameShape.outer.width}px`,
    "--frame-height": `${frameShape.outer.height}px`,
    "--frame-radius": `${frameShape.outer.radius}px`,
    "--frame-image": frameShape.outer.image,
    "--frame-shadow": frameShape.shadow,
    "--surface-inset": `${frameShape.inner.inset}px`,
    "--surface-radius": `${frameShape.inner.radius}px`,
    "--surface-fill": frameShape.inner.fill,
  } as CSSProperties;

  return (
    <div className={styles.animationFrameShell} style={frameStyle}>
      <div className={styles.animationImage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/frame-glass.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      </div>
      <div ref={surfaceRef} className={styles.animationSurface}>
        <video
          ref={forwardVideoRef}
          className={`${styles.octopusVideo} ${
            activeVideo === "forward" ? styles.isActiveVideo : ""
          }`}
          src="/octopus.webm"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          disablePictureInPicture
        />
        <video
          ref={reverseVideoRef}
          className={`${styles.octopusVideo} ${
            activeVideo === "reverse" ? styles.isActiveVideo : ""
          }`}
          src="/octopus-reverse.webm"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          disablePictureInPicture
        />
      </div>
    </div>
  );
}
