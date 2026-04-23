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

---

## Whiteboard

A fully self-contained canvas-based whiteboard (no iframe, no external deps) floats over the Interview panel.

**Shapes:** Service · Database · Queue · Client · Cache  
**Interactions:** add shape, draw directed arrows, drag/move nodes, double-click to edit labels, Undo (up to 30 steps), Clear.

**AI integration — always-on:**  
`serializeWb()` is called on every `send()`. If the canvas has content, the `[WHITEBOARD CONTEXT]` block (components, connections, inferred gaps) is silently appended to the outgoing user message before calling the AI. The visible chat bubble and `history[]` array are never modified. No toggle — the AI always sees the current sketch when anything is drawn.

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
