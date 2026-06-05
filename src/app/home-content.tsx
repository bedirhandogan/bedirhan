"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import bubbleMessageIcon from "../../assets/bubble-message-2.svg";
import handIcon from "../../assets/hand-3.svg";
import linkedInIcon from "../../assets/linkedin.svg";
import mouseIcon from "../../assets/mouse.svg";
import xIcon from "../../assets/x.svg";
import styles from "./page.module.css";
import { ShotFrame } from "./shot-frame";
import { ShotsCanvas } from "./shots-canvas";

export function HomeContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCanvasVisible, setIsCanvasVisible] = useState(false);
  const [isShotsVisible, setIsShotsVisible] = useState(false);
  const [canvasSession, setCanvasSession] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );
  const shotsTimerRef = useRef<number | null>(null);

  const showShots = useCallback(() => {
    setCanvasSession((currentSession) => currentSession + 1);
    setIsCanvasVisible(true);
    shotsTimerRef.current = window.setTimeout(() => {
      setIsShotsVisible(true);
      shotsTimerRef.current = null;
    }, 300);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
    }, 1300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (isCanvasVisible) {
        return;
      }

      if (Math.abs(event.deltaY) < 12) {
        return;
      }

      event.preventDefault();
      if (event.deltaY > 0) {
        showShots();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [isCanvasVisible, showShots]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.pointerType !== "touch" ||
        !event.isPrimary ||
        isLoading ||
        isCanvasVisible
      ) {
        return;
      }

      if ((event.target as Element).closest("a, button")) {
        return;
      }

      touchStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const touchStart = touchStartRef.current;

      if (
        event.pointerType !== "touch" ||
        !touchStart ||
        touchStart.pointerId !== event.pointerId ||
        isLoading ||
        isCanvasVisible
      ) {
        touchStartRef.current = null;
        return;
      }

      const deltaX = event.clientX - touchStart.x;
      const deltaY = event.clientY - touchStart.y;
      touchStartRef.current = null;

      if (deltaY < -52 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
        showShots();
      }
    };

    const handlePointerCancel = () => {
      touchStartRef.current = null;
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [isCanvasVisible, isLoading, showShots]);

  useEffect(() => {
    return () => {
      if (shotsTimerRef.current) {
        window.clearTimeout(shotsTimerRef.current);
      }
    };
  }, []);

  const handleCanvasBack = () => {
    if (shotsTimerRef.current) {
      window.clearTimeout(shotsTimerRef.current);
      shotsTimerRef.current = null;
    }

    setIsShotsVisible(false);
    setIsCanvasVisible(false);
  };

  return (
    <div className={styles.home} data-name="Home">
      {isLoading ? (
        <div className={styles.loader} aria-label="Loading">
          <div className={styles.loaderTrack}>
            <span className={styles.loaderFill} />
          </div>
        </div>
      ) : null}

      <main
        className={`${styles.shell} ${
          isLoading || isCanvasVisible ? styles.shellHidden : ""
        } ${isCanvasVisible ? styles.shellScrolled : ""}`}
      >
        <section
          className={`${styles.scrollSection} ${styles.revealBlock} ${
            isLoading ? "" : styles.revealFirst
          }`}
          aria-label="Scroll preview"
        >
          <div className={styles.scrollLabel}>
            <Image
              aria-hidden="true"
              className={`${styles.cueIcon} ${styles.desktopCueIcon}`}
              src={mouseIcon}
              alt=""
              width={18}
              height={18}
            />
            <Image
              aria-hidden="true"
              className={`${styles.cueIcon} ${styles.mobileCueIcon}`}
              src={handIcon}
              alt=""
              width={18}
              height={18}
            />
            <p>
              <span className={styles.desktopCue}>Scroll to Shots</span>
              <span className={styles.mobileCue}>Swipe to Shots</span>
            </p>
          </div>

          <ShotFrame />
        </section>

        <section
          className={`${styles.content} ${styles.revealBlock} ${
            isLoading ? "" : styles.revealSecond
          }`}
          aria-label="Intro"
        >
          <div className={styles.copyBlock}>
            <h1>
              <span>Wagwan, I&apos;m Bedirhan, a </span>
              <span className={styles.strike}>digital</span>
              <span> designer</span>
              <span>.</span>
            </h1>
            <p>
              <span>I design </span>
              <strong>web</strong>
              <span>, </span>
              <strong>product</strong>
              <span>, </span>
              <strong>brand</strong>
              <span>, and </span>
              <strong>motion </strong>
              <span>
                experiences,
                <br className={styles.desktopLineBreak} aria-hidden />
                combining aesthetics and functionality.
              </span>
            </p>
          </div>

          <div className={styles.actions}>
            <a
              className={styles.primaryButton}
              href="https://cal.com/bedirhandogan/30min"
              target="_blank"
              rel="noreferrer"
            >
              <Image
                aria-hidden="true"
                className={styles.buttonIcon}
                src={bubbleMessageIcon}
                alt=""
                width={18}
                height={18}
              />
              <span>Get In Touch</span>
            </a>

            <a
              className={styles.iconButton}
              href="https://www.linkedin.com/in/bedirhandogan"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <Image
                aria-hidden="true"
                className={styles.socialIcon}
                src={linkedInIcon}
                alt=""
                width={16}
                height={16}
              />
            </a>

            <a
              className={styles.iconButton}
              href="https://x.com/bedirhandogn"
              target="_blank"
              rel="noreferrer"
              aria-label="X"
            >
              <Image
                aria-hidden="true"
                className={styles.socialIcon}
                src={xIcon}
                alt=""
                width={16}
                height={16}
              />
            </a>
          </div>
        </section>
      </main>

      <ShotsCanvas
        key={canvasSession}
        isVisible={!isLoading && isShotsVisible}
        onBack={handleCanvasBack}
      />
    </div>
  );
}
