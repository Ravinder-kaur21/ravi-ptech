"use client";

import { useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";

export type BotMood = "idle" | "listen" | "think" | "happy" | "sleep" | "wow";
export type BotCoat = "ink" | "cream" | "peach" | "grove";
export type BotSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface MuvxBotProps {
  mood?: BotMood;
  coat?: BotCoat;
  size?: BotSize;
  className?: string;
  showDots?: boolean;
  interactive?: boolean;
}

const coats: Record<
  BotCoat,
  { body: string; eye: string; pupil: string; blush: string; shadow: string }
> = {
  grove: {
    body: "#133830",
    eye: "#f4fbf7",
    pupil: "#0b201b",
    blush: "#57b79d",
    shadow: "#071613",
  },
  ink: {
    body: "#16181d",
    eye: "#fffdf8",
    pupil: "#16181d",
    blush: "#d9622b",
    shadow: "#0b0c0e",
  },
  cream: {
    body: "#fff6ea",
    eye: "#16181d",
    pupil: "#fffdf8",
    blush: "#ffb199",
    shadow: "#3a2e1e",
  },
  peach: {
    body: "#ffb199",
    eye: "#fffdf8",
    pupil: "#3a221c",
    blush: "#d9622b",
    shadow: "#2a1510",
  },
};

const sizeClasses: Record<BotSize, string> = {
  xs: "w-7 h-7",
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-36 h-36 sm:w-44 sm:h-44",
  xl: "w-48 h-48 sm:w-56 sm:h-56",
};

export const MuvxBot = memo(function MuvxBot({
  mood = "idle",
  coat = "grove",
  size = "md",
  className,
  showDots = false,
  interactive = true,
}: MuvxBotProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const palette = coats[coat] || coats.grove;

  useEffect(() => {
    if (!interactive) return;
    const el = rootRef.current;
    if (!el) return;

    const onMove = (event: PointerEvent) => {
      // Don't track if bot is sleeping or in think mode (which has fixed gaze)
      if (mood === "sleep" || mood === "think") return;

      const box = el.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height * 0.46;
      const dx = Math.max(-7, Math.min(7, (event.clientX - cx) / 28));
      const dy = Math.max(-6, Math.min(6, (event.clientY - cy) / 28));

      el.style.setProperty("--pupil-x", `${dx}px`);
      el.style.setProperty("--pupil-y", `${dy}px`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [interactive, mood]);

  const smile = mood === "happy";
  const sleepy = mood === "sleep";
  const isLarge = size === "lg" || size === "xl";

  return (
    <div
      className={cn(
        "muvx-bot-wrap flex flex-col items-center select-none shrink-0",
        className
      )}
      data-mood={mood}
    >
      <div
        ref={rootRef}
        className={cn("muvx-bot", sizeClasses[size])}
        data-mood={mood}
        aria-hidden="true"
      >
        <svg viewBox="0 0 320 320">
          {/* Ground Contact Shadow */}
          <ellipse
            className="bot-shadow"
            cx="160"
            cy="286"
            rx="78"
            ry="12"
            fill={palette.shadow}
            opacity="0.16"
          />

          {/* Organic Blob Body */}
          <g className="bot-body">
            <path
              d="M160 46c62 0 112 46 118 108 6 58-28 112-86 128-18 5-28 8-32 8s-14-3-32-8c-58-16-92-70-86-128C48 92 98 46 160 46z"
              fill={palette.body}
            />

            {/* Cheek Blushes */}
            <ellipse
              cx="108"
              cy="168"
              rx="16"
              ry="10"
              fill={palette.blush}
              opacity="0.75"
            />
            <ellipse
              cx="214"
              cy="168"
              rx="16"
              ry="10"
              fill={palette.blush}
              opacity="0.75"
            />

            {/* Eyes & Lids Group */}
            <g>
              <ellipse
                cx="122"
                cy="150"
                rx={smile ? 22 : 26}
                ry={smile ? 14 : sleepy ? 8 : 30}
                fill={palette.eye}
              />
              <ellipse
                cx="198"
                cy="150"
                rx={smile ? 22 : 26}
                ry={smile ? 14 : sleepy ? 8 : 30}
                fill={palette.eye}
              />

              {!smile && (
                <>
                  {/* Dynamic Pupils with pointer tracking */}
                  <circle
                    className="bot-pupil"
                    cx="128"
                    cy="154"
                    r={mood === "wow" ? 12 : 8}
                    fill={palette.pupil}
                  />
                  <circle
                    className="bot-pupil"
                    cx="204"
                    cy="154"
                    r={mood === "wow" ? 12 : 8}
                    fill={palette.pupil}
                  />

                  {/* Catchlight reflections */}
                  <circle
                    cx="132"
                    cy="150"
                    r="3"
                    fill={palette.eye}
                    opacity="0.9"
                  />
                  <circle
                    cx="208"
                    cy="150"
                    r="3"
                    fill={palette.eye}
                    opacity="0.9"
                  />
                </>
              )}

              {/* Animated Eyelids */}
              <ellipse
                className="bot-lid"
                cx="122"
                cy="138"
                rx="28"
                ry="16"
                fill={palette.body}
              />
              <ellipse
                className="bot-lid"
                cx="198"
                cy="138"
                rx="28"
                ry="16"
                fill={palette.body}
              />
            </g>

            {/* Happy Curved Smile */}
            {smile && (
              <path
                d="M138 196c8 12 36 12 44 0"
                fill="none"
                stroke={palette.eye}
                strokeWidth="6"
                strokeLinecap="round"
              />
            )}
          </g>
        </svg>
      </div>

      {/* Pulsating dots for think mood or when explicitly shown */}
      {(showDots || mood === "think") && (
        <div
          className={cn(
            "bot-dots text-brand-muted-soft mt-1",
            !isLarge && "scale-75"
          )}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
});
