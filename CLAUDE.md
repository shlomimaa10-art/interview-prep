# Interview Prep — CLAUDE.md

## Project Overview
A minimal, single-page AI interview simulator. Users paste or generate an interview question, configure the interviewer style/level, and have a live back-and-forth conversation with an AI acting as a senior engineer interviewer.

**Live URL:** https://zealous-pond-0e6b2f103.2.azurestaticapps.net

---

## Architecture

```
Browser (index.html)
    │
    ├── Provider: Anthropic / OpenAI
    │       └──▶ Direct fetch to provider API (key entered in browser)
    │
    └── Provider: Custom / localhost  (default)
            └──▶ Direct fetch to http://localhost:4141/v1/messages
                 (uses copilot-api: npx copilot-api start -c -m claude-sonnet-4.6)
```

> Note: The Azure Function (`interview-prep-fn`) exists but is not currently used by the app.
> The app calls AI providers directly from the browser. The Anthropic/OpenAI providers
> require the user to paste their own API key in Setup.

### Azure Resources (Resource Group: `interview-prep-app`, Sub: `867c8888-cf8a-46ec-b1bc-99ea4a324ba4`)
| Resource | Name | Purpose |
|---|---|---|
| Static Web App | `interview-prep-web` | Hosts `index.html` |
| Function App | `interview-prep-fn` | AI proxy (unused — kept for future use) |
| Storage Account | `interviewprepsa` | Required by Function App |

---

## File Structure

```
InterviewApp/
├── CLAUDE.md                  ← this file
├── index.html                 ← production app (deployed to Static Web App)
├── interview_session.html     ← original local prototype (localhost only)
└── function/                  ← Azure Function source (unused, kept for future)
    ├── host.json
    ├── package.json
    └── chat/
        ├── function.json      ← HTTP trigger config (route: /api/chat, anonymous)
        └── index.js           ← proxy: routes to Anthropic or OpenAI API
```

---

## Key Files

### `index.html`
- **Single-file app** — HTML + CSS + JS, zero build step, zero dependencies
- **3 tabs:** 💡 How it works | 📋 Setup | 💬 Interview
- **Defaults:** Custom/localhost provider, `claude-sonnet-4.6`, `http://localhost:4141`
- **Provider modes:**
  - `custom` → calls `<url>/v1/messages` directly from the browser (for localhost)
  - `anthropic` → calls Anthropic API directly with user-provided key
  - `openai` → calls OpenAI API directly with user-provided key
- **Generate Question:** button in Setup that calls the AI to generate a system design question tailored to the user's level and focus areas. Uses the same `callAI()` path with `max_tokens: 120`.

### `function/chat/index.js`
- Node.js Azure Function, HTTP trigger, anonymous auth (currently unused by the app)
- Reads `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` from App Settings
- Returns `{ text: "..." }` on success, `{ error: "..." }` on failure
- Handles CORS preflight (`OPTIONS`)

---

## Local Dev (localhost)

Start the local proxy with copilot-api:
```bash
npx copilot-api start -c -m claude-sonnet-4.6 -s claude-haiku-4.5
```
Then open `index.html` in a browser — it defaults to `http://localhost:4141`.

Available models via copilot-api (as of 2026-03):
- `claude-sonnet-4.6`, `claude-opus-4.6`, `claude-haiku-4.5`, `claude-sonnet-4.5`, `claude-opus-4.5`
- `gpt-5.2`, `gpt-5.1`, `gpt-4o`, `gpt-4o-mini`
- `gemini-2.5-pro`, `gemini-3-flash-preview`

---

## Environment Variables (Azure Function App Settings)

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `OPENAI_API_KEY` | `sk-...` |
| `ALLOWED_ORIGIN` | `https://zealous-pond-0e6b2f103.2.azurestaticapps.net` |

Update keys:
```bash
az functionapp config appsettings set \
  --name "interview-prep-fn" \
  --resource-group "interview-prep-app" \
  --settings \
    ANTHROPIC_API_KEY="sk-ant-YOUR_KEY" \
    OPENAI_API_KEY="sk-YOUR_KEY" \
    ALLOWED_ORIGIN="https://zealous-pond-0e6b2f103.2.azurestaticapps.net"
```

---

## Deploy: HTML → Static Web App

Run this from your terminal (not Cloud Shell — SWA CLI has macOS traversal issues from home dir):

```bash
# 1. Copy to a clean temp folder (avoids SWA CLI macOS permission bug)
mkdir -p /tmp/swa-clean
cp ~/Desktop/InterviewApp/index.html /tmp/swa-clean/index.html
echo '{"navigationFallback":{"rewrite":"/index.html"}}' > /tmp/swa-clean/staticwebapp.config.json

# 2. Get deploy token
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name "interview-prep-web" \
  --resource-group "interview-prep-app" \
  --query "properties.apiKey" -o tsv)

# 3. Deploy
swa deploy /tmp/swa-clean \
  --deployment-token "$DEPLOY_TOKEN" \
  --env production \
  --app-location "/" \
  --swa-config-location "/tmp/swa-clean"
```

---

## Deploy: Function → Azure Function App

```bash
# 1. Zip the function folder
cd ~/Desktop/InterviewApp/function
zip -r /tmp/interview-fn.zip .

# 2. Deploy
az functionapp deployment source config-zip \
  --name "interview-prep-fn" \
  --resource-group "interview-prep-app" \
  --src /tmp/interview-fn.zip
```

---

## Roadmap / Future Ideas
- Question database (structured by type: system design, behavioral, coding)
- LeetCode question integration
- Session history / replay
- Auth (restrict to specific users)
