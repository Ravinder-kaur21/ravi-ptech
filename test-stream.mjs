import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";

const encoder = new TextEncoder();

function makeTimedStream(chunks, delays) {
  let i = 0;
  return new ReadableStream({
    async pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      await new Promise((r) => setTimeout(r, delays[i] ?? 40));
      controller.enqueue(chunks[i]); // object chunks, NOT SSE bytes
      i++;
    },
  });
}

// Only text parts — no start/finish, so we isolate pure delta streaming.
const chunks = [
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: "Hello " },
  { type: "text-delta", id: "t1", delta: "there " },
  { type: "text-delta", id: "t1", delta: "world" },
  { type: "text-end", id: "t1" },
];

const result = { stream: makeTimedStream(chunks, [20, 150, 150, 150, 20]) };

let writerRef = null;
let stepCount = 0;

const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    writerRef = writer;
    writer.write({
      type: "data-cot-step",
      id: "cot-thinking",
      data: {
        id: "cot-thinking",
        icon: "think",
        label: "Analyzing operational request",
        status: "active",
      },
    });
    writer.merge(toUIMessageStream({ stream: result.stream, sendReasoning: true }));
  },
});

const timer = setInterval(() => {
  if (stepCount >= 2) return;
  stepCount++;
  writerRef?.write({
    type: "data-cot-step",
    id: `cot-tool-${stepCount}`,
    data: {
      id: `cot-tool-${stepCount}`,
      icon: "search",
      label: `Tool step ${stepCount}`,
      status: "complete",
    },
  });
}, 120);

const res = createUIMessageStreamResponse({ stream });
const reader = res.body.getReader();
const decoder = new TextDecoder();

const t0 = Date.now();
const arrivals = [];
let buf = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  arrivals.push(Date.now() - t0);
  buf += decoder.decode(value, { stream: true });
}
clearInterval(timer);

const cotLines = buf
  .split("\n")
  .filter((l) => l.startsWith("data: ") && l.includes("data-cot-step"));

console.log("=== arrival times (ms) ===");
console.log(arrivals.join(", "));
console.log("\ntext deltas seen:", (buf.match(/text-delta/g) || []).length);
console.log("cot steps seen  :", cotLines.length);

const firstCot = buf.indexOf("cot-thinking");
const firstDelta = buf.indexOf("text-delta");
console.log("first cot idx:", firstCot, "| first text-delta idx:", firstDelta);

const spread = arrivals[arrivals.length - 1] - arrivals[0];
console.log("\nspread:", spread + "ms");
console.log(
  "incremental streaming:",
  arrivals.length >= 5 && spread >= 300 ? "PASS" : `FAIL (arrivals=${arrivals.length})`
);
console.log(
  "thinking precedes text:",
  firstCot > -1 && firstDelta > -1 && firstCot < firstDelta ? "PASS" : "FAIL"
);