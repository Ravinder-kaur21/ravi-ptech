"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AgentOrbProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  state?: "idle" | "thinking" | "streaming";
  className?: string;
  glow?: boolean;
}

/**
 * Modern AI Agent Indicator (ChatGPT Dots + Grok Kinetic Core).
 *
 * Behavior:
 * - `idle`: Calm, completely STILL, elegant minimalist emblem. No infinite spinning or jitter.
 * - `thinking`: Energetic kinetic counter-orbit and pulsing core signifying active reasoning.
 * - `streaming`: Subtle, rhythmic fluid pulse synchronizing with incoming tokens.
 */
export function AgentOrb({
  size = "md",
  state = "idle",
  className,
  glow = true,
}: AgentOrbProps) {
  const dimensions = {
    xs: "size-3.5",
    sm: "size-4.5",
    md: "size-7",
    lg: "size-11",
    xl: "size-16",
  }[size];

  const isThinking = state === "thinking";
  const isStreaming = state === "streaming";
  const isActive = isThinking || isStreaming;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none shrink-0",
        dimensions,
        className
      )}
    >
      {/* Outer ambient glow - only visible when actively thinking/streaming */}
      {glow && isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            scale: isThinking ? [1, 1.25, 1] : [1, 1.1, 1],
            opacity: isThinking ? [0.4, 0.75, 0.4] : [0.25, 0.45, 0.25],
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            duration: isThinking ? 1.5 : 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-accent via-sky-500 to-indigo-500 blur-md pointer-events-none"
        />
      )}

      {/* Primary kinetic ring - only spins during thinking/streaming */}
      {isActive && (
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: isThinking ? 2 : 4,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0 rounded-full border border-brand-accent/40 border-t-brand-accent border-r-transparent"
        />
      )}

      {/* Secondary reverse counter-orbit - only spins during thinking */}
      {isThinking && (
        <motion.div
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-[15%] rounded-full border border-sky-400/35 border-b-sky-400 border-l-transparent"
        />
      )}

      {/* Core nucleus - calm and solid when idle, pulsing when active */}
      <motion.div
        animate={
          isActive
            ? {
                scale: isThinking ? [0.94, 1.06, 0.94] : [0.97, 1.03, 0.97],
              }
            : { scale: 1 }
        }
        transition={
          isActive
            ? {
                duration: isThinking ? 1 : 2,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : { duration: 0.2 }
        }
        className={cn(
          "relative z-10 size-[65%] rounded-full flex items-center justify-center transition-colors duration-200",
          "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs",
          !isActive && "border border-zinc-300/40 dark:border-zinc-700/60"
        )}
      >
        {/* Inner center dot (ChatGPT-style minimalist focal point) */}
        <motion.div
          animate={
            isActive
              ? {
                  opacity: [0.7, 1, 0.7],
                  scale: isThinking ? [1, 1.25, 1] : [1, 1.1, 1],
                }
              : { opacity: 0.9, scale: 1 }
          }
          transition={
            isActive
              ? {
                  duration: isThinking ? 0.8 : 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : { duration: 0.2 }
          }
          className={cn(
            "size-[36%] rounded-full transition-colors",
            isActive
              ? "bg-gradient-to-r from-brand-accent to-sky-400 shadow-xs shadow-brand-accent/60"
              : "bg-zinc-400 dark:bg-zinc-600"
          )}
        />
      </motion.div>
    </div>
  );
}
export default AgentOrb;
