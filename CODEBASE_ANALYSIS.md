# InterviewApp — Codebase Analysis

## File Structure
```
InterviewApp/
├── index.html          # Single-file app (~963 lines: HTML + CSS + JS)
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
Three tabs: **💡 How it works** (default) · **📋 Setup** · **💬 Interview** (disabled until session starts)

### Setup panel
| Field | Options / Default |
|---|---|
| Candidate Level | Junior / **Mid-level** / Senior |
| Focus Areas | **Scalability**, **Reliability**, **Latency**, Security, Cost, Observability |
| Interview Question | Pre-filled example; or hit ✨ Generate |
| Interviewer Style | Strict / **Balanced** / Friendly |
| Provider | **Custom/localhost** / Anthropic / OpenAI |
| Model | **claude-sonnet-4.6** (custom default); provider-specific lists |
| Custom URL | `http://localhost:4141` (shown for custom only) |
| API Key | Stored in `sessionStorage` (shown for anthropic/openai only) |

### JS — key functions

**`callAI(messages, lowTokens, overrideSystem)`**
- `custom` → `POST <customUrl>/v1/messages` (Anthropic message format; handles both Anthropic and OpenAI response shapes)
- `anthropic` → `POST https://api.anthropic.com/v1/messages` (key from sessionStorage)
- `openai` → `POST https://api.openai.com/v1/chat/completions` (key from sessionStorage; system prompt prepended to messages array)
- `lowTokens=true` → `max_tokens: 300`, else `1000`

**`buildSystemPrompt(question, style, focusAreas, level)`**
Constructs a detailed interviewer system prompt covering:
- Style guide (Strict / Balanced / Friendly)
- Level expectations (Junior / Mid-level / Senior)
- 4-phase interview arc (Scoping → High-level → Deep dive → Wrap-up)
- Interviewer rules (no hints unless asked, no restating, no bullet points)
- Special commands: `"feedback"`, `"give full answer"`, `"hint"`

**`generateQuestion()`**
Picks random domain + twist + constraint from curated arrays, calls `callAI` with `lowTokens=true` and an empty system prompt to produce a single-sentence system design question.

**`startInterview()`**
Validates input, builds system prompt, enables Interview tab, calls `init()`.

**`init()`**
Sends `"Start."` to AI; displays first interviewer message.

**`send()` / `quickSend(text)`**
Appends user message to `history[]`, calls `callAI(history)`, renders reply.

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
```

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
