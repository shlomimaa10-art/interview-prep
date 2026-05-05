# Interview Prep — CLAUDE.md

## Overview
Single-file AI interview simulator. Users configure a session (level, style, focus areas, provider) and have a live back-and-forth conversation with an AI acting as a senior engineer interviewer.

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
| Focus Areas | Scalability, Reliability, Latency |
| Company Context | Empty (optional free-text; biases interviewer framing & scale) |

---

## Whiteboard

An **Excalidraw**-based whiteboard in a resizable right-edge drawer. Loaded via CDN (`react`, `react-dom`, `@excalidraw/excalidraw`). State managed through `window._excalidrawAPI`.

**AI integration — bidirectional, always-on:**

1. **User → AI (every message):** `serializeWb()` reads Excalidraw scene elements. If non-empty, a `[WHITEBOARD CONTEXT]` block (components, connections, inferred gaps) is silently appended to the outgoing user message. The visible chat bubble and `history[]` remain unmodified.

2. **AI → Whiteboard (hint / full answer):** The AI can include a ` ```whiteboard ` JSON block at the end of its response. `renderWhiteboardUpdate(reply)` parses it and programmatically adds components and arrows to the Excalidraw canvas. The ` ```whiteboard ` fence is stripped from the displayed chat text; an "✏️ *Updated whiteboard*" note is appended instead. The system prompt includes `WHITEBOARD_UPDATE FORMAT` instructions telling the AI when and how to emit these blocks (hint → single element; full answer → full diagram; feedback → text only).

---

## Export & History

Two interview-tab actions extend session management:

- **📥 Export**: downloads **two sibling files** for the current session via the shared `exportEntryFiles()` helper — (1) a Markdown file with the question, metadata (level / style / format / duration / elapsed / focus areas), full transcript, and an embedded base64 PNG of the whiteboard via `ExcalidrawLib.exportToBlob`; and (2) a companion `.excalidraw` JSON scene file so recipients can re-open and edit the diagram in Excalidraw. Both `exportSession` and `exportHistEntry` delegate to `exportEntryFiles()`.
- **📚 History**: opens a modal listing past sessions stored in `localStorage` under `HISTORY_KEY = 'interviewHistory_v1'` (cap `HISTORY_MAX = 20`, FIFO eviction). Each entry has **View** (inline transcript), **Export**, **▶ Resume** (rehydrates question, config, chat, whiteboard, and timer with preserved elapsed time via `restoreSession()` data override; rebuilds `SYSTEM` via `buildSystemPrompt()`; snapshots current session first), and **Delete** buttons. Modal closes via ✕ button, backdrop click, or `Escape` key.
- **Snapshot triggers**: `snapshotToHistory()` upserts by stable `currentSessionId` (set at `startInterview()` / `restartInterview()` / `resumeHistEntry()` and persisted in `interviewSession_v1`). Called at `restartInterview()`, `startInterview()` (before overwriting state), and on `pagehide` / `beforeunload`, so every session auto-appears in History and refresh/close-tab updates the same entry in place rather than duplicating.

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
