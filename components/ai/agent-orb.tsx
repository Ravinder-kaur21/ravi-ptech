"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AgentOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
  state?: "idle" | "thinking" | "streaming";
  className?: string;
  glow?: boolean;
}

export function AgentOrb({
  size = "md",
  state = "idle",
  className,
  glow = true,
}: AgentOrbProps) {
  const dimensions = {
    sm: "size-4",
    md: "size-7",
    lg: "size-12",
    xl: "size-20",
  }[size];

  const isThinking = state === "thinking" || state === "streaming";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none shrink-0",
        dimensions,
        className
      )}
    >
      {/* Outer ambient glow ring */}
      {glow && (
        <motion.div
          animate={{
            scale: isThinking ? [1, 1.25, 1] : [1, 1.08, 1],
            opacity: isThinking ? [0.6, 0.9, 0.6] : [0.25, 0.45, 0.25],
          }}
          transition={{
            duration: isThinking ? 1.4 : 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-accent via-sky-500 to-indigo-500 blur-md pointer-events-none"
        />
      )}

      {/* Orbiting kinetic particle ring (Grok-style neural orbit) */}
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: isThinking ? 2.5 : 8,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 rounded-full border border-brand-accent/30 border-t-brand-accent border-r-transparent"
      />

      {/* Secondary reverse counter-orbit */}
      <motion.div
        animate={{
          rotate: -360,
        }}
        transition={{
          duration: isThinking ? 3.5 : 12,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-[15%] rounded-full border border-sky-400/25 border-b-sky-400 border-l-transparent"
      />

      {/* Core nucleus */}
      <motion.div
        animate={{
          scale: isThinking ? [0.92, 1.08, 0.92] : [0.96, 1.02, 0.96],
        }}
        transition={{
          duration: isThinking ? 0.8 : 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10 size-[55%] rounded-full bg-gradient-to-br from-brand-ink via-zinc-900 to-black dark:from-white dark:via-zinc-200 dark:to-zinc-400 shadow-inner flex items-center justify-center"
      >
        {/* Pulsing center spark */}
        <motion.div
          animate={{
            opacity: isThinking ? [0.8, 1, 0.8] : [0.5, 0.85, 0.5],
            scale: isThinking ? [1, 1.3, 1] : [1, 1.1, 1],
          }}
          transition={{
            duration: isThinking ? 0.6 : 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="size-[35%] rounded-full bg-gradient-to-r from-brand-accent to-sky-400 shadow-sm shadow-brand-accent/80"
        />
      </motion.div>
    </div>
  );
}
