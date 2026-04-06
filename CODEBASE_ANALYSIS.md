# InterviewApp Codebase Analysis

## Project Structure
```
/Users/shlomimaalumi/Desktop/InterviewApp/
├── index.html                    # Main UI file (640 lines)
├── interview_session.html        # Secondary session file
├── function/                     # Azure Functions backend
│   ├── package.json             # No dependencies (minimal setup)
│   ├── host.json                # Azure Functions v2.0 config
│   └── chat/
│       ├── index.js             # Main API proxy (119 lines)
│       └── function.json
```

**NOTE:** No `leetcode/` folder exists yet. Ready to be created.

---

## 1. INDEX.HTML - FULL ANALYSIS (640 lines)

### A. CSS Variables & Theme (Lines 10-18)
```css
:root {
  --bg: #0f1117              /* Dark background */
  --surface: #1a1d27         /* Card/panel background */
  --surface2: #22263a        /* Secondary surface (darker) */
  --border: rgba(255,255,255,0.08)    /* Subtle borders */
  --border2: rgba(255,255,255,0.14)   /* Stronger borders */
  --text: #e8eaf0            /* Main text (light) */
  --text-muted: #7a80a0      /* Secondary text */
  --text-faint: #4a5070      /* Tertiary text (darkest) */
  --accent: #4f7cff          /* Primary accent (blue) */
  --accent-bg: rgba(79,124,255,0.12)
  --accent-border: rgba(79,124,255,0.3)
  --green: #3ecf8e           /* Success color */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace
  --font-ui: 'IBM Plex Sans', system-ui, sans-serif
}
```

### B. Key UI Components

#### 1. **Tab Navigation System** (Lines 27-34)
```html
.tab-nav { display: flex; background: var(--surface); }
.tab-btn { border-bottom: 2px solid transparent; transition: color .15s }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent) }
.tab-panel { display: none }
.tab-panel.active { display: flex; flex-direction: column; flex: 1 }
```

**Tabs in HTML (Lines 152-156):**
```html
<nav class="tab-nav">
  <button class="tab-btn" id="tab-help" onclick="switchTab('help')">💡 How it works</button>
  <button class="tab-btn active" id="tab-setup" onclick="switchTab('setup')">📋 Setup</button>
  <button class="tab-btn" id="tab-interview" onclick="switchTab('interview')" disabled>💬 Interview</button>
</nav>
```

**switchTab() function (Lines 391-396):**
```javascript
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}
```

#### 2. **Setup Form Panel** (Lines 225-308)

**Main textarea for question input (Line 236):**
```html
<textarea id="question-input" class="setup-field">
  Design a system that processes millions of HTTP requests per second...
</textarea>
```

**Provider Selector (Lines 270-289):**
```html
<select id="provider-select" class="setup-field" onchange="updateModelOptions()">
  <option value="custom" selected>Custom / localhost</option>
  <option value="anthropic">Anthropic Claude</option>
  <option value="openai">OpenAI</option>
</select>
<select id="model-select" class="setup-field">
  <option value="claude-sonnet-4.6" selected>claude-sonnet-4.6</option>
  <!-- ... more model options ... -->
</select>
```

**Custom URL input (Line 290-293):**
```html
<input id="custom-url" class="setup-field" type="text"
  value="http://localhost:4141"
  placeholder="http://localhost:4141"
  style="display:none;margin-top:8px">
```

**API Key input (Lines 294-300):**
```html
<input id="api-key-input" class="setup-field" type="password"
  placeholder="Paste your API key here (sk-ant-... or sk-...)"
  style="display:none;margin-top:8px"
  oninput="sessionStorage.setItem('apiKey_' + document.getElementById('provider-select').value, this.value)">
```

#### 3. **Interview Style, Focus Areas, Level Selection**

**Style Toggle (Lines 240-245):**
```html
<div class="toggle-group">
  <button class="toggle-btn" data-style="Strict" onclick="selectStyle(this)">🔥 Strict</button>
  <button class="toggle-btn active" data-style="Balanced" onclick="selectStyle(this)">⚖️ Balanced</button>
  <button class="toggle-btn" data-style="Friendly" onclick="selectStyle(this)">😊 Friendly</button>
</div>
```

**Focus Areas Checkboxes (Lines 250-257):**
```html
<div class="focus-grid">
  <label class="focus-chip checked">
    <input type="checkbox" value="Scalability" checked onchange="toggleChip(this)">
    <span class="chip-box">✓</span>Scalability
  </label>
  <!-- Reliability, Latency, Security, Cost, Observability -->
</div>
```

**Candidate Level Radios (Lines 262-266):**
```html
<div class="level-group">
  <label class="level-opt">
    <input type="radio" name="level" value="junior" onchange="selectLevel(this)">
    <span class="level-dot"></span>Junior
  </label>
  <!-- mid-level (checked), senior -->
</div>
```

#### 4. **Interview Chat Panel** (Lines 311-331)

**Question Display (Lines 312-315):**
```html
<div class="question-bar">
  <span class="q-label">Q</span>
  <span class="q-text" id="q-text"></span>
</div>
```

**Chat Container (Line 317):**
```html
<div id="chat"></div>  <!-- Messages appended here dynamically -->
```

**User Input Section (Lines 318-329):**
```html
<textarea id="user-input" placeholder="Type your answer…"></textarea>
<button id="send-btn" onclick="send()">Send →</button>
<div class="action-btns">
  <button class="action-btn" onclick="quickSend('feedback')">📊 Feedback</button>
  <button class="action-btn" onclick="quickSend('give full answer')">💡 Full Answer</button>
  <button class="action-btn" onclick="quickSend('hint')">🪄 Hint</button>
</div>
```

### C. JavaScript Key Functions

#### 1. **FUNC_URL Constant (Line 335)**
```javascript
const FUNC_URL = 'https://interview-prep-fn.azurewebsites.net/api/chat';
```
**NOTE:** This URL is currently NOT used in the frontend! The frontend makes direct API calls to:
- `http://localhost:4141/v1/messages` (custom)
- `https://api.anthropic.com/v1/messages` (anthropic)
- `https://api.openai.com/v1/chat/completions` (openai)

#### 2. **Provider-Model Mapping (Lines 337-341)**
```javascript
const MODELS = {
  custom:    ['claude-sonnet-4.6', 'claude-opus-4.6', 'claude-haiku-4.5', ...],
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', ...],
  openai:    ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', ...],
};
```

#### 3. **State Management (Lines 343-347)**
```javascript
let SYSTEM = '';              // System prompt
let history = [];             // Chat history (role/content pairs)
let selectedStyle = 'Balanced';
let selectedLevel = 'mid-level';
```

#### 4. **updateModelOptions() (Lines 350-367)**
- Updates model dropdown based on selected provider
- Shows/hides custom URL input (only for 'custom')
- Shows/hides API key input (for 'anthropic' and 'openai')
- Restores previously entered API keys from sessionStorage

#### 5. **System Prompt Builder (Lines 408-443)**
```javascript
function buildSystemPrompt(question, style, focusAreas, level) {
  const styleGuide = {
    Strict:   'Be challenging and direct...',
    Balanced: 'Be concise and slightly challenging...',
    Friendly: 'Be encouraging and supportive...'
  }[style];
  
  const levelExp = {
    junior: 'Junior engineer — probe fundamentals...',
    'mid-level': 'Mid-level engineer — expect solid fundamentals...',
    senior: 'Senior engineer — expect deep design thinking...'
  }[level];
  
  // Builds comprehensive system prompt with question, style, level, focus areas
}
```

#### 6. **callAI() Function (Lines 446-500) - KEY**

**For custom/localhost (Lines 451-460):**
```javascript
const endpoint = (customUrl || 'http://localhost:4141') + '/v1/messages';
const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, max_tokens: 1000, system: SYSTEM, messages })
});
// Expects response: d.content?.[0]?.text || d.choices?.[0]?.message?.content
```

**For Anthropic (Lines 462-478):**
```javascript
const key = sessionStorage.getItem('apiKey_anthropic') || document.getElementById('api-key-input').value.trim();
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  },
  body: JSON.stringify({ model, max_tokens: 1000, system: SYSTEM, messages })
});
```

**For OpenAI (Lines 480-497):**
```javascript
const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + key
  },
  body: JSON.stringify({ model, max_tokens: 1000, messages: openaiMessages })
});
```

#### 7. **Interview Flow (Lines 503-539)**

**startInterview():**
1. Validates question input (shakes if empty)
2. Checks for API keys if using anthropic/openai
3. Builds system prompt from question, style, focus areas, level
4. Updates header with level and style
5. Enables interview tab and switches to it
6. Calls `init()` to get first AI response

**init() (Lines 587-603):**
- Shows typing indicator
- Sends "Start." to AI
- Stores first AI response in history
- Displays first message

**send() (Lines 610-629):**
1. Gets user input text
2. Adds to chat UI
3. Pushes to history
4. Shows typing indicator
5. Calls `callAI(history)` with full conversation history
6. Displays AI response
7. Handles errors

#### 8. **UI Update Functions**

**addMsg() (Lines 559-572):**
```javascript
function addMsg(role, text) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap ' + (role === 'assistant' ? 'interviewer' : 'user');
  // Creates msg-label (INTERVIEWER or YOU)
  // Creates msg div with renderMarkdown(text)
  // Scrolls chat to bottom
}
```

**renderMarkdown() (Lines 545-557):**
- Escapes HTML entities
- Converts `**bold**`, `__bold__` to `<strong>`
- Converts `*italic*`, `_italic_` to `<em>`
- Converts `` `code` `` to inline code with styling
- Converts newlines to `<br>`

**showTyping() / removeTyping() (Lines 574-585):**
- Shows animated dots with "interviewer is thinking" text
- Removes typing indicator

#### 9. **Keyboard Input Handling (Lines 631-636)**
```javascript
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
// Shift+Enter creates new line, Enter sends message
```

#### 10. **Quick Send Buttons (Lines 605-608)**
```javascript
function quickSend(text) {
  document.getElementById('user-input').value = text;
  send();
}
```

---

## 2. FUNCTION/CHAT/INDEX.JS - FULL ANALYSIS (119 lines)

### A. HTTP Request Utility (Lines 1-16)
```javascript
const https = require('https');

function httpsPost(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
```
- Uses Node's built-in `https` module (no external dependencies)
- Streams response data
- Accumulates chunks into string
- Resolves with status code and body

### B. CORS Configuration (Lines 18-22)
```javascript
const cors = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
```
- Defaults to allowing all origins (`*`)
- Configurable via `ALLOWED_ORIGIN` env var
- Supports POST and OPTIONS (CORS preflight)

### C. Main Azure Function Handler (Lines 24-118)

**CORS Preflight (Lines 26-29):**
```javascript
if (req.method === 'OPTIONS') {
  context.res = { status: 204, headers: cors, body: '' };
  return;
}
```

**Request Parsing (Lines 31-40):**
```javascript
const { provider, model, system, messages, max_tokens } = req.body || {};

if (!provider || !messages) {
  context.res = {
    status: 400,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Missing provider or messages' })
  };
  return;
}
```

**Anthropic Provider (Lines 45-70):**
```javascript
if (provider === 'anthropic') {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured on server');

  const payload = JSON.stringify({
    model: model || 'claude-sonnet-4-5',
    max_tokens: max_tokens || 1000,
    system,
    messages
  });

  const resp = await httpsPost({
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);

  const data = JSON.parse(resp.body);
  if (data.error) throw new Error(data.error.message);
  result = data.content?.[0]?.text || 'No response';
}
```

**OpenAI Provider (Lines 72-99):**
```javascript
else if (provider === 'openai') {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured on server');

  const openaiMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages;

  const payload = JSON.stringify({
    model: model || 'gpt-4o',
    max_tokens: max_tokens || 1000,
    messages: openaiMessages
  });

  const resp = await httpsPost({
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);

  const data = JSON.parse(resp.body);
  if (data.error) throw new Error(data.error.message);
  result = data.choices?.[0]?.message?.content || 'No response';
}
```

**Error Handling & Response (Lines 101-118):**
```javascript
else {
  throw new Error('Unknown provider: ' + provider);
}

context.res = {
  status: 200,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: result })
};

} catch (err) {
  context.res = {
    status: 500,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: err.message })
  };
}
```

---

## 3. CONFIG FILES

### host.json (Azure Functions v2.0)
```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```
- Standard Azure Functions config
- Uses extension bundle for built-in bindings

### package.json
```json
{
  "name": "interview-fn",
  "version": "1.0.0",
  "description": "Interview Prep AI proxy function"
}
```
- **NO dependencies!** Uses only Node.js built-in `https` module

---

## 4. KEY ARCHITECTURAL INSIGHTS

### Frontend Architecture
- **Single-page app** with tab-based navigation
- **No build step** — vanilla JS, direct browser execution
- **Direct API calls** to Anthropic/OpenAI (not through backend)
- **API keys stored in sessionStorage** (browser memory only)
- **Markdown rendering** with custom regex patterns

### Backend Architecture
- **Azure Functions** serverless deployment
- **Node.js proxy pattern** for server-side provider calls
- **No database** — stateless, ephemeral functions
- **CORS-enabled** for browser requests
- **Environment variables** for API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, ALLOWED_ORIGIN)

### API Flow Patterns
1. **Custom/localhost:** Browser → http://localhost:4141/v1/messages (must be running)
2. **Anthropic:** Browser → api.anthropic.com (direct, needs API key in browser)
3. **OpenAI:** Browser → api.openai.com (direct, needs API key in browser)

### Message Format
```javascript
// Sent to API
{ role: 'user' | 'assistant', content: string }

// History structure
history = [
  { role: 'user', content: 'Start.' },
  { role: 'assistant', content: 'First AI response' },
  { role: 'user', content: 'User answer' },
  { role: 'assistant', content: 'AI follow-up' },
  ...
]
```

### System Prompt Pattern
Includes:
- Question
- Interviewer style (Strict/Balanced/Friendly)
- Candidate level (Junior/Mid-level/Senior)
- Focus areas (Scalability, Reliability, Latency, Security, Cost, Observability)
- Behavioral constraints (one sentence openers, call out vagueness, conversational tone)

---

## 5. CURRENT GAPS & READY FOR LEETCODE INTEGRATION

### Status
- ✅ Tab system ready
- ✅ API provider selection working
- ✅ System prompt builder working
- ✅ Message history management working
- ❌ No leetcode/ folder exists
- ❌ No LeetCode problem fetching
- ❌ No coding environment
- ❌ No problem submission

### Integration Points Available
1. **Tab 3:** Can add new "💻 LeetCode" tab alongside help/setup/interview
2. **API:** Can add leetcode functions to `/function/` backend
3. **State:** Can extend SYSTEM prompt with problem context
4. **UI:** Can reuse form components, markdown rendering, input handling

---

## 6. FILE STATISTICS
- **index.html:** 640 lines (260 CSS, 380 JavaScript, 40+ HTML elements)
- **function/chat/index.js:** 119 lines (provider routing)
- **function/package.json:** 5 lines (no dependencies)
- **function/host.json:** 7 lines (Azure config)
- **Total:** ~770 lines of code

**Codebase Quality:** Clean, well-structured, minimal dependencies, directly readable
