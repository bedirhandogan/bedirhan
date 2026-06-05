"use client";

import { Squircle } from "@cornerkit/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

const columns = 9;
const rows = 9;
const cards = Array.from({ length: columns * rows }, (_, index) => index);
const revealStartDelay = 100;
const cardSettleDuration = 420;
const backButtonLeaveDuration = 480;
const fallbackViewport = {
  width: 1440,
  height: 900,
} as const;

type ShotPosition = {
  row: number;
  column: number;
};

function isInsideGrid(position: ShotPosition) {
  return (
    position.row >= 0 &&
    position.row < rows &&
    position.column >= 0 &&
    position.column < columns
  );
}

function getPositionKey(position: ShotPosition) {
  return `${position.row}:${position.column}`;
}

function getPositionAngle(position: ShotPosition, center: ShotPosition) {
  const rowOffset = position.row % 2 === 1 ? 0.5 : 0;
  const centerRowOffset = center.row % 2 === 1 ? 0.5 : 0;
  const x = position.column + rowOffset - (center.column + centerRowOffset);
  const y = (position.row - center.row) * ((card.height + card.gap) / (card.width + card.gap));
  const angle = Math.atan2(y, x);

  return angle < 0 ? angle + Math.PI * 2 : angle;
}

function sortPositionsByAngle(
  positions: ShotPosition[],
  center: ShotPosition,
  startAngle: number,
) {
  return [...positions].sort((first, second) => {
    const firstAngle =
      (getPositionAngle(first, center) - startAngle + Math.PI * 2) %
      (Math.PI * 2);
    const secondAngle =
      (getPositionAngle(second, center) - startAngle + Math.PI * 2) %
      (Math.PI * 2);

    return firstAngle - secondAngle;
  });
}

function buildPetalPositions() {
  const center = {
    row: Math.floor(rows / 2),
    column: Math.floor(columns / 2),
  };
  const positions: ShotPosition[] = [center];
  const maxRadius = Math.max(center.row, center.column);
  let ringStartAngle = 0;

  for (let radius = 1; radius <= maxRadius; radius += 1) {
    const ringPositions: ShotPosition[] = [];
    const seenRingPositions = new Set<string>();

    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (
        let columnOffset = -radius;
        columnOffset <= radius;
        columnOffset += 1
      ) {
        if (Math.max(Math.abs(rowOffset), Math.abs(columnOffset)) !== radius) {
          continue;
        }

        const position = {
          row: center.row + rowOffset,
          column: center.column + columnOffset,
        };
        const key = getPositionKey(position);

        if (!isInsideGrid(position) || seenRingPositions.has(key)) {
          continue;
        }

        seenRingPositions.add(key);
        ringPositions.push(position);
      }
    }

    const sortedRingPositions = sortPositionsByAngle(
      ringPositions,
      center,
      ringStartAngle,
    );

    positions.push(...sortedRingPositions);
    ringStartAngle = getPositionAngle(
      sortedRingPositions[sortedRingPositions.length - 1] ?? center,
      center,
    );
  }

  return positions;
}

const petalPositions = buildPetalPositions();

function getOrderedPositionKeys(positions: ShotPosition[]) {
  return positions.map(getPositionKey).join("|");
}

function buildVisibleFirstPositions({
  cardHeight,
  cardWidth,
  columnGap,
  rowGap,
  viewportHeight,
  viewportWidth,
}: {
  cardHeight: number;
  cardWidth: number;
  columnGap: number;
  rowGap: number;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const gridWidth = cardWidth * columns + columnGap * (columns - 1);
  const gridHeight = cardHeight * rows + rowGap * (rows - 1);
  const gridLeft = (viewportWidth - gridWidth) / 2;
  const gridTop = (viewportHeight - gridHeight) / 2;
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;

  return [...petalPositions]
    .map((position, fallbackIndex) => {
      const brickOffset =
        position.row % 2 === 1 ? (cardWidth + columnGap) / 2 : 0;
      const left = gridLeft + position.column * (cardWidth + columnGap) + brickOffset;
      const top = gridTop + position.row * (cardHeight + rowGap);
      const right = left + cardWidth;
      const bottom = top + cardHeight;
      const visibleWidth = Math.max(
        0,
        Math.min(right, viewportWidth) - Math.max(left, 0),
      );
      const visibleHeight = Math.max(
        0,
        Math.min(bottom, viewportHeight) - Math.max(top, 0),
      );
      const visibleArea = visibleWidth * visibleHeight;
      const centerX = left + cardWidth / 2;
      const centerY = top + cardHeight / 2;
      const centerDistance = Math.hypot(
        centerX - viewportCenterX,
        centerY - viewportCenterY,
      );

      return {
        fallbackIndex,
        position,
        centerDistance,
        top,
        left,
        visibleArea,
      };
    })
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

      if (first.left !== second.left) {
        return first.left - second.left;
      }

      return first.fallbackIndex - second.fallbackIndex;
    })
    .map(({ position }) => position);
}

function buildFallbackShotPositions() {
  return buildVisibleFirstPositions({
    cardHeight: card.height,
    cardWidth: card.width,
    columnGap: card.gap,
    rowGap: card.gap,
    viewportHeight: fallbackViewport.height,
    viewportWidth: fallbackViewport.width,
  });
}

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  wrapWidth: number;
  wrapHeight: number;
  moveThreshold: number;
  didMove: boolean;
};

type ShotsCanvasProps = {
  isVisible: boolean;
  onBack: () => void;
};

function wrapOffset(value: number, size: number) {
  return ((((value + size / 2) % size) + size) % size) - size / 2;
}

function getCanvasMetrics(canvas: HTMLElement | null) {
  const cardElement = canvas?.querySelector<HTMLElement>("[data-canvas-card]");
  const gridElement = canvas?.querySelector<HTMLElement>("[data-canvas-grid]");
  const gridRect = gridElement?.getBoundingClientRect();
  const gridStyles = gridElement ? window.getComputedStyle(gridElement) : null;
  const columnGap = Number.parseFloat(gridStyles?.columnGap ?? "");
  const rowGap = Number.parseFloat(gridStyles?.rowGap ?? "");
  const cardWidth = cardElement?.offsetWidth ?? card.width;
  const cardHeight = cardElement?.offsetHeight ?? card.height;
  const normalizedColumnGap = Number.isFinite(columnGap) ? columnGap : card.gap;
  const normalizedRowGap = Number.isFinite(rowGap) ? rowGap : card.gap;
  const gridLayoutWidth =
    cardWidth * columns + normalizedColumnGap * (columns - 1);
  const gridScale =
    gridRect && gridLayoutWidth > 0 ? gridRect.width / gridLayoutWidth : 1;

  return {
    cardWidth,
    cardHeight,
    columnGap: normalizedColumnGap,
    gridLeft: gridRect?.left ?? 0,
    gridScale,
    gridTop: gridRect?.top ?? 0,
    rowGap: normalizedRowGap,
    wrapWidth: (cardWidth + normalizedColumnGap) * columns,
    wrapHeight: (cardHeight + normalizedRowGap) * rows,
  };
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

function getShotIndexForIndex(index: number, shotPositions: ShotPosition[]) {
  const row = Math.floor(index / columns);
  const column = index % columns;

  return shotPositions.findIndex(
    (position) => position.row === row && position.column === column,
  );
}

function getShotForIndex(index: number, shotPositions: ShotPosition[]) {
  const shotIndex = getShotIndexForIndex(index, shotPositions);

  return shots[shotIndex];
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

function getShotFromCanvasPoint(
  canvas: HTMLElement | null,
  clientX: number,
  clientY: number,
  shotPositions: ShotPosition[],
) {
  if (!canvas) {
    return null;
  }

  const {
    cardHeight,
    cardWidth,
    columnGap,
    gridLeft,
    gridScale,
    gridTop,
    rowGap,
  } = getCanvasMetrics(canvas);

  const matchingShot = shotPositions
    .map((position, shotIndex) => {
      const brickOffset =
        position.row % 2 === 1 ? (cardWidth + columnGap) / 2 : 0;
      const left =
        gridLeft +
        (position.column * (cardWidth + columnGap) + brickOffset) * gridScale;
      const top =
        gridTop + position.row * (cardHeight + rowGap) * gridScale;
      const width = cardWidth * gridScale;
      const height = cardHeight * gridScale;

      return {
        bottom: top + height,
        centerX: left + width / 2,
        centerY: top + height / 2,
        left,
        right: left + width,
        shot: shots[shotIndex],
        top,
      };
    })
    .filter(
      ({ bottom, left, right, shot, top }) =>
        shot &&
        clientX >= left &&
        clientX <= right &&
        clientY >= top &&
        clientY <= bottom,
    )
    .sort((first, second) => {
      const firstDistance = Math.hypot(
        clientX - first.centerX,
        clientY - first.centerY,
      );
      const secondDistance = Math.hypot(
        clientX - second.centerX,
        clientY - second.centerY,
      );

      return firstDistance - secondDistance;
    })[0];

  return matchingShot?.shot ?? null;
}

function getShotFromPoint(
  canvas: HTMLElement | null,
  clientX: number,
  clientY: number,
  shotPositions: ShotPosition[],
) {
  return (
    getShotFromCanvasPoint(canvas, clientX, clientY, shotPositions) ??
    getShotFromElementPoint(clientX, clientY)
  );
}

function ShotCanvasCard({
  index,
  isCanvasVisible,
  onPressStart,
  shotPositions,
}: {
  index: number;
  isCanvasVisible: boolean;
  onPressStart: (shot: Shot) => void;
  shotPositions: ShotPosition[];
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealDelay, setRevealDelay] = useState(0);
  const shotIndex = getShotIndexForIndex(index, shotPositions);
  const shot = getShotForIndex(index, shotPositions);

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

  return (
    <Squircle
      ref={elementRef}
      radius={card.radius}
      smoothing={1}
      data-canvas-card="true"
      data-card-revealed={isRevealed ? "true" : undefined}
      className={`${styles.canvasCard} ${shot ? styles.canvasCardHasData : ""} ${
        isRevealed ? styles.canvasCardRevealed : ""
      }`}
      data-shot-card={shot ? "true" : undefined}
      data-shot-index={shot ? shotIndex : undefined}
      role={shot ? "button" : undefined}
      tabIndex={shot ? 0 : undefined}
      onPointerDown={() => {
        if (shot) {
          onPressStart(shot);
        }
      }}
      onKeyDown={(event) => {
        if (!shot || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }

        event.preventDefault();
        onPressStart(shot);
      }}
      style={
        {
          "--card-index": index,
          "--card-delay": `${revealDelay}ms`,
        } as CSSProperties
      }
    >
      <Squircle
        radius={card.radius - 2}
        smoothing={1}
        className={styles.canvasCardInner}
      >
        {shot ? (
          <>
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
          </>
        ) : null}
      </Squircle>
    </Squircle>
  );
}

export function ShotsCanvas({ isVisible, onBack }: ShotsCanvasProps) {
  const canvasRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const pressedShotRef = useRef<Shot | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [orderedShotPositions, setOrderedShotPositions] = useState(
    buildFallbackShotPositions,
  );
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);

  useEffect(() => {
    const updateShotPositions = () => {
      const {
        cardHeight,
        cardWidth,
        columnGap,
        rowGap,
      } = getCanvasMetrics(canvasRef.current);
      const nextPositions = buildVisibleFirstPositions({
        cardHeight,
        cardWidth,
        columnGap,
        rowGap,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      });

      setOrderedShotPositions((currentPositions) =>
        getOrderedPositionKeys(currentPositions) ===
        getOrderedPositionKeys(nextPositions)
          ? currentPositions
          : nextPositions,
      );
    };

    updateShotPositions();
    window.addEventListener("resize", updateShotPositions);

    return () => {
      window.removeEventListener("resize", updateShotPositions);
    };
  }, []);

  useEffect(() => {
    return () => {
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
      getShotFromPoint(
        canvasRef.current,
        event.clientX,
        event.clientY,
        orderedShotPositions,
      ) ??
      pressedShotRef.current;

    const { wrapWidth, wrapHeight } = getCanvasMetrics(canvasRef.current);

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      wrapWidth,
      wrapHeight,
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
      x: wrapOffset(drag.offsetX + deltaX, drag.wrapWidth),
      y: wrapOffset(drag.offsetY + deltaY, drag.wrapHeight),
    };

    offsetRef.current = nextOffset;
    canvasRef.current?.style.setProperty("--canvas-x", `${nextOffset.x}px`);
    canvasRef.current?.style.setProperty("--canvas-y", `${nextOffset.y}px`);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    const tappedShot =
      getShotFromPoint(
        canvasRef.current,
        event.clientX,
        event.clientY,
        orderedShotPositions,
      ) ??
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
        {cards.map((item) => (
          <ShotCanvasCard
            key={`${isVisible ? "visible" : "hidden"}-${item}`}
            index={item}
            isCanvasVisible={isVisible && !isLeaving}
            shotPositions={orderedShotPositions}
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
