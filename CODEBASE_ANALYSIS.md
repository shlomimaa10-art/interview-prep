# InterviewApp — Codebase Analysis

## File Structure
```
InterviewApp/
├── index.html          # Single-file app (~3300 lines: HTML + CSS + JS)
├── CLAUDE.md
├── CODEBASE_ANALYSIS.md
└── function/           # Azure Function proxy (unused by app, kept for future)
    ├── host.json
    ├── package.json    # No dependencies
    └── chat/
        ├── index.js    # Node.js AI proxy (~119 lines)
        └── function.json
```

---

## index.html

### Tabs
Four tabs: **How it works** (default) · **Setup** · **Interview** (disabled until session starts) · **📚 Study**

The **How it works** tab contains a **Commands & shortcuts** section listing in-chat commands (`feedback`, `hint`, `give full answer`), a **Live Excalidraw whiteboard** card, and a **🗣️ How to Start** entry describing the starter-sentence button.

- No emojis in tab labels.
- Status dot is hidden until the interview session starts.
- "Built by Shlomi Maalumi" removed from header (appears only in Help/About).

### Setup panel
The `.setup-hero` section no longer includes an "Interview Prep" `h1` heading.

| Field | Options / Default |
|---|---|
| Candidate Level | Junior / **Mid-level** / Senior |
| Focus Areas | **Scalability**, **Reliability**, **Latency**, Security, Cost, Observability, plus **+ Add custom focus area** tile (free-text, removable via ✕) |
| Company Context | Optional free-text note (e.g. "Stripe — payments infra…"); shapes interviewer framing, scale assumptions, and trade-off bias |
| Interview Question | Pre-filled example; or hit ✨ Generate |
| Interviewer Style | Strict / **Balanced** / Friendly |
| Target Duration | **No limit** (default) / 15 / 30 / 45 / 60 min — `selectedDuration` initialized to `0`; `#sum-duration` summary reads "No limit" until changed |
| Provider | **Custom/localhost** / Anthropic / OpenAI |
| Model | **claude-sonnet-4.6** (custom default); provider-specific lists |
| Custom URL | `http://localhost:4141` (shown for custom only) |
| API Key | Stored in `sessionStorage` (shown for anthropic/openai only) |

**Collapsible sections:** Six sections — Company Context, Interview Format, Interviewer Style, Target Duration, Voice Mode, AI Provider & Model — are collapsible via chevron toggles on their `field-label`. Default state is collapsed; each shows a one-line summary (`.fg-summary`) when collapsed. State persists in `localStorage` under `setupCollapsed_v1`. Helpers: `toggleSetupSection`, `saveSetupCollapsed`, `loadSetupCollapsed`, `updateSectionSummaries`. Custom focus area tile uses `showFocusAddForm` / `confirmAddFocus` / `cancelAddFocus`.

**Voice Mode** (toggle in dedicated setup section, persisted as `voiceMode_v1`):
- **Push-to-talk STT** — 🎙️ mic button rendered next to Send in the interview composer. Hold-to-record via Web Speech API (`SpeechRecognition`); release transcribes into `#user-input` for review/edit before send. Mic button is hidden when Voice Mode is off.
- **TTS** — assistant replies are spoken via `speechSynthesis` after render; ` ```whiteboard ` fenced blocks are stripped before speaking. Suppressed when Voice Mode is off.

### UI / Layout

**Interview layout:** `max-width: 1100px` with `32px` side padding (previously `820px`).

**Chat bubbles:**
- Interviewer bubbles have a blue left-border accent, brighter background, `font-size: 15px`, `max-width: 84%`, and a subtle `box-shadow`.
- The typing indicator is styled to match interviewer bubbles.

**Action buttons:**
- **Feedback** — primary/prominent style: blue-tinted background, accent border, bold text.
- **Full Answer** — ghost/muted style: `opacity: 0.65`, no accent.
- **🗣️ How to Start** — calls `fillStarterSentence()`; injects an AI-suggested opening into the textarea without touching `history[]`.

---

### JS — key functions

**`callAI(messages, lowTokens, overrideSystem)`**
- `custom` → `POST <customUrl>/v1/messages` (Anthropic message format; handles both Anthropic and OpenAI response shapes)
- `anthropic` → `POST https://api.anthropic.com/v1/messages` (key from sessionStorage)
- `openai` → `POST https://api.openai.com/v1/chat/completions` (key from sessionStorage; system prompt prepended to messages array)
- `lowTokens=true` → `max_tokens: 300`, else `8000`
- **Anthropic prompt caching:** when `sysPrompt.length >= 4000` chars, the system prompt is sent as `[{ type:'text', text:sysPrompt, cache_control:{ type:'ephemeral' } }]` for both `custom` (copilot-api) and `anthropic` providers. 5-min cache TTL keeps follow-up turns warm, cutting repeated input-token billing on the system block. `openai` provider gets the raw string prepended as a `system` message (no cache).
- **Token accounting:** every response's `usage` is fed through `recordTokenUsage(provider, model, usage)`, which handles both Anthropic (`input_tokens` / `output_tokens` / `cache_read_input_tokens` / `cache_creation_input_tokens`) and OpenAI (`prompt_tokens` / `completion_tokens`) shapes and updates session + all-time counters.
- **Error pipeline:** all three providers fetch via `postJSON(url, opts, provider)`, which throws an `AIError` (`code` ∈ `setup` | `auth` | `rate` | `server` | `network` | `unknown`) classified by `classifyAIError(provider, status, body)`. Network/CORS failures on the custom provider are classified as `setup`. The four `callAI` call-sites (`generateQuestion`, `init` opener catch, `send`, `editMsg` doSave) all route exceptions through `handleAIError(e, context)`, which opens `#apisetup-modal` for `setup`/`auth` and surfaces tailored err-banner copy for `rate` / `server` / `network`.

**`buildSystemPrompt(question, style, focusAreas, level, format, companyContext)`**
Constructs the interviewer system prompt (compressed from ~16k → ~9k chars via prose tightening; phases, rules, and rubric semantics are all preserved). Covers:
- Optional `COMPANY CONTEXT` block (when `companyContext` is non-empty) that biases scale assumptions, scenarios, trade-offs, and clarifying-question numbers toward the target company without naming it verbatim each turn
- Optional `PAST WEAK SPOTS` block (cross-session memory): pulls top 5 entries from `studyProgress_v1` prioritizing low-mastery (< 60%) and `gapSourcedFrom` topics; instructs the interviewer to steer follow-ups and probe depth toward those weak areas without naming the source. Omitted when no qualifying topics exist.
- `getCompanyContext()` reads `#company-context` textarea; also passed to `generateQuestion()` for company-flavored prompts
- Style guide (Strict / Balanced / Friendly)
- Level expectations (Junior / Mid-level / Senior)
- 4-phase interview arc (Scoping → High-level → Deep dive → Wrap-up)
- Interviewer rules (no hints unless asked, no restating, no bullet points)
- Special commands: `"feedback"`, `"give full answer"`, `"hint"`
  - `"feedback"` emits a fixed-order structured evaluation: **Whiteboard Assessment** (primary signal — names actual `[WHITEBOARD CONTEXT]` elements, flags empty/messy diagrams as red flags), Strengths, Gaps, Overall Verdict, **Score: X/10** driven by a calibrated rubric (1–3 incoherent, 4 weak, 5–6 below-bar, 7 at-bar hire, 8 above-bar hire, 9 exceptional, 10 staff+), and Suggested Study Topics. Anti-7.5 calibration rules force using the full range. **Whiteboard quality feeds the score but does not cap it** — a strong verbal end-to-end with proactive deep-dives can earn 8 even with a thin diagram (the diagram is called out as a gap rather than capping the score); a clean diagram + crisp reasoning earns 8+.
- System prompt includes `WHITEBOARD_UPDATE FORMAT` instructions for AI-driven whiteboard updates

**`renderWhiteboardUpdate(reply)`**
Parses ` ```whiteboard ` JSON blocks from AI responses. Adds components (rectangles, ellipses, diamonds) and arrows to the Excalidraw canvas via `_excalidrawAPI.updateScene()`. Returns `{ text, hadWbUpdate }` — stripped reply text and a flag. Auto-opens the whiteboard drawer and scrolls to new elements.

**`generateQuestion()`**
Picks random domain + twist + constraint from curated arrays, calls `callAI` with `lowTokens=true` and an empty system prompt to produce a single-sentence system design question.

**`startInterview()`**
Validates input, builds system prompt, enables Interview tab, calls `init()`.

**`init()`**
Sends `"Start."` to AI; displays first interviewer message.

**`send()` / `quickSend(text)`**
Appends user message to `history[]`. Always calls `serializeWb()` — if the whiteboard has content, silently enriches the last user message with a `[WHITEBOARD CONTEXT]` block before passing to `callAI`. The `history[]` array and chat UI remain clean (no whiteboard text injected into visible bubbles).

**`serializeWb()`**
Reads Excalidraw scene elements via `window._excalidrawAPI.getSceneElements()`. Returns a structured `[WHITEBOARD CONTEXT]` string block (or `null` if canvas is empty) containing:
- **Components** list (shape labels, normalized via `LABEL_NORMS` map)
- **Connections** with optional arrow labels (`A → B`, `A →[label]→ B`)
- **Inferred / unclear** entries for arrows with missing endpoints
- **Gaps & ambiguities** auto-detected (unconnected nodes, missing storage layer, missing client entry-point, no connections drawn)
- A trailing note instructing the AI to interpret intent and probe gaps

**`fillStarterSentence()`**
Silent AI call that helps candidates begin their answer. Triggered by the **🗣️ How to Start** button in the `.action-btns` row of the interview panel.
- Does **not** call `send()` and does **not** modify `history[]`.
- Reads the current interview question from `document.getElementById('q-text').textContent`.
- Calls `callAI(payload, false, systemOverride)` with a custom system override prompt that explicitly includes the interview question, instructing the AI to produce 1–2 natural opening sentences the candidate could say to start their answer for that specific question.
- The `payload` is built from the current `history[]` (read-only).
- The AI response is injected directly into the `#user-input` textarea so the candidate can review, edit, and send it themselves.
- While waiting, the button label changes to `⏳ thinking...` and is disabled; it restores to `🗣️ How to Start` on completion (success or error).

**`editMsg(wrap, msgEl, histIdx)`**
Inline message editing: replaces bubble with textarea, on save truncates `history` at that index and re-sends.

**`renderMarkdown(text)`**
Minimal renderer: escapes HTML, converts `**bold**`, `*italic*`, `` `code` ``, newlines → `<br>`.

### State
```js
let SYSTEM = '';          // system prompt for current session
let history = [];         // [{role, content}, ...]
let selectedStyle = 'Balanced';
let selectedLevel = 'mid-level';

// Excalidraw whiteboard
window._excalidrawAPI     // Excalidraw API ref, set on mount
```

### Whiteboard — Excalidraw
Loaded via CDN: `react`, `react-dom`, `@excalidraw/excalidraw`. Mounted inside a resizable right-edge drawer (`#wb-excalidraw-container`). Drawer opened/closed via `toggleWhiteboard()`; left edge is drag-resizable.

### Whiteboard ↔ AI integration
- **User → AI (always-on):** `send()` calls `serializeWb()` on every message. If the Excalidraw scene has elements, the last user message sent to the AI is enriched with a `[WHITEBOARD CONTEXT]` block; `history[]` and chat UI remain unmodified.
- **AI → Whiteboard:** `renderWhiteboardUpdate(reply)` detects ` ```whiteboard ` JSON fences in AI responses, strips them from displayed text, and programmatically adds shapes/arrows to the Excalidraw canvas. Triggered on `hint` (single element) and `give full answer` (full diagram) commands. The system prompt's `WHITEBOARD_UPDATE FORMAT` section tells the AI when and how to emit these blocks.

### Session Persistence
`localStorage` key `interviewSession_v1` enables browser-crash recovery.
- **Persisted:** `sessionId`, `question`, `history`, `system`, `level`, `style`, `format`, `duration`, `focusAreas`, `companyContext`, `timerStart`, `whiteboard`.
- **Saved on:** every message (user + AI), every whiteboard update, `pagehide`, `beforeunload`.
- **Auto-restore** on page load if present; **cleared** when a new interview starts.
- **`safeSetItem(key, value)`** wraps all writes. On `QuotaExceededError` it trims `interviewHistory_v1` → 10 and `studyHistory_v1` → 25 and retries; on a second failure surfaces an err-banner and a one-time `confirm()` (gated by `_quotaWarned`) offering to wipe both history archives. Used by `saveSession()` (catch fallback), `saveHistoryList()`, and `resumeHistEntry()`.

### First-Run / Resilience
- **`#apisetup-modal`** — surfaced from `handleAIError` (`setup`/`auth`) or when `startInterview()` is invoked with no key. Two quick-jump buttons invoke `setProviderInSetup(provider)` which flips the provider dropdown and focuses the key input. Closes via ✕, backdrop, or `Escape`.
- **Sample questions** — `.home-samples` section in `#panel-help` renders three cards (`twitter`, `shortener`, `uber`). `startSampleInterview(id)` pulls the prompt from `SAMPLE_QUESTIONS`, fills `#question-input`, switches to Setup, and triggers `startInterview()`. `.home-sample` participates in the existing scroll-reveal IntersectionObserver.
- **CDN-failure degradation** — `onerror` handlers on the React, React-DOM, Excalidraw, and JSZip script tags push into `window._cdnFail`. A post-DOMContentLoaded `check()` disables `#wb-tab` and replaces `#wb-excalidraw-container` with a "Whiteboard unavailable — CDN failed" placeholder when React/Excalidraw is missing; surfaces an err-banner notice when JSZip is missing (export already falls back to separate-file downloads). `initExcalidraw()` early-returns when `ExcalidrawLib` is absent.

### Export & History
- **📥 Export** (interview-tab action): downloads **two sibling files** for the current session via the shared `exportEntryFiles()` helper — (1) a Markdown file containing the question, metadata (level, style, format, duration, elapsed, focus areas), full transcript, and an embedded base64 PNG of the whiteboard rendered via `ExcalidrawLib.exportToBlob`; and (2) a companion `.excalidraw` JSON scene file so recipients can re-open and edit the diagram in Excalidraw. `exportSession` and `exportHistEntry` were refactored to share `exportEntryFiles()`.
- **📊 Tokens** (interview-tab action, next to History): opens `#tok-modal` showing current-session and all-time token usage — input, output, Anthropic `cache_read_input_tokens`, Anthropic `cache_creation_input_tokens`, and call counts. All-time totals persist in `localStorage` under `TOKEN_STATS_KEY = 'tokenStats_v1'` (loaded/saved via `loadTokenStatsAllTime` / `saveTokenStatsAllTime`); per-session counters live on `tokenSession` and reset on `startInterview()`. Updated by `recordTokenUsage()` after every `callAI()` response. Modal opens via `openTokenStats()`, closes via the ✕ button, backdrop click, or `Escape` key; a **Reset all-time** danger button clears persisted totals.
- **📚 History** (interview-tab action): opens a modal listing past interviews stored in `localStorage` under `HISTORY_KEY = 'interviewHistory_v1'` (capped at `HISTORY_MAX = 20`, FIFO eviction). Modal is split into two tabs — **Interviews** and **📚 Study** — switched via `switchHistTab('interview' | 'study')` (state in `_histTab`). Each past interview entry exposes **View** (inline transcript), **Export** (same Markdown + `.excalidraw` pair), **▶ Resume** (rehydrates question, config, full chat, whiteboard, and timer with preserved elapsed time into the live interview — snapshots current session first, reuses `restoreSession()` with a data override, and rebuilds `SYSTEM` via `buildSystemPrompt()` from the entry's settings), and **Delete** buttons. Study entries (`renderStudyHistory()`) get **Resume** / **Delete** with topic, mastery %, message count, and elapsed time.
- **Modal close** (history, cheatsheet, token-stats): ✕ button, backdrop click, or `Escape` key.
- **Snapshot trigger points**: `snapshotToHistory()` upserts by stable `currentSessionId` (assigned at `startInterview()` / `restartInterview()` / `resumeHistEntry()` and persisted in `interviewSession_v1`). Called at:
  1. `restartInterview()` — before resetting current session state.
  2. `startInterview()` — before the new question overwrites state.
  3. `pagehide` / `beforeunload` — so every session auto-appears in History; refresh/close-tab updates the same entry in place rather than duplicating.

### Study Mode (`#panel-study`)

A separate Socratic-tutor tab. Distinct accent (`--study-accent`) and namespace; shares no state with Interview mode.

**Landing layout** (`renderStudyLanding()`): 2-column grid (`.study-landing-grid`) — left sidebar lists curated topics (`STUDY_BUILTIN_TOPICS`) grouped by category in `STUDY_CAT_ORDER` (Scalability / Reliability / Latency / Databases / Security / Observability / Networking); topics within each category are ordered most foundational / most-asked first. Each category header is collapsible (`toggleStudyCat`, persisted via `loadStudyCollapsed` / `saveStudyCollapsed`). Right column has the topic input, an in-progress resume card, and a recent-sessions list with mastery bars. A separate "⚠ Gaps from past interviews" block surfaces low-mastery topics that were sourced from interview feedback gaps (`prog[id].gapSourcedFrom && mastery < 80`), rendered as **warning cards** with an amber left border, warning-tinted background, and a mastery % chip on the right.

**Tutor prompt** (`buildStudySystemPrompt(topic)`): instructs a Socratic teaching style (probe → tiered hints → mini-quizzes), with explicit "STOP hinting and TEACH" rules when the learner signals they don't know an underlying concept. Requires the AI to append a fenced ` ```mastery ` JSON block updating the mastery score 0–100, and (optionally) a fenced topic block.

**Session functions:** `startStudySession(topic, topicId, sourceInterviewId)` initializes state and switches to the Study tab; `sendStudy()` mirrors Interview `send()` (whiteboard context appended if non-empty); `restartStudy()` snapshots then resets; `exitStudy(askConfirm)` returns to landing; `resumeStudyEntry(entry)` and `restoreStudySession()` rehydrate from history / crash recovery.

**Topic categories:** Recently expanded with DB topics (Normalization vs Denormalization, Change Data Capture, Time-Series Databases).

**Storage keys:**
```js
STUDY_SESSION_KEY = 'studySession_v1'   // in-progress crash recovery
STUDY_HISTORY_KEY = 'studyHistory_v1'   // capped at STUDY_HISTORY_MAX = 50
// per-topic mastery progress saved separately (loadStudyProgress / saveStudyProgress)
```

**State:**
```js
let studyTopic = '', studyTopicId = '', studyHistory = [], studySystem = '';
let studyHintTier = 0, studyMastery = 0, studyTimerStart = null;
let studySessionId = '', studySourceInterviewId = '';
```

**UX notes:** No visible top-bar timer (elapsed still tracked via `studyTimerStart`); Exit lives as a top-bar ✕; `snapshotStudyToHistory()` skips empty sessions.

---

### Models (as of code)
```js
custom:    claude-sonnet-4.6, claude-opus-4.6, claude-haiku-4.5, claude-sonnet-4.5,
           claude-opus-4.5, gpt-5.2, gpt-5.1, gpt-4o, gpt-4o-mini, gemini-2.5-pro, gemini-3-flash-preview
anthropic: claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5, claude-opus-4, claude-sonnet-4
openai:    gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4o, gpt-4o-mini, o3, o4-mini
```

---

## function/chat/index.js (unused by app)

Node.js Azure Function that acts as a server-side AI proxy:
- Reads `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` from env
- Routes `provider: "anthropic"` or `"openai"` to respective APIs
- Returns `{ text: "..." }` or `{ error: "..." }`
- CORS via `ALLOWED_ORIGIN` env var (defaults to `*`)
- No npm dependencies — uses Node built-in `https`

---

## Architecture notes
- **No build step** — open `index.html` directly in browser
- **No backend in use** — all AI calls go browser → provider API directly
- `FUNC_URL` constant exists in JS but is never called
- API keys stay in `sessionStorage` (browser only, never sent to any custom server)
