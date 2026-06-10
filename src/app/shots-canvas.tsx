"use client";

import { Squircle } from "@cornerkit/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent,
  WheelEvent,
} from "react";
import arrowLeftCircleIcon from "../../assets/arrow-left-circle.svg";
import crossCircleIcon from "../../assets/cross-circle.svg";
import styles from "./page.module.css";
import type { Shot } from "./shots-data";
import { getShotThumbnail } from "./shots-data";
import { shots } from "./shots-data";

const card = {
  width: 520,
  height: 390,
  radius: 32,
  gap: 24,
} as const;

const shotPattern = {
  rowStep: 1,
  columnStep: 4,
} as const;

const revealStartDelay = 100;
const cardSettleDuration = 420;
const backButtonLeaveDuration = 480;
const fallbackViewport = {
  width: 1440,
  height: 900,
} as const;

type CanvasOffset = {
  x: number;
  y: number;
};

type CanvasMetrics = {
  cardWidth: number;
  cardHeight: number;
  columnGap: number;
  rowGap: number;
  stepX: number;
  stepY: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  moveThreshold: number;
  didMove: boolean;
};

type VirtualCard = {
  centerDistance: number;
  column: number;
  key: string;
  left: number;
  row: number;
  shotIndex: number;
  top: number;
  visibleArea: number;
};

type ShotsCanvasProps = {
  isVisible: boolean;
  onBack: () => void;
};

const initialOffset = {
  x: 0,
  y: 0,
} as const;

const fallbackMetrics = {
  cardWidth: card.width,
  cardHeight: card.height,
  columnGap: card.gap,
  rowGap: card.gap,
  stepX: card.width + card.gap,
  stepY: card.height + card.gap,
} as const;

function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length;
}

function getCardKey(row: number, column: number) {
  return `${row}:${column}`;
}

function getCardLayout(
  row: number,
  column: number,
  {
    cardHeight,
    cardWidth,
    stepX,
    stepY,
  }: Pick<CanvasMetrics, "cardHeight" | "cardWidth" | "stepX" | "stepY">,
) {
  const brickOffset = row % 2 === 0 ? 0 : stepX / 2;

  return {
    left: column * stepX + brickOffset - cardWidth / 2,
    top: row * stepY - cardHeight / 2,
  };
}

function getShotIndexForPosition(row: number, column: number) {
  if (shots.length === 0) {
    return null;
  }

  return positiveModulo(
    row * shotPattern.rowStep + column * shotPattern.columnStep,
    shots.length,
  );
}

function getCanvasMetrics(canvas: HTMLElement | null): CanvasMetrics {
  const cardElement = canvas?.querySelector<HTMLElement>("[data-canvas-card]");
  const canvasStyles = canvas ? window.getComputedStyle(canvas) : null;
  const columnGap = Number.parseFloat(
    canvasStyles?.getPropertyValue("--shot-gap") ?? "",
  );
  const rowGap = Number.parseFloat(
    canvasStyles?.getPropertyValue("--shot-gap") ?? "",
  );
  const cardWidth = cardElement?.offsetWidth ?? card.width;
  const cardHeight = cardElement?.offsetHeight ?? card.height;
  const normalizedColumnGap = Number.isFinite(columnGap) ? columnGap : card.gap;
  const normalizedRowGap = Number.isFinite(rowGap) ? rowGap : card.gap;

  return {
    cardWidth,
    cardHeight,
    columnGap: normalizedColumnGap,
    rowGap: normalizedRowGap,
    stepX: cardWidth + normalizedColumnGap,
    stepY: cardHeight + normalizedRowGap,
  };
}

function getVisibleArea({
  bottom,
  left,
  right,
  top,
  viewportHeight,
  viewportWidth,
}: {
  bottom: number;
  left: number;
  right: number;
  top: number;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const visibleWidth = Math.max(
    0,
    Math.min(right, viewportWidth) - Math.max(left, 0),
  );
  const visibleHeight = Math.max(
    0,
    Math.min(bottom, viewportHeight) - Math.max(top, 0),
  );

  return visibleWidth * visibleHeight;
}

function getVirtualCardKeys(cardsToCompare: VirtualCard[]) {
  return cardsToCompare.map(({ key, shotIndex }) => `${key}:${shotIndex}`).join("|");
}

function buildVirtualCards({
  metrics,
  offset,
  viewportHeight,
  viewportWidth,
}: {
  metrics: CanvasMetrics;
  offset: CanvasOffset;
  viewportHeight: number;
  viewportWidth: number;
}) {
  if (shots.length === 0) {
    return [];
  }

  const viewportWorldLeft = -offset.x - viewportWidth / 2;
  const viewportWorldRight = -offset.x + viewportWidth / 2;
  const viewportWorldTop = -offset.y - viewportHeight / 2;
  const viewportWorldBottom = -offset.y + viewportHeight / 2;
  const rowStart =
    Math.floor((viewportWorldTop - metrics.cardHeight) / metrics.stepY) - 1;
  const rowEnd =
    Math.ceil((viewportWorldBottom + metrics.cardHeight) / metrics.stepY) + 1;
  const columnStart =
    Math.floor(
      (viewportWorldLeft - metrics.cardWidth - metrics.stepX / 2) /
        metrics.stepX,
    ) - 1;
  const columnEnd =
    Math.ceil(
      (viewportWorldRight + metrics.cardWidth + metrics.stepX / 2) /
        metrics.stepX,
    ) + 1;
  const candidates: VirtualCard[] = [];

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let column = columnStart; column <= columnEnd; column += 1) {
      const shotIndex = getShotIndexForPosition(row, column);

      if (shotIndex === null) {
        continue;
      }

      const { left, top } = getCardLayout(row, column, metrics);
      const screenLeft = viewportWidth / 2 + offset.x + left;
      const screenTop = viewportHeight / 2 + offset.y + top;
      const screenRight = screenLeft + metrics.cardWidth;
      const screenBottom = screenTop + metrics.cardHeight;
      const visibleArea = getVisibleArea({
        bottom: screenBottom,
        left: screenLeft,
        right: screenRight,
        top: screenTop,
        viewportHeight,
        viewportWidth,
      });

      if (visibleArea <= 0) {
        continue;
      }

      candidates.push({
        centerDistance: Math.hypot(
          screenLeft + metrics.cardWidth / 2 - viewportWidth / 2,
          screenTop + metrics.cardHeight / 2 - viewportHeight / 2,
        ),
        column,
        key: getCardKey(row, column),
        left,
        row,
        shotIndex,
        top,
        visibleArea,
      });
    }
  }

  const usedShotIndexes = new Set<number>();

  return candidates
    .sort((first, second) => {
      if (second.visibleArea !== first.visibleArea) {
        return second.visibleArea - first.visibleArea;
      }

      if (first.centerDistance !== second.centerDistance) {
        return first.centerDistance - second.centerDistance;
      }

      if (first.top !== second.top) {
        return first.top - second.top;
      }

      return first.left - second.left;
    })
    .filter(({ shotIndex }) => {
      if (usedShotIndexes.has(shotIndex)) {
        return false;
      }

      usedShotIndexes.add(shotIndex);
      return true;
    })
    .sort((first, second) => {
      if (first.top !== second.top) {
        return first.top - second.top;
      }

      return first.left - second.left;
    });
}

function applyCanvasOffset(canvas: HTMLElement | null, offset: CanvasOffset) {
  canvas?.style.setProperty("--canvas-x", `${offset.x}px`);
  canvas?.style.setProperty("--canvas-y", `${offset.y}px`);
}

function formatPathNumber(value: number) {
  const roundedValue = Math.round(value * 100) / 100;

  return Object.is(roundedValue, -0) ? "0" : `${roundedValue}`;
}

function getSquircleInsetPath(width: number, height: number, radius: number) {
  if (width <= 0 || height <= 0 || radius <= 0) {
    return [
      "M 0 0",
      `L ${formatPathNumber(width)} 0`,
      `L ${formatPathNumber(width)} ${formatPathNumber(height)}`,
      `L 0 ${formatPathNumber(height)}`,
      "Z",
    ].join(" ");
  }

  const cornerRadius = Math.min(radius, width / 2, height / 2);
  const cornerReach = cornerRadius * 2;
  const curveHandle =
    cornerRadius * Math.tan(Math.PI / 8) * Math.SQRT1_2;
  const softHandle = (cornerReach - curveHandle * 2) / 3;
  const longHandle = softHandle * 2;
  const curveEnd = longHandle + softHandle + curveHandle;

  return [
    `M ${formatPathNumber(width - cornerReach)} 0`,
    `c ${formatPathNumber(longHandle)} 0 ${formatPathNumber(
      longHandle + softHandle,
    )} 0 ${formatPathNumber(curveEnd)} ${formatPathNumber(curveHandle)}`,
    `c ${formatPathNumber(curveHandle)} ${formatPathNumber(
      curveHandle,
    )} ${formatPathNumber(curveHandle)} ${formatPathNumber(
      softHandle + curveHandle,
    )} ${formatPathNumber(curveHandle)} ${formatPathNumber(curveEnd)}`,
    `L ${formatPathNumber(width)} ${formatPathNumber(height - cornerReach)}`,
    `c 0 ${formatPathNumber(longHandle)} 0 ${formatPathNumber(
      longHandle + softHandle,
    )} ${formatPathNumber(-curveHandle)} ${formatPathNumber(curveEnd)}`,
    `c ${formatPathNumber(-curveHandle)} ${formatPathNumber(
      curveHandle,
    )} ${formatPathNumber(-(softHandle + curveHandle))} ${formatPathNumber(
      curveHandle,
    )} ${formatPathNumber(-curveEnd)} ${formatPathNumber(curveHandle)}`,
    `L ${formatPathNumber(cornerReach)} ${formatPathNumber(height)}`,
    `c ${formatPathNumber(-longHandle)} 0 ${formatPathNumber(
      -(longHandle + softHandle),
    )} 0 ${formatPathNumber(-curveEnd)} ${formatPathNumber(-curveHandle)}`,
    `c ${formatPathNumber(-curveHandle)} ${formatPathNumber(
      -curveHandle,
    )} ${formatPathNumber(-curveHandle)} ${formatPathNumber(
      -(softHandle + curveHandle),
    )} ${formatPathNumber(-curveHandle)} ${formatPathNumber(-curveEnd)}`,
    `L 0 ${formatPathNumber(cornerReach)}`,
    `c 0 ${formatPathNumber(-longHandle)} 0 ${formatPathNumber(
      -(longHandle + softHandle),
    )} ${formatPathNumber(curveHandle)} ${formatPathNumber(-curveEnd)}`,
    `c ${formatPathNumber(curveHandle)} ${formatPathNumber(
      -curveHandle,
    )} ${formatPathNumber(softHandle + curveHandle)} ${formatPathNumber(
      -curveHandle,
    )} ${formatPathNumber(curveEnd)} ${formatPathNumber(-curveHandle)}`,
    "Z",
  ].join(" ");
}

function getDurationInMilliseconds(duration: string) {
  const normalizedDuration = duration.trim();
  const durationValue = Number.parseFloat(normalizedDuration);

  if (!Number.isFinite(durationValue)) {
    return 0;
  }

  return normalizedDuration.endsWith("ms")
    ? durationValue
    : durationValue * 1000;
}

function getCanvasExitDuration(canvas: HTMLElement | null) {
  const revealedCards = Array.from(
    canvas?.querySelectorAll<HTMLElement>("[data-card-revealed='true']") ?? [],
  );
  const lastCardDelay = revealedCards.reduce((latestDelay, cardElement) => {
    const cardDelay = cardElement.style.getPropertyValue("--card-delay");

    return Math.max(latestDelay, getDurationInMilliseconds(cardDelay));
  }, 0);

  return Math.max(
    lastCardDelay + cardSettleDuration,
    backButtonLeaveDuration,
  );
}

function getShotFromCardElement(cardElement: HTMLElement | null | undefined) {
  const shotIndex = Number(cardElement?.dataset.shotIndex);

  if (!Number.isInteger(shotIndex)) {
    return null;
  }

  return shots[shotIndex] ?? null;
}

function getShotFromElementPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY);
  const cardElement = element?.closest<HTMLElement>("[data-shot-card='true']");
  const directShot = getShotFromCardElement(cardElement);

  if (directShot) {
    return directShot;
  }

  const shotCards = Array.from(
    document.querySelectorAll<HTMLElement>("[data-shot-card='true']"),
  );
  const matchingCards = shotCards
    .map((shotCard) => {
      const rect = shotCard.getBoundingClientRect();

      return {
        rect,
        shot: getShotFromCardElement(shotCard),
      };
    })
    .filter(({ rect, shot }) => {
      const hitPadding = 8;

      return (
        shot &&
        clientX >= rect.left - hitPadding &&
        clientX <= rect.right + hitPadding &&
        clientY >= rect.top - hitPadding &&
        clientY <= rect.bottom + hitPadding
      );
    })
    .sort((first, second) => {
      const firstDistance = Math.hypot(
        clientX - (first.rect.left + first.rect.width / 2),
        clientY - (first.rect.top + first.rect.height / 2),
      );
      const secondDistance = Math.hypot(
        clientX - (second.rect.left + second.rect.width / 2),
        clientY - (second.rect.top + second.rect.height / 2),
      );

      return firstDistance - secondDistance;
    });

  return matchingCards[0]?.shot ?? null;
}

function SquircleInsetBorder({ radius }: { radius: number }) {
  const borderRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState<{
    height: number;
    width: number;
  }>({
    width: card.width,
    height: card.height,
  });

  useEffect(() => {
    const borderElement = borderRef.current;
    const cardElement = borderElement?.parentElement;

    if (!borderElement || !cardElement) {
      return;
    }

    const updateDimensions = () => {
      const { clientHeight: height, clientWidth: width } = cardElement;

      if (width <= 0 || height <= 0) {
        return;
      }

      setDimensions((currentDimensions) =>
        Math.abs(currentDimensions.width - width) < 0.5 &&
        Math.abs(currentDimensions.height - height) < 0.5
          ? currentDimensions
          : { width, height },
      );
    };
    const observer = new ResizeObserver(updateDimensions);

    updateDimensions();
    observer.observe(cardElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <svg
      ref={borderRef}
      className={styles.canvasCardBorder}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className={styles.canvasCardBorderPath}
        d={getSquircleInsetPath(dimensions.width, dimensions.height, radius)}
      />
    </svg>
  );
}

function ShotCanvasCard({
  cardData,
  isCanvasVisible,
  onPressStart,
}: {
  cardData: VirtualCard;
  isCanvasVisible: boolean;
  onPressStart: (shot: Shot) => void;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealDelay, setRevealDelay] = useState(0);
  const shot = shots[cardData.shotIndex];

  useEffect(() => {
    if (!isCanvasVisible) {
      return;
    }

    const element = elementRef.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const rect = entry.boundingClientRect;
          const cardCenterX = rect.left + rect.width / 2;
          const cardCenterY = rect.top + rect.height / 2;
          const viewportCenterX = window.innerWidth / 2;
          const viewportCenterY = window.innerHeight / 2;
          const distance = Math.hypot(
            cardCenterX - viewportCenterX,
            cardCenterY - viewportCenterY,
          );

          setRevealDelay(revealStartDelay + Math.round(distance * 0.36));
          setIsRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        threshold: 0.18,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isCanvasVisible]);

  if (!shot) {
    return null;
  }

  return (
    <Squircle
      ref={elementRef}
      radius={card.radius}
      smoothing={1}
      data-canvas-card="true"
      data-card-revealed={isRevealed ? "true" : undefined}
      className={`${styles.canvasCard} ${styles.canvasCardHasData} ${
        isRevealed ? styles.canvasCardRevealed : ""
      }`}
      data-shot-card="true"
      data-shot-index={cardData.shotIndex}
      role="button"
      tabIndex={0}
      onPointerDown={() => {
        onPressStart(shot);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        onPressStart(shot);
      }}
      style={
        {
          "--card-delay": `${revealDelay}ms`,
          "--card-x": `${cardData.left}px`,
          "--card-y": `${cardData.top}px`,
        } as CSSProperties
      }
    >
      <Image
        className={styles.canvasCardImage}
        src={getShotThumbnail(shot)}
        alt={shot.alt}
        fill
        sizes="(max-width: 560px) min(360px, calc(100vw - 40px)), 520px"
        quality={100}
        unoptimized
        draggable={false}
      />
      <div className={styles.canvasCardBlur} aria-hidden="true" />
      <div className={styles.canvasCardMeta}>
        <p className={styles.canvasCardTitle}>{shot.title}</p>
        <p className={styles.canvasCardSubtitle}>{shot.subtitle}</p>
      </div>
      <SquircleInsetBorder radius={card.radius} />
    </Squircle>
  );
}

export function ShotsCanvas({ isVisible, onBack }: ShotsCanvasProps) {
  const canvasRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const offsetRef = useRef<CanvasOffset>(initialOffset);
  const pressedShotRef = useRef<Shot | null>(null);
  const virtualFrameRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [virtualCards, setVirtualCards] = useState(() =>
    buildVirtualCards({
      metrics: fallbackMetrics,
      offset: initialOffset,
      viewportHeight: fallbackViewport.height,
      viewportWidth: fallbackViewport.width,
    }),
  );
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);

  const updateVirtualCards = useCallback(() => {
    const nextVirtualCards = buildVirtualCards({
      metrics: getCanvasMetrics(canvasRef.current),
      offset: offsetRef.current,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    });

    setVirtualCards((currentVirtualCards) =>
      getVirtualCardKeys(currentVirtualCards) ===
      getVirtualCardKeys(nextVirtualCards)
        ? currentVirtualCards
        : nextVirtualCards,
    );
  }, []);

  const requestVirtualCardsUpdate = useCallback(() => {
    if (virtualFrameRef.current !== null) {
      return;
    }

    virtualFrameRef.current = window.requestAnimationFrame(() => {
      virtualFrameRef.current = null;
      updateVirtualCards();
    });
  }, [updateVirtualCards]);

  useEffect(() => {
    const handleResize = () => {
      updateVirtualCards();
    };

    updateVirtualCards();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateVirtualCards]);

  useEffect(() => {
    return () => {
      if (virtualFrameRef.current !== null) {
        window.cancelAnimationFrame(virtualFrameRef.current);
      }

      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isLeaving) {
      return;
    }

    pressedShotRef.current =
      getShotFromElementPoint(event.clientX, event.clientY) ??
      pressedShotRef.current;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      moveThreshold: event.pointerType === "touch" ? 10 : 4,
      didMove: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (Math.hypot(deltaX, deltaY) > drag.moveThreshold) {
      drag.didMove = true;
    }

    const nextOffset = {
      x: drag.offsetX + deltaX,
      y: drag.offsetY + deltaY,
    };

    offsetRef.current = nextOffset;
    applyCanvasOffset(canvasRef.current, nextOffset);
    requestVirtualCardsUpdate();
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    const tappedShot =
      getShotFromElementPoint(event.clientX, event.clientY) ??
      pressedShotRef.current;

    if (!drag.didMove && tappedShot) {
      setIsModalClosing(false);
      setSelectedShot(tappedShot);
    }

    pressedShotRef.current = null;
    window.setTimeout(() => {
      dragRef.current = null;
    }, 0);
    setIsDragging(false);
    requestVirtualCardsUpdate();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    pressedShotRef.current = null;
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleBack = () => {
    if (isLeaving) {
      return;
    }

    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
    }

    pressedShotRef.current = null;
    dragRef.current = null;
    setIsDragging(false);
    setIsLeaving(true);

    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      onBack();
    }, getCanvasExitDuration(canvasRef.current));
  };

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (!isVisible || isLeaving || event.ctrlKey || event.deltaY >= -12) {
      return;
    }

    event.preventDefault();
    handleBack();
  };

  const handleCloseShot = () => {
    setIsModalClosing(true);
    window.setTimeout(() => {
      setSelectedShot(null);
      setIsModalClosing(false);
    }, 300);
  };

  return (
    <section
      ref={canvasRef}
      className={`${styles.shotsCanvas} ${
        isVisible ? styles.shotsCanvasVisible : ""
      } ${isDragging ? styles.shotsCanvasDragging : ""} ${
        isLeaving ? styles.shotsCanvasLeaving : ""
      }`}
      aria-label="Shots canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onWheel={handleWheel}
    >
      <div className={styles.canvasGrid} data-canvas-grid="true">
        {virtualCards.map((virtualCard) => (
          <ShotCanvasCard
            key={virtualCard.key}
            cardData={virtualCard}
            isCanvasVisible={isVisible && !isLeaving}
            onPressStart={(shot) => {
              pressedShotRef.current = shot;
            }}
          />
        ))}
      </div>

      {selectedShot ? (
        <div
          className={`${styles.shotOverlay} ${
            isModalClosing ? styles.shotOverlayClosing : ""
          }`}
          onPointerDown={(event) => {
            event.stopPropagation();

            if (event.target === event.currentTarget) {
              handleCloseShot();
            }
          }}
        >
          <Squircle
            radius={32}
            smoothing={1}
            className={`${styles.shotModal} ${
              isModalClosing ? styles.shotModalClosing : ""
            }`}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Image
              className={styles.shotModalImage}
              src={getShotThumbnail(selectedShot)}
              alt={selectedShot.alt}
              fill
              sizes="min(1040px, calc(100vw - 96px))"
              loading="eager"
              quality={100}
              unoptimized
              draggable={false}
            />
          </Squircle>

          <button
            className={`${styles.canvasBackButton} ${styles.canvasCloseButton}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleCloseShot();
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Image
              aria-hidden="true"
              className={styles.canvasBackIcon}
              src={crossCircleIcon}
              alt=""
              width={18}
              height={18}
            />
            <span>Close</span>
          </button>
        </div>
      ) : (
        <button
          className={`${styles.canvasBackButton} ${
            isLeaving ? styles.canvasBackButtonLeaving : ""
          }`}
          type="button"
          disabled={isLeaving}
          onClick={handleBack}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Image
            aria-hidden="true"
            className={styles.canvasBackIcon}
            src={arrowLeftCircleIcon}
            alt=""
            width={18}
            height={18}
          />
          <span>Back</span>
        </button>
      )}
    </section>
  );
}
