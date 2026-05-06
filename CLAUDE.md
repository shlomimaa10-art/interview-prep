# Interview Prep — CLAUDE.md

## Overview
Single-file AI interview simulator with two modes:
- **Interview mode** — configure a session (level, style, focus areas, provider) and have a live back-and-forth with an AI acting as a senior engineer interviewer.
- **Study mode** — drill into a specific topic with a Socratic tutor (asks instead of lectures, tiered hints, mastery bar). Topics can be picked from a curated, category-grouped library or deep-linked from interview feedback gaps.

**Live URL:** https://zealous-pond-0e6b2f103.2.azurestaticapps.net

---

## Architecture

```
Browser (index.html)
    ├── Provider: custom / localhost  (default)
    │       └──▶ POST http://localhost:4141/v1/messages
    │            (run: npx copilot-api start -c -m claude-sonnet-4.6)
    ├── Provider: Anthropic
    │       └──▶ Direct fetch to https://api.anthropic.com/v1/messages
    └── Provider: OpenAI
            └──▶ Direct fetch to https://api.openai.com/v1/chat/completions
```

> `function/` (Azure Function proxy) exists but is **not used** by the app. Kept for future use.

---

## File Structure

```
InterviewApp/
├── index.html          # Production app — single file, no build step
├── CLAUDE.md
├── CODEBASE_ANALYSIS.md
└── function/           # Unused Azure Function proxy
    ├── host.json
    ├── package.json
    └── chat/
        ├── index.js
        └── function.json
```

---

## Key Defaults (from code)
| Setting | Default |
|---|---|
| Provider | Custom / localhost |
| Model | `claude-sonnet-4.6` |
| Custom URL | `http://localhost:4141` |
| Level | Mid-level |
| Style | Balanced |
| Target Duration | **No limit** (`selectedDuration = 0`; "No limit" toggle is the active default; `#sum-duration` reads "No limit") |
| Focus Areas | Scalability, Reliability, Latency (plus user-added custom areas via "+ Add custom focus area" tile) |
| Company Context | Empty (optional free-text; biases interviewer framing & scale) |
| Setup Sections | Company Context / Interview Format / Interviewer Style / Target Duration / Voice Mode / AI Provider & Model are collapsible (default collapsed; persisted in `localStorage` under `setupCollapsed_v1`; show summaries when collapsed) |
| Voice Mode | Off (toggled in "Voice Mode" setup section; persisted in `localStorage` under `voiceMode_v1`) |

---

## Voice Mode

Optional hands-free interview interaction, toggled via the **Voice Mode** collapsible section in Setup. Persisted to `localStorage` under `voiceMode_v1`.

- **Push-to-talk STT**: a 🎙️ mic button is rendered next to the Send button in the interview composer. Hold to record; release to transcribe via Web Speech API and inject the result into `#user-input`.
- **TTS for assistant replies**: when enabled, every interviewer message is spoken aloud via `speechSynthesis` after rendering. TTS is suppressed for fenced ` ```whiteboard ` payloads (they are stripped before speaking).
- Mic button and TTS are no-ops (and the mic hidden) when Voice Mode is off.

---

## Cross-Session Memory

`buildSystemPrompt()` injects a **PAST WEAK SPOTS** block built from `studyProgress_v1` so the interviewer steers follow-ups toward the candidate's known weak areas across sessions.

- Selection: top 5 topics, prioritizing low-mastery (< 60%) and `gapSourcedFrom` (deep-linked from interview feedback gaps).
- Block is omitted when no qualifying topics exist.
- Read-only: the interviewer uses it to bias probing depth and topic selection without naming the source.

---

## Whiteboard

An **Excalidraw**-based whiteboard in a resizable right-edge drawer. Loaded via CDN (`react`, `react-dom`, `@excalidraw/excalidraw`). State managed through `window._excalidrawAPI`.

**AI integration — bidirectional, always-on:**

1. **User → AI (every message):** `serializeWb()` reads Excalidraw scene elements. If non-empty, a `[WHITEBOARD CONTEXT]` block (components, connections, inferred gaps) is silently appended to the outgoing user message. The visible chat bubble and `history[]` remain unmodified.

2. **AI → Whiteboard (hint / full answer):** The AI can include a ` ```whiteboard ` JSON block at the end of its response. `renderWhiteboardUpdate(reply)` parses it and programmatically adds components and arrows to the Excalidraw canvas. The ` ```whiteboard ` fence is stripped from the displayed chat text; an "✏️ *Updated whiteboard*" note is appended instead. The system prompt includes `WHITEBOARD_UPDATE FORMAT` instructions telling the AI when and how to emit these blocks (hint → single element; full answer → full diagram; feedback → text only).

---

## Export & History

Two interview-tab actions extend session management:

- **📥 Export**: downloads **three sibling files** (same basename) for the current session via the shared `exportEntryFiles()` helper — (1) a Markdown file with the question, metadata (level / style / format / duration / elapsed / focus areas), full transcript, and a relative `![Whiteboard](basename.png)` reference (or `_No whiteboard content for this session._` when the canvas is empty); (2) a `.png` whiteboard image rendered via `ExcalidrawLib.exportToBlob` (no longer embedded as a giant base64 data URL — many markdown viewers refused to render those); and (3) a companion `.excalidraw` JSON scene file so recipients can re-open and edit the diagram in Excalidraw. Both `exportSession` and `exportHistEntry` delegate to `exportEntryFiles()`, which fans out to `exportEntryMarkdown()` / `exportEntryPng()` / `exportEntryExcalidraw()`.
- **📚 History**: opens a modal listing past sessions stored in `localStorage` under `HISTORY_KEY = 'interviewHistory_v1'` (cap `HISTORY_MAX = 20`, FIFO eviction). The modal is split into two tabs — **Interviews** and **📚 Study** — switched via `switchHistTab('interview' | 'study')`. Each interview entry has **View** (inline transcript), **Export**, **▶ Resume** (rehydrates question, config, chat, whiteboard, and timer with preserved elapsed time via `restoreSession()` data override; rebuilds `SYSTEM` via `buildSystemPrompt()`; snapshots current session first), and **Delete** buttons. Modal closes via ✕ button, backdrop click, or `Escape` key.
- **Snapshot triggers**: `snapshotToHistory()` upserts by stable `currentSessionId` (set at `startInterview()` / `restartInterview()` / `resumeHistEntry()` and persisted in `interviewSession_v1`). Called at `restartInterview()`, `startInterview()` (before overwriting state), and on `pagehide` / `beforeunload`, so every session auto-appears in History and refresh/close-tab updates the same entry in place rather than duplicating.

---

## Study Mode

Socratic tutor tab alongside Interviews. Major properties:

- **Topic picker:** 2-column landing — left sidebar shows curated topics grouped by category (Scalability / Reliability / Latency / Databases / Security / Observability / Networking) with collapsible category headers; topics within each category are ordered most foundational / most-asked first. A "⚠ Gaps from past interviews" block surfaces low-mastery topics deep-linked from interview feedback as **warning cards** (amber left border, warning-tinted background, mastery % chip on the right). Right column has a free-text topic input, resume card for the most recent in-progress study session, and a recent-sessions list with mastery bars.
- **Socratic tutor:** `buildStudySystemPrompt()` constructs a prompt that asks instead of lectures, with a progressive hint ladder (`studyHintTier`) and explicit "STOP hinting and TEACH" rules when the learner signals they don't know the underlying concept. The AI appends a fenced ` ```mastery ` JSON block after each turn that updates a mastery bar (0–100%).
- **Deep-link from interview feedback:** Interview feedback can deep-link the user into a targeted study session for a specific gap topic; the originating interview ID is tracked via `studySourceInterviewId` so progress can be tagged `gapSourcedFrom`.
- **Storage:** Separate `localStorage` namespace — `studySession_v1` (in-progress session crash recovery) and `studyHistory_v1` (capped at `STUDY_HISTORY_MAX = 50`). Per-topic mastery progress is persisted separately (`loadStudyProgress` / `saveStudyProgress`).
- **No visible timer:** Study Mode hides the running timer in the top bar; `studyTimerStart` is still tracked so elapsed time is recorded in History.
- **Empty-session guard:** Study sessions with no real exchanges are skipped on snapshot (no empty rows in History).

---

## Session Persistence

Browser-crash recovery via `localStorage` key `interviewSession_v1`.

- **Persisted fields:** `sessionId`, `question`, `history`, `system`, `level`, `style`, `format`, `duration`, `focusAreas`, `companyContext`, `timerStart`, `whiteboard`.
- **Save points:** every message sent/received, every whiteboard update, and on `pagehide` / `beforeunload`.
- **Auto-restore** on page load if a saved session exists.
- **Cleared** when a new interview starts.

---

## Azure Resources
| Resource | Name |
|---|---|
| Static Web App | `interview-prep-web` |
| Function App | `interview-prep-fn` (unused) |
| Storage | `interviewprepsa` |
| Resource Group | `interview-prep-app` |
| Subscription | `867c8888-cf8a-46ec-b1bc-99ea4a324ba4` |

---

## Deploy: Static Web App

```bash
mkdir -p /tmp/swa-clean
cp ~/Desktop/InterviewApp/index.html /tmp/swa-clean/index.html
echo '{"navigationFallback":{"rewrite":"/index.html"}}' > /tmp/swa-clean/staticwebapp.config.json

DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name "interview-prep-web" \
  --resource-group "interview-prep-app" \
  --query "properties.apiKey" -o tsv)

swa deploy /tmp/swa-clean \
  --deployment-token "$DEPLOY_TOKEN" \
  --env production \
  --app-location "/" \
  --swa-config-location "/tmp/swa-clean"
```

---

## Local Dev

```bash
npx copilot-api start -c -m claude-sonnet-4.6 -s claude-haiku-4.5
# Then open index.html in browser
```

Available models via copilot-api (as of 2026-04):
- Claude: `claude-sonnet-4.6`, `claude-opus-4.6`, `claude-haiku-4.5`, `claude-sonnet-4.5`, `claude-opus-4.5`
- GPT: `gpt-5.2`, `gpt-5.1`, `gpt-4o`, `gpt-4o-mini`
- Gemini: `gemini-2.5-pro`, `gemini-3-flash-preview`

---

## Environment Variables (Azure Function — unused)

```bash
az functionapp config appsettings set \
  --name "interview-prep-fn" \
  --resource-group "interview-prep-app" \
  --settings \
    ANTHROPIC_API_KEY="sk-ant-..." \
    OPENAI_API_KEY="sk-..." \
    ALLOWED_ORIGIN="https://zealous-pond-0e6b2f103.2.azurestaticapps.net"
```
