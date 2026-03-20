# Fray Improvement Phases

## Phase 1 — Server-side turn orchestration
Move the persona loop from the client (`use-chat-session.ts`) to a new API endpoint. Client sends one request, server handles the full shuffle, all persona calls, persistence, and returns results. Fixes the tab-switching problem and lays the foundation for follow-up rounds and richer tool use.

Status: **complete** (commit 71e7124)

## Phase 2 — Token counting + context compaction
Add token estimation to messages. When context exceeds a threshold, summarize older messages before sending to the LLM. Token counting alone does nothing without compaction, so these are bundled.

Status: **complete** (commit fe2ca2b)

## Phase 3 — Addressed-persona follow-ups
After the main shuffle round, scan responses for `addressed_to: "persona"`. Trigger a follow-up round for addressed personas. Cap at 1 round. Easy now because the loop is already server-side from Phase 1.

Status: **complete** (commit 263e55d)

## Phase 4 — Richer tool use
Add tools to the persona response pass (starting with URL fetching). Swap `generateText` to include tools and a ReAct loop with `stopWhen`. Extend to vision, code execution, etc. as needed.

Status: **complete** (commit d577deb) — URL auto-fetch implemented. ReAct loop deferred — not needed for pre-fetch pattern.

## Phase 5 — Fix setState snapshot trick
With the loop server-side from Phase 1, this might already be resolved. Evaluate and clean up any remaining client-side brittleness.

Status: **complete** — resolved by Phase 1. The setState snapshot trick was removed when the loop moved server-side.

## Phase 6 — UX polish
Status: **not started**
