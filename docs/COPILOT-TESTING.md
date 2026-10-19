# Copilot — Test Guide

Dev server already chal raha hai: **http://localhost:3000**

---

## 1. Streaming (sabse important)

| Step | Kya karo | Expected |
|---|---|---|
| 1 | `/copilot` kholo | Empty state: bot orb + 4 starter chips |
| 2 | `"show my active loads"` type karo, Enter | **Turant** shimmer "Thinking…" dikhe |
| 3 | Dhyan do | Text **token-by-token** aaye, ek saath nahi |
| 4 | Tool call ke waqt | Collapsible "Chain of Thought" khule, steps dikhein |

**Fail signal:** Agar poora response ek saath aaye → streaming bug wapas aa gaya.

---

## 2. Chain of Thought labels

Tool call ke waqt steps aise dikhne chahiye:

```
● Searching loads          ← gerund, NOT "query Loads"
● Booked load
● Dispatching trip
● Searched drivers
```

- **Pass:** "Searching loads", "Booking load"
- **Fail:** "query Loads", "Executed query loads", "Operational reasoning deduction"

---

## 3. File upload (S3)

| Step | Kya karo | Expected |
|---|---|---|
| 1 | Paperclip click → PDF select | Inline badge preview (official Attachments) |
| 2 | Send | "Uploading to secure storage…" shimmer |
| 3 | Complete | Chat me grid thumbnail |
| 4 | Thumbnail hover → download icon | Browser me PDF khule |
| 5 | **Page reload** | Attachment **still visible** (re-signed URL) |

**Fail signal:** Reload ke baad attachment gayab → `refreshAttachmentUrl` broken.

---

## 4. Approval (agent rok raha hai)

| Step | Kya karo | Expected |
|---|---|---|
| 1 | `"book a load from Dallas to Austin"` | Approval card aaye |
| 2 | Card text dekho | "Authorize booking load?" |
| 3 | **Reject** karo | Agent **dobara retry nahi** karta |
| 4 | Reply dekho | Ek line me acknowledge, phir aage badhta hai |

**Fail signal:** Reject ke baad wahi tool dobara call ho → system prompt instruction missing.

---

## 5. Long session

| Step | Kya karo | Expected |
|---|---|---|
| 1 | Settings → Reasoning Depth → **32** | Saved |
| 2 | Multi-step query (FMCSA audit) | Chalta rahe, 5 min tak |
| 3 | Token meter hover | Input/Output/Cache breakdown + cost |

**Note:** 120K tokens cross karne pe compaction auto-chalti hai — response fail nahi hona chahiye.

---

## 6. Suggestions

| Step | Kya karo | Expected |
|---|---|---|
| 1 | Koi bhi query complete karo | 3-4 chips neeche |
| 2 | Chips padho | **Isi conversation se related** hon |
| 3 | Network tab dekho | `/api/copilot/suggestions` 200 |

**Fail signal:** Chips generic rahein (hamesha "Show today's active loads") → server generation fail ho rahi, fallback aa raha hai.

---

## 7. Autoscroll

| Step | Kya karo | Expected |
|---|---|---|
| 1 | Lambi conversation banao | Auto-scroll bottom tak |
| 2 | Upar scroll karo | Scroll button aaye |
| 3 | Button click | Wapas bottom |

**Fail signal:** Scroll na ho → `Conversation` ke around koi overflow container wapas aa gaya.

---

## Console se verify karna

DevTools → Console:

```js
// 1. Live data parts aa rahe hain?
// Network tab → /api/chat → Response → SSE stream

// 2. Token usage metadata
// Network → /api/chat → last SSE line mein "totalUsage"

// 3. Context compaction trigger hui?
// Server log: [COMPACTION] (agar add karo ho)
```

---

## Quick API test (browser console se)

```js
// Auth cookie ke saath — browser console me chalega
const r = await fetch('/api/copilot/suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript: 'user: show overdue invoices\nassistant: You have 12 overdue invoices totaling $84,200' })
});
console.log(await r.json());
```

**Expected:** `askDispatcher` / `invoice` / `payment` jaise contextual suggestions.

---

## Build verification

```bash
rtk bunx tsc --noEmit        # No errors found
rtk bunx next build          # ✓ Compiled successfully
```