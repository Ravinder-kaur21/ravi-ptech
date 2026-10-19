"use client";

/**
 * Client-side tracing for the Copilot UI.
 *
 * The server logs the agent's decisions; this logs what the operator actually
 * sees and does. Together they answer the question that matters when an agent
 * misbehaves: "what did the server decide, and what did the user see?"
 *
 * Entries go to the browser console as a collapsed group so a long turn stays
 * readable, and `window.__copilotTrace` keeps the last run in memory for
 * inspection from DevTools.
 */

export type TraceLevel = "debug" | "info" | "warn" | "error";

export interface TraceEntry {
  t: number;
  level: TraceLevel;
  event: string;
  data?: Record<string, unknown>;
}

const RING_SIZE = 500;
const ring: TraceEntry[] = [];
// The console object is captured rather than `console.groupCollapsed`'s return
// value, which is `void` — grouping is tracked here instead.
let currentGroup: Console | null = null;
let groupDepth = 0;

const enabled =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_COPILOT_TRACE === "true";

if (typeof window !== "undefined") {
  (window as unknown as { __copilotTrace?: TraceEntry[] }).__copilotTrace = ring;
}

function push(level: TraceLevel, event: string, data?: Record<string, unknown>) {
  if (!enabled) return;
  const entry: TraceEntry = { t: Date.now(), level, event, data };
  ring.push(entry);
  if (ring.length > RING_SIZE) ring.shift();

  const parent = currentGroup;
  const args: unknown[] = [`%c${event}`, "color:#6366f1;font-weight:600", data ?? ""];
  if (parent) {
    if (level === "error") parent.error(...args);
    else if (level === "warn") parent.warn(...args);
    else parent.log(...args);
    return;
  }
  if (level === "error") console.error(...args);
  else if (level === "warn") console.warn(...args);
  else console.log(...args);
}

export const traceDebug = (event: string, data?: Record<string, unknown>) =>
  push("debug", event, data);
export const traceInfo = (event: string, data?: Record<string, unknown>) =>
  push("info", event, data);
export const traceWarn = (event: string, data?: Record<string, unknown>) =>
  push("warn", event, data);
export const traceError = (event: string, data?: Record<string, unknown>) =>
  push("error", event, data);

/**
 * Opens a collapsible console group for one logical operation. Always returns
 * a close function; call it in a `finally` so an early return cannot leave a
 * group open.
 */
export function traceGroup(label: string, data?: Record<string, unknown>) {
  if (!enabled) return () => {};
  console.groupCollapsed(`%c${label}`, "color:#0ea5e9;font-weight:700");
  currentGroup = console;
  groupDepth++;
  push("info", `${label}:start`, data);
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    push("info", `${label}:end`);
    groupDepth = Math.max(0, groupDepth - 1);
    if (groupDepth === 0) currentGroup = null;
    console.groupEnd();
  };
}

/** Read the retained trace — useful when reporting a bug. */
export function getTrace(): TraceEntry[] {
  return [...ring];
}

export function clearTrace() {
  ring.length = 0;
}

/**
 * Stable label for a UI message part so tracing reads like the conversation
 * rather than like SDK internals.
 */
export function describePart(part: { type: string }): string {
  switch (part.type) {
    case "text":
      return "text";
    case "reasoning":
      return "reasoning";
    case "file":
      return "file";
    case "step-start":
      return "step-start";
    default:
      return part.type.startsWith("data-") ? part.type.slice(5) : part.type;
  }
}