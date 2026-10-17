"use client";

import { useEffect, useRef, useState, memo } from "react";
import { cn } from "@/lib/utils";

export type BotMood = "idle" | "listen" | "think" | "happy" | "sleep" | "wow";
export type BotCoat =
  | "ink"
  | "cream"
  | "peach"
  | "grove"
  | "amber"
  | "emerald"
  | "indigo"
  | "rose";
export type BotRole =
  | "main"
  | "rate_auditor"
  | "fleet_guardian"
  | "route_planner"
  | "safety_compliance"
  | "dispatcher";
export type BotSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface MuvxBotProps {
  mood?: BotMood;
  coat?: BotCoat;
  role?: BotRole;
  variant?: "parent" | "child";
  size?: BotSize;
  className?: string;
  showDots?: boolean;
  interactive?: boolean;
  label?: string;
}

interface Palette {
  body: string;
  eye: string;
  pupil: string;
  blush: string;
  shadow: string;
}

const coats: Record<BotCoat, Palette> = {
  ink: {
    body: "#141414",
    eye: "#fffdf8",
    pupil: "#141414",
    blush: "#ff7a59",
    shadow: "#141414",
  },
  cream: {
    body: "#fff6ea",
    eye: "#141414",
    pupil: "#fffdf8",
    blush: "#ffb199",
    shadow: "#3a2e1e",
  },
  peach: {
    body: "#ffb199",
    eye: "#fffdf8",
    pupil: "#3a221c",
    blush: "#ff7a59",
    shadow: "#3a221c",
  },
  grove: {
    body: "#163d36",
    eye: "#f3fff9",
    pupil: "#0d2420",
    blush: "#7dceb8",
    shadow: "#0d2420",
  },
  amber: {
    body: "#b45309",
    eye: "#fffef0",
    pupil: "#451a03",
    blush: "#f59e0b",
    shadow: "#451a03",
  },
  emerald: {
    body: "#047857",
    eye: "#f0fdf4",
    pupil: "#022c22",
    blush: "#34d399",
    shadow: "#022c22",
  },
  indigo: {
    body: "#1d4ed8",
    eye: "#eff6ff",
    pupil: "#172554",
    blush: "#60a5fa",
    shadow: "#172554",
  },
  rose: {
    body: "#be123c",
    eye: "#fff1f2",
    pupil: "#4c0519",
    blush: "#fb7185",
    shadow: "#4c0519",
  },
};

const roleToCoat: Record<BotRole, BotCoat> = {
  main: "ink",
  rate_auditor: "amber",
  fleet_guardian: "emerald",
  route_planner: "indigo",
  safety_compliance: "rose",
  dispatcher: "peach",
};

const sizeClasses: Record<BotSize, string> = {
  xs: "w-7 h-7",
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-40 h-40 sm:w-48 sm:h-48",
  xl: "w-52 h-52 sm:w-64 sm:h-64",
};

export const MuvxBot = memo(function MuvxBot({
  mood = "idle",
  coat,
  role = "main",
  variant = "parent",
  size = "md",
  className,
  showDots = false,
  interactive = true,
  label,
}: MuvxBotProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });

  // Resolve coat based on explicit prop or child role
  const resolvedCoat = coat || roleToCoat[role] || (variant === "child" ? "amber" : "ink");
  const palette = coats[resolvedCoat] || coats.ink;

  // Real-time eye tracking with bounds clamping
  useEffect(() => {
    if (!interactive) return;

    const onMove = (event: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;

      // When sleeping, eyes stay resting
      if (mood === "sleep") return;

      const box = el.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height * 0.46;

      const dx = Math.max(-8, Math.min(8, (event.clientX - cx) / 24));
      const dy = Math.max(-7, Math.min(7, (event.clientY - cy) / 24));

      setPupil({ x: dx, y: dy });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [interactive, mood]);

  const smile = mood === "happy";
  const sleepy = mood === "sleep";
  const isChild = variant === "child";
  const isLarge = size === "lg" || size === "xl";

  // When thinking, look thoughtfully up and to the right
  const pupilTransform =
    mood === "think"
      ? "translate(3px, -6px)"
      : mood === "sleep"
        ? "translate(0px, 4px)"
        : `translate(${pupil.x}px, ${pupil.y}px)`;

  return (
    <div
      className={cn(
        "muvx-bot-wrap flex flex-col items-center select-none shrink-0",
        className
      )}
      data-mood={mood}
    >
      {/* Scoped Keyframe Animations - guaranteed to run in all Next.js environments */}
      <style>{`
        @keyframes mote-idle {
          0%, 100% { transform: translateY(0) scale(1, 1); }
          50% { transform: translateY(-8px) scale(1.02, 0.98); }
        }
        @keyframes mote-shadow {
          0%, 100% { transform: scaleX(1); opacity: 0.18; }
          50% { transform: scaleX(0.86); opacity: 0.12; }
        }
        @keyframes mote-listen {
          0%, 100% { transform: translateY(4px) scale(1.04, 0.96); }
          50% { transform: translateY(0) scale(1.06, 0.94); }
        }
        @keyframes mote-happy {
          0%, 100% { transform: translateY(0) scale(1, 1); }
          40% { transform: translateY(-18px) scale(0.94, 1.08); }
          70% { transform: translateY(2px) scale(1.08, 0.92); }
        }
        @keyframes mote-shadow-fast {
          0%, 100% { transform: scaleX(1); opacity: 0.16; }
          40% { transform: scaleX(0.72); opacity: 0.08; }
        }
        @keyframes mote-wow {
          0%, 100% { transform: scale(1, 1); }
          40% { transform: scale(0.92, 1.1); }
        }
        @keyframes mote-sleep {
          0%, 100% { transform: translateY(6px) scale(1.06, 0.92) rotate(-2deg); }
          50% { transform: translateY(2px) scale(1.08, 0.9) rotate(2deg); }
        }
        @keyframes mote-think {
          0%, 100% { transform: rotate(-3deg) scale(1, 1); }
          50% { transform: rotate(3deg) scale(1.01, 0.99); }
        }
        @keyframes dot-pulse {
          0%, 70%, 100% { opacity: 0.25; transform: translateY(0); }
          35% { opacity: 1; transform: translateY(-5px); }
        }
        @keyframes mote-blink {
          0%, 95%, 100% { transform: scaleY(0); }
          97.5% { transform: scaleY(1); }
        }
      `}</style>

      <div
        ref={rootRef}
        className={cn(
          "relative aspect-square transition-transform duration-200",
          sizeClasses[size]
        )}
        style={{
          filter: isLarge
            ? "drop-shadow(0 20px 28px rgba(20, 20, 20, 0.18))"
            : "drop-shadow(0 4px 6px rgba(20, 20, 20, 0.12))",
        }}
        data-mood={mood}
        aria-hidden="true"
      >
        <svg viewBox="0 0 320 320" className="w-full h-full overflow-visible">
          {/* Ground Contact Shadow with Synchronized Breathing */}
          <ellipse
            cx="160"
            cy="286"
            rx={isChild ? 68 : 78}
            ry="12"
            fill={palette.shadow}
            opacity="0.16"
            style={{
              transformOrigin: "160px 292px",
              animation:
                mood === "happy"
                  ? "mote-shadow-fast 0.7s ease-in-out infinite"
                  : "mote-shadow 3.6s ease-in-out infinite",
            }}
          />

          {/* Organic Blob Body with Responsive Mood Motion */}
          <g
            style={{
              transformOrigin: "160px 168px",
              animation:
                mood === "happy"
                  ? "mote-happy 0.7s ease-in-out infinite"
                  : mood === "listen"
                    ? "mote-listen 2.4s ease-in-out infinite"
                    : mood === "think"
                      ? "mote-think 2.2s ease-in-out infinite"
                      : mood === "wow"
                        ? "mote-wow 0.9s ease-in-out infinite"
                        : mood === "sleep"
                          ? "mote-sleep 4.8s ease-in-out infinite"
                          : "mote-idle 3.6s ease-in-out infinite",
            }}
          >
            {/* Child Bot Little Sprout on Head */}
            {isChild && (
              <g className="child-sprout">
                <path
                  d="M160 68 C158 48, 138 40, 130 44 C124 47, 128 60, 146 63 C154 64, 158 66, 160 68 Z"
                  fill={palette.blush}
                  opacity="0.95"
                />
                <circle cx="160" cy="68" r="3.5" fill={palette.blush} />
              </g>
            )}

            {/* Mathematically Perfect Round Body Silhouette */}
            <circle
              cx="160"
              cy={isChild ? "160" : "156"}
              r={isChild ? "92" : "108"}
              fill={palette.body}
            />

            {/* Cheek Blushes (overlapping outer bottom edge of eyes) */}
            <ellipse
              cx="108"
              cy={isChild ? "170" : "166"}
              rx={isChild ? "14" : "17"}
              ry={isChild ? "9" : "11"}
              fill={palette.blush}
              opacity="0.75"
            />
            <ellipse
              cx="212"
              cy={isChild ? "170" : "166"}
              rx={isChild ? "14" : "17"}
              ry={isChild ? "9" : "11"}
              fill={palette.blush}
              opacity="0.75"
            />

            {/* Eyes Group */}
            <g>
              {/* White Sclera */}
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

              {/* Pupils and Catchlights - smoothly tracking mouse */}
              {!smile && (
                <g
                  style={{
                    transform: pupilTransform,
                    transition: "transform 140ms ease-out",
                  }}
                >
                  {/* Pupils */}
                  <circle
                    cx="128"
                    cy="154"
                    r={mood === "wow" ? 12 : 8}
                    fill={palette.pupil}
                  />
                  <circle
                    cx="204"
                    cy="154"
                    r={mood === "wow" ? 12 : 8}
                    fill={palette.pupil}
                  />

                  {/* Catchlight highlights */}
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
                </g>
              )}

              {/* Eyelids (for sleeping, blinking, or resting) */}
              <g
                style={{
                  transformOrigin: "center",
                  transform: sleepy ? "scaleY(1)" : "scaleY(0)",
                  animation:
                    !sleepy && mood !== "think"
                      ? "mote-blink 5.5s infinite"
                      : "none",
                  transition: "transform 200ms ease",
                }}
              >
                <ellipse cx="122" cy="138" rx="28" ry="16" fill={palette.body} />
                <ellipse cx="198" cy="138" rx="28" ry="16" fill={palette.body} />
              </g>
            </g>

            {/* Happy Smile Mouth */}
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
            "flex gap-1.5 items-center justify-center mt-1.5",
            !isLarge && "scale-75"
          )}
          style={{ height: "16px" }}
          aria-hidden="true"
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-brand-ink/40 dark:bg-brand-cream/40"
            style={{ animation: "dot-pulse 1.05s ease-in-out infinite" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-brand-ink/40 dark:bg-brand-cream/40"
            style={{
              animation: "dot-pulse 1.05s ease-in-out infinite",
              animationDelay: "0.16s",
            }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-brand-ink/40 dark:bg-brand-cream/40"
            style={{
              animation: "dot-pulse 1.05s ease-in-out infinite",
              animationDelay: "0.32s",
            }}
          />
        </div>
      )}

      {/* Optional Child or Sub-agent role label */}
      {label && (
        <span className="text-[10px] font-medium tracking-wide uppercase mt-1 text-brand-muted-soft">
          {label}
        </span>
      )}
    </div>
  );
});

export default MuvxBot;
