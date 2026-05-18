// ── Config ────────────────────────────────────────────
const FUNC_URL = 'https://interview-prep-fn.azurewebsites.net/api/chat';

const MODELS = {
  custom:    ['claude-sonnet-4.6', 'claude-opus-4.6', 'claude-haiku-4.5', 'claude-sonnet-4.5', 'claude-opus-4.5', 'gpt-5.2', 'gpt-5.1', 'gpt-4o', 'gpt-4o-mini', 'gemini-2.5-pro', 'gemini-3-flash-preview'],
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4', 'claude-sonnet-4'],
  openai:    ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini'],
};

// ── State ─────────────────────────────────────────────
let SYSTEM = '';
let history = [];
let selectedStyle = 'Balanced';
let selectedLevel = 'mid-level';
let selectedFormat = 'open';
let selectedDuration = 0;
let timerInterval = null;
let timerStart = null;
let currentQuestion = '';
let currentSessionId = '';
function newSessionId() {
  return 'ih_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Session persistence (browser-crash recovery) ──────
const SESSION_KEY = 'interviewSession_v1';
let _restoring = false;

// ── Safe localStorage write (#5 — quota retry) ────────
// Returns true on success, false on giving up. On QuotaExceededError it tries to
// reclaim space by trimming interviewHistory_v1 + studyHistory_v1, then retries.
// If still failing, it prompts the user once per session.
let _quotaWarned = false;
function _isQuotaErr(e) {
  return e && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}
function _trimListKey(key, max) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length <= max) return false;
    localStorage.setItem(key, JSON.stringify(arr.slice(0, max)));
    return true;
  } catch (_) { return false; }
}
function safeSetItem(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch (e) {
    if (!_isQuotaErr(e)) return false;
    // Try to free space: aggressively trim history archives, then retry.
    const trimmed = _trimListKey('interviewHistory_v1', 10) || _trimListKey('studyHistory_v1', 25);
    if (trimmed) {
      try { localStorage.setItem(key, value); return true; } catch (_) {}
    }
    if (!_quotaWarned) {
      _quotaWarned = true;
      try {
        if (typeof showErr === 'function') showErr('Browser storage is full — couldn’t auto-save. Open 📚 History and delete old sessions to free space.');
        if (confirm('Browser storage is full. Delete ALL saved interview & study history to keep auto-save working? (Active session stays in memory.)')) {
          try { localStorage.removeItem('interviewHistory_v1'); } catch(_) {}
          try { localStorage.removeItem('studyHistory_v1'); } catch(_) {}
          try { localStorage.setItem(key, value); return true; } catch(_) {}
        }
      } catch (_) {}
    }
    return false;
  }
}

function saveSession() {
  if (_restoring || !currentQuestion) return;
  try {
    const wbEls = (window._excalidrawAPI
      ? window._excalidrawAPI.getSceneElements().filter(el => !el.isDeleted)
      : []);
    const data = {
      question: currentQuestion,
      sessionId: currentSessionId,
      history: history,
      system: SYSTEM,
      level: selectedLevel,
      style: selectedStyle,
      format: selectedFormat,
      duration: selectedDuration,
      focusAreas: getFocusAreas(),
      companyContext: getCompanyContext(),
      timerStart: timerStart,
      wb: wbEls,
      savedAt: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (e) {
    // Retry through safe writer (handles quota); avoid double-stringify on serialization errors.
    if (_isQuotaErr(e)) {
      try { safeSetItem(SESSION_KEY, JSON.stringify(data)); } catch (_) {}
    }
  }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

// ── Past-interviews archive ───────────────────────────
const HISTORY_KEY = 'interviewHistory_v1';
const HISTORY_MAX = 20;
function loadHistoryList() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function saveHistoryList(list) {
  safeSetItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
}
function snapshotToHistory() {
  if (!currentQuestion || !history.length) return;
  const realMsgs = history.filter(m => !(m.role === 'user' && m.content === 'Start.'));
  if (!realMsgs.length) return;
  const wbEls = (window._excalidrawAPI
    ? window._excalidrawAPI.getSceneElements().filter(el => !el.isDeleted)
    : []);
  if (!currentSessionId) currentSessionId = newSessionId();
  const list = loadHistoryList();
  const existing = list.find(e => e.id === currentSessionId);
  const entry = {
    id: currentSessionId,
    question: currentQuestion,
    history: history.slice(),
    level: selectedLevel,
    style: selectedStyle,
    format: selectedFormat,
    duration: selectedDuration,
    focusAreas: getFocusAreas(),
    companyContext: getCompanyContext(),
    elapsedSec: timerStart ? Math.floor((Date.now() - timerStart) / 1000) : 0,
    wb: wbEls,
    savedAt: Date.now(),
    createdAt: existing ? (existing.createdAt || existing.savedAt || Date.now()) : Date.now()
  };
  // Upsert: if a snapshot for this sessionId already exists, replace it in place
  const next = list.filter(e => e.id !== currentSessionId);
  next.unshift(entry);
  saveHistoryList(next);
}
function deleteHistoryEntry(id) {
  saveHistoryList(loadHistoryList().filter(e => e.id !== id));
  renderHistory();
}

// ── Setup UI ──────────────────────────────────────────
function updateModelOptions() {
  const p = document.getElementById('provider-select').value;
  const ms = document.getElementById('model-select');
  const cu = document.getElementById('custom-url');
  const ak = document.getElementById('api-key-input');
  const hint = document.getElementById('api-key-hint');
  ms.innerHTML = MODELS[p].map(m => `<option value="${m}">${m}</option>`).join('');
  cu.style.display = p === 'custom' ? 'block' : 'none';
  const needsKey = p === 'anthropic' || p === 'openai';
  ak.style.display = needsKey ? 'block' : 'none';
  hint.style.display = needsKey ? 'block' : 'none';
  if (needsKey) {
    ak.placeholder = p === 'anthropic'
      ? 'Paste your Anthropic API key (sk-ant-...)'
      : 'Paste your OpenAI API key (sk-...)';
    ak.value = sessionStorage.getItem('apiKey_' + p) || '';
  }
}

function selectStyle(btn) {
  document.querySelectorAll('.toggle-btn[data-style]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedStyle = btn.dataset.style;
  if (typeof updateSectionSummaries === 'function') updateSectionSummaries();
}

function selectFormat(btn) {
  document.querySelectorAll('.toggle-btn[data-format]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedFormat = btn.dataset.format;
  const hint = document.getElementById('format-hint');
  if (selectedFormat === 'product') {
    hint.textContent = 'User-facing apps (Uber, Ticketmaster). Flow: Requirements → Core Entities → API → High-Level Design → Deep Dives. Primary goal: functional requirements.';
  } else if (selectedFormat === 'infra') {
    hint.textContent = 'Backend / data systems (pipelines, queues). Flow: Requirements → System Interface & Data Flow → High-Level Design → Deep Dives. Primary goal: non-functional (scale, reliability).';
  } else {
    hint.textContent = 'Free-form — interviewer guides organically';
  }
  if (typeof updateSectionSummaries === 'function') updateSectionSummaries();
}

function selectDuration(btn) {
  document.querySelectorAll('.toggle-btn[data-duration]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedDuration = parseInt(btn.dataset.duration);
  if (typeof updateSectionSummaries === 'function') updateSectionSummaries();
}

function startTimer() {
  timerStart = Date.now();
  const el = document.getElementById('q-timer');
  const elapsedEl = document.getElementById('timer-elapsed');
  const durEl = document.getElementById('timer-duration');
  el.style.display = '';
  durEl.textContent = selectedDuration ? ' / ' + selectedDuration + ':00' : '';
  el.className = 'q-timer';
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const secs = Math.floor((Date.now() - timerStart) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    elapsedEl.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    if (selectedDuration > 0) {
      const totalSecs = selectedDuration * 60;
      if (secs >= totalSecs) el.className = 'q-timer overtime';
      else if (secs >= totalSecs * 0.85) el.className = 'q-timer warn';
      else el.className = 'q-timer';
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function toggleChip(cb) {
  const chip = cb.closest('.focus-chip');
  chip.classList.toggle('checked', cb.checked);
  chip.querySelector('.chip-box').textContent = cb.checked ? '✓' : '';
}

function selectLevel(r) {
  document.querySelectorAll('.level-opt').forEach(l => l.classList.remove('checked'));
  r.closest('.level-opt').classList.add('checked');
  selectedLevel = r.value;
}

function getFocusAreas() {
  return [...document.querySelectorAll('.focus-chip input:checked')].map(c => c.value);
}

// === Custom focus areas + collapsible setup sections ===
const SETUP_COLLAPSED_KEY = 'setupCollapsed_v1';
const SETUP_DEFAULT_COLLAPSED = ['company','format','style','duration','provider','voice'];

function showFocusAddForm() {
  document.getElementById('focus-add-btn').style.display = 'none';
  document.getElementById('focus-add-form').style.display = 'flex';
  setTimeout(() => document.getElementById('focus-add-input').focus(), 10);
}
function cancelAddFocus() {
  document.getElementById('focus-add-form').style.display = 'none';
  document.getElementById('focus-add-btn').style.display = '';
  document.getElementById('focus-add-input').value = '';
}
function confirmAddFocus() {
  const inp = document.getElementById('focus-add-input');
  const val = inp.value.trim();
  if (!val) { inp.focus(); return; }
  // Dedupe (case-insensitive)
  const exists = [...document.querySelectorAll('.focus-chip input')].some(c => c.value.toLowerCase() === val.toLowerCase());
  if (exists) { inp.focus(); inp.select(); return; }
  const grid = document.getElementById('focus-grid');
  const addBtn = document.getElementById('focus-add-btn');
  const label = document.createElement('label');
  label.className = 'focus-chip checked custom';
  label.innerHTML = '<input type="checkbox" value="' + val.replace(/"/g,'&quot;') + '" checked onchange="toggleChip(this)"><span class="chip-box">✓</span><span class="chip-text"></span><button type="button" class="chip-remove" title="Remove" onclick="event.preventDefault();event.stopPropagation();this.closest(\'.focus-chip\').remove()">✕</button>';
  label.querySelector('.chip-text').textContent = val;
  grid.insertBefore(label, addBtn);
  cancelAddFocus();
}

function toggleSetupSection(labelEl) {
  const fg = labelEl.closest('.field-group');
  fg.classList.toggle('open');
  saveSetupCollapsed();
}
function saveSetupCollapsed() {
  const collapsed = [...document.querySelectorAll('.field-group.collapsible')]
    .filter(fg => !fg.classList.contains('open'))
    .map(fg => fg.dataset.section);
  try { localStorage.setItem(SETUP_COLLAPSED_KEY, JSON.stringify(collapsed)); } catch(e){}
}
function loadSetupCollapsed() {
  let collapsed = SETUP_DEFAULT_COLLAPSED;
  try {
    const raw = localStorage.getItem(SETUP_COLLAPSED_KEY);
    if (raw) collapsed = JSON.parse(raw);
  } catch(e){}
  document.querySelectorAll('.field-group.collapsible').forEach(fg => {
    fg.classList.toggle('open', !collapsed.includes(fg.dataset.section));
  });
}
function updateSectionSummaries() {
  const cc = document.getElementById('company-context');
  const sumC = document.getElementById('sum-company');
  if (cc && sumC) {
    const v = (cc.value || '').trim();
    sumC.textContent = v ? (v.length > 32 ? v.slice(0,32) + '…' : v) : '';
  }
  const fmtBtn = document.querySelector('[data-format].active');
  const sumF = document.getElementById('sum-format');
  if (fmtBtn && sumF) sumF.textContent = fmtBtn.textContent.replace(/^[^\w]+/,'').trim();
  const stBtn = document.querySelector('[data-style].active');
  const sumS = document.getElementById('sum-style');
  if (stBtn && sumS) sumS.textContent = stBtn.dataset.style;
  const durBtn = document.querySelector('[data-duration].active');
  const sumD = document.getElementById('sum-duration');
  if (durBtn && sumD) sumD.textContent = durBtn.textContent.trim();
  const prov = document.getElementById('provider-select');
  const mod = document.getElementById('model-select');
  const sumP = document.getElementById('sum-provider');
  if (prov && mod && sumP) {
    const provLabel = prov.options[prov.selectedIndex].textContent.split(' /')[0].split(' ')[0];
    sumP.textContent = provLabel + ' · ' + mod.value;
  }
}
// Init on DOM ready
document.addEventListener('DOMContentLoaded', function(){
  try { loadSetupCollapsed(); updateSectionSummaries(); } catch(e){}
  try {
    const cb = document.getElementById('voice-mode-toggle');
    if (cb) cb.checked = voiceMode;
    setVoiceMode(voiceMode);
  } catch(e){}
});

function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}

function showErr(msg) {
  const b = document.getElementById('err-banner');
  b.textContent = msg;
  b.classList.add('show');
}
function hideErr() {
  document.getElementById('err-banner').classList.remove('show');
}

// ── API-key setup modal (#1 + part of #4) ─────────────
function openApiSetupModal(provider, reasonText) {
  const m = document.getElementById('apisetup-modal');
  const r = document.getElementById('apisetup-reason');
  if (!m || !r) return;
  let label = 'Couldn’t reach the AI provider.';
  if (provider === 'custom')    label = 'Couldn’t reach the local AI endpoint (copilot-api).';
  if (provider === 'anthropic') label = 'There’s a problem with the Anthropic provider.';
  if (provider === 'openai')    label = 'There’s a problem with the OpenAI provider.';
  r.innerHTML = '<strong>' + label + '</strong>' + (reasonText ? '<br><span style="opacity:0.85">' + escapeHtml(reasonText) + '</span>' : '');
  m.classList.add('show');
}
function closeApiSetupModal() {
  const m = document.getElementById('apisetup-modal');
  if (m) m.classList.remove('show');
}
function setProviderInSetup(p) {
  const sel = document.getElementById('provider-select');
  if (!sel) return;
  sel.value = p;
  if (typeof updateModelOptions === 'function') updateModelOptions();
  if (typeof updateSectionSummaries === 'function') updateSectionSummaries();
  const ak = document.getElementById('api-key-input');
  if (ak) ak.focus();
}

// ── Generate question ─────────────────────────────────
const GEN_DOMAINS = [
  'a ride-sharing platform','a global video streaming service','a food delivery marketplace',
  'a real-time collaborative document editor','a distributed payments system','a social media feed',
  'a large-scale notification service','an e-commerce inventory system','a live sports score tracker',
  'a hotel/flight booking platform','a multi-player online game','a music streaming service',
  'a healthcare appointment scheduler','an IoT sensor data pipeline','a URL shortener at global scale',
  'a cloud file-storage service','a real-time chat application','a search autocomplete system',
  'a fraud detection engine','a distributed job/task queue','a content delivery network',
  'a digital advertising bidding system','a stock trading platform','a code deployment pipeline (CI/CD)',
  'a product recommendation engine','a log aggregation and alerting platform','a location tracking service',
  'a social graph (who follows whom)','a distributed key-value store','a flash-sale / ticket-booking system',
];
const GEN_TWISTS = [
  'under bursty, unpredictable traffic spikes',
  'with strict data-residency requirements across 5 regions',
  'where the P99 latency must stay under 100ms globally',
  'while keeping costs linear with user growth',
  'with zero-downtime rolling deployments',
  'that must continue operating during a full datacenter failure',
  'where eventual consistency is acceptable but stale reads must be bounded to 2 seconds',
  'with end-to-end encryption and no plaintext storage',
  'supporting both mobile clients on flaky networks and desktop browsers',
  'where the write path must be idempotent to handle duplicate requests',
  'with a hard multi-tenancy isolation requirement',
  'handling 10x traffic on major holidays without pre-provisioning',
  'where the audit log must be tamper-proof',
  'optimised for read-heavy workloads (1000:1 read-to-write ratio)',
  'with a quota/rate-limit system per tenant',
];
const GEN_CONSTRAINTS = [
  'Assume you start from scratch with a small team.',
  'The existing monolith must be incrementally migrated — no big bang rewrite.',
  'Third-party vendor APIs are unreliable (up to 5% error rate).',
  'Budget is tight — avoid managed services where a simple OSS solution suffices.',
  'The team has no dedicated DBA — keep operational overhead low.',
];
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function generateQuestion() {
  const btn = document.getElementById('gen-btn');
  const qi  = document.getElementById('question-input');
  btn.disabled = true;
  btn.textContent = '✨ Generating…';
  hideErr();

  const focus = getFocusAreas();
  const focusStr = focus.length ? `Focus areas: ${focus.join(', ')}.` : '';
  const company = getCompanyContext();
  const companyStr = company ? `Company context (use as inspiration for the system being designed): ${company}` : '';
  const levelDesc = {
    junior:      'a junior engineer (1–3 years exp). Keep it straightforward — one main service, basic scale.',
    'mid-level': 'a mid-level engineer (3–6 years exp). Expect distributed components and trade-off awareness.',
    senior:      'a senior engineer (6+ years exp). Should involve complex distributed systems, failure modes, and scale challenges.'
  }[selectedLevel];

  // Inject random ingredients so each generation is unique
  const domain = pick(GEN_DOMAINS);
  const twist  = pick(GEN_TWISTS);
  const extra  = Math.random() < 0.5 ? pick(GEN_CONSTRAINTS) : '';

  const prompt = `You are generating the opening question for a system design interview.

Use these ingredients as INTERNAL INSPIRATION ONLY — do NOT mention them explicitly or bake constraints into the question:
- Domain: ${domain}
- Scenario flavour: ${twist}
${extra ? `- Background context: ${extra}` : ''}
Candidate level: ${levelDesc}
${focusStr}
${companyStr}

OUTPUT RULES — follow these exactly:
- One sentence only. Hard limit.
- Start with "Design a ..." or "Design the ..." — nothing else.
- Name the system and optionally a scale hint (e.g. "at scale", "for millions of users"). That's it.
- NO sub-questions. NO "walk me through". NO constraints, trade-offs, or requirements listed.
- The interviewer will probe all of that during the session — the question must leave room for discovery.
- Output ONLY the question — no title, no preamble, no quotes, no punctuation beyond a final period.

Good examples:
  Design a push notification system for a mobile app with millions of users.
  Design a real-time ride-matching service at global scale.
  Design a distributed rate limiter for a high-traffic API gateway.

Bad examples (do NOT produce these):
  Design a system where idempotency is critical and the team has no DBA... [too many constraints]
  Design X — walk me through your architecture and the trade-offs... [sub-questions baked in]`;

  try {
    const q = await callAI([{ role: 'user', content: prompt }], /* lowTokens */ true, /* overrideSystem */ '');
    qi.value = q.trim();
    qi.focus();
  } catch (e) {
    handleAIError(e, 'Could not generate question');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Generate question for my level & focus';
  }
}



// ── AI call ───────────────────────────────────────────
// ── Token usage tracking ──────────────────────────────
const TOKEN_STATS_KEY = 'tokenStats_v1';
let tokenSession = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0, calls: 0, last: null };
function loadTokenStatsAllTime() {
  try {
    const raw = localStorage.getItem(TOKEN_STATS_KEY);
    const a = raw ? JSON.parse(raw) : null;
    return a && typeof a === 'object' ? a : { input: 0, output: 0, cacheRead: 0, cacheCreate: 0, calls: 0, firstSeen: Date.now() };
  } catch (e) { return { input: 0, output: 0, cacheRead: 0, cacheCreate: 0, calls: 0, firstSeen: Date.now() }; }
}
function saveTokenStatsAllTime(s) {
  try { localStorage.setItem(TOKEN_STATS_KEY, JSON.stringify(s)); } catch (e) {}
}
function recordTokenUsage(provider, model, usage) {
  if (!usage || typeof usage !== 'object') return;
  // Anthropic: input_tokens / output_tokens / cache_read_input_tokens / cache_creation_input_tokens
  // OpenAI: prompt_tokens / completion_tokens
  const input  = usage.input_tokens  ?? usage.prompt_tokens     ?? 0;
  const output = usage.output_tokens ?? usage.completion_tokens ?? 0;
  const cacheRead   = usage.cache_read_input_tokens     ?? 0;
  const cacheCreate = usage.cache_creation_input_tokens ?? 0;
  tokenSession.input  += input;
  tokenSession.output += output;
  tokenSession.cacheRead   += cacheRead;
  tokenSession.cacheCreate += cacheCreate;
  tokenSession.calls += 1;
  tokenSession.last = { provider, model, input, output, cacheRead, cacheCreate, at: Date.now() };
  const all = loadTokenStatsAllTime();
  all.input  += input;
  all.output += output;
  all.cacheRead   += cacheRead;
  all.cacheCreate += cacheCreate;
  all.calls += 1;
  all.lastSeen = Date.now();
  saveTokenStatsAllTime(all);
}
function fmtNum(n) { return (n || 0).toLocaleString(); }
function openTokenStats() {
  const all = loadTokenStatsAllTime();
  const s = tokenSession;
  const sTotal = s.input + s.output;
  const aTotal = all.input + all.output;
  const cachePctSession = s.input ? Math.round((s.cacheRead / s.input) * 100) : 0;
  const cachePctAll     = all.input ? Math.round((all.cacheRead / all.input) * 100) : 0;
  const last = s.last;
  const lastBlock = last
    ? `<div style="margin-top:14px;padding:10px;background:var(--surface);border:0.5px solid var(--border2);border-radius:6px">
         <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Last call</div>
         <div>${last.provider} · ${last.model}</div>
         <div>Input: <b>${fmtNum(last.input)}</b> · Output: <b>${fmtNum(last.output)}</b>${last.cacheRead ? ' · Cache read: <b>' + fmtNum(last.cacheRead) + '</b>' : ''}${last.cacheCreate ? ' · Cache create: <b>' + fmtNum(last.cacheCreate) + '</b>' : ''}</div>
       </div>`
    : '<div style="margin-top:14px;color:var(--text-muted);font-size:11px">No API calls yet this session.</div>';
  document.getElementById('tok-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div style="padding:12px;background:var(--surface);border:0.5px solid var(--border2);border-radius:8px">
        <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Current session</div>
        <div style="font-size:20px;font-weight:600">${fmtNum(sTotal)} <span style="font-size:11px;color:var(--text-muted);font-weight:400">tokens</span></div>
        <div style="margin-top:6px">Input: <b>${fmtNum(s.input)}</b> · Output: <b>${fmtNum(s.output)}</b></div>
        <div style="color:var(--text-muted);font-size:11px;margin-top:4px">${s.calls} call${s.calls===1?'':'s'} · cache hit ${cachePctSession}%</div>
      </div>
      <div style="padding:12px;background:var(--surface);border:0.5px solid var(--border2);border-radius:8px">
        <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">All time (persisted)</div>
        <div style="font-size:20px;font-weight:600">${fmtNum(aTotal)} <span style="font-size:11px;color:var(--text-muted);font-weight:400">tokens</span></div>
        <div style="margin-top:6px">Input: <b>${fmtNum(all.input)}</b> · Output: <b>${fmtNum(all.output)}</b></div>
        <div style="color:var(--text-muted);font-size:11px;margin-top:4px">${all.calls} call${all.calls===1?'':'s'} · cache hit ${cachePctAll}%</div>
      </div>
    </div>
    ${lastBlock}
    <div style="margin-top:14px;font-size:11px;color:var(--text-muted);line-height:1.5">
      <b>Tip:</b> Anthropic prompt caching is enabled on the system prompt — cache reads cost ~10% of normal input tokens, so a high cache-hit % means you're paying far less than the raw input count suggests. Switching providers mid-session disables caching.
    </div>`;
  document.getElementById('tok-modal').classList.add('show');
}
function closeTokenStats() { document.getElementById('tok-modal').classList.remove('show'); }
function resetTokenStats() {
  if (!confirm('Clear all-time token totals? (current session counter is unaffected)')) return;
  saveTokenStatsAllTime({ input: 0, output: 0, cacheRead: 0, cacheCreate: 0, calls: 0, firstSeen: Date.now() });
  openTokenStats();
}

// Collapse consecutive same-role messages (API requires strict alternation).
// Adjacent user turns are joined with '\n\n'; adjacent assistant turns keep only the last.
function sanitizeMessages(messages) {
  const out = [];
  for (const msg of messages) {
    if (out.length && out[out.length - 1].role === msg.role) {
      if (msg.role === 'user') {
        out[out.length - 1] = { role: 'user', content: out[out.length - 1].content + '\n\n' + msg.content };
      } else {
        out[out.length - 1] = { role: 'assistant', content: msg.content };
      }
    } else {
      out.push({ role: msg.role, content: msg.content });
    }
  }
  // Must start with user
  if (out.length && out[0].role !== 'user') out.shift();
  return out;
}

// AIError: structured error so call-sites can show specific guidance.
// codes: 'setup' | 'auth' | 'rate' | 'server' | 'network' | 'unknown'
class AIError extends Error {
  constructor(message, code, provider) { super(message); this.code = code; this.provider = provider; }
}
function classifyAIError(provider, status, bodyErrMsg) {
  if (status === 401 || status === 403) {
    if (provider === 'anthropic') return new AIError('Your Anthropic API key looks invalid or unauthorized. Double-check the key in Setup.', 'auth', provider);
    if (provider === 'openai')    return new AIError('Your OpenAI API key looks invalid or unauthorized. Double-check the key in Setup.', 'auth', provider);
    return new AIError('The local API rejected the request (auth). Check your copilot-api login.', 'auth', provider);
  }
  if (status === 429) {
    return new AIError("You're being rate-limited by the provider. Wait ~60 seconds and try again.", 'rate', provider);
  }
  if (status >= 500) {
    return new AIError('The AI provider returned a server error (' + status + '). Try again in a moment.', 'server', provider);
  }
  return new AIError(bodyErrMsg || ('Request failed (' + status + ').'), 'unknown', provider);
}
async function postJSON(url, opts, provider) {
  let res;
  try {
    res = await fetch(url, opts);
  } catch (netErr) {
    // Network / CORS / DNS / connection refused
    if (provider === 'custom') {
      throw new AIError('Cannot reach the local AI endpoint at ' + url + '. Either start copilot-api locally OR switch to Anthropic/OpenAI and paste a key.', 'setup', provider);
    }
    throw new AIError('Network error reaching ' + provider + '. Check your connection and try again.', 'network', provider);
  }
  let data = null;
  try { data = await res.json(); } catch (_) { /* non-JSON response */ }
  if (!res.ok) {
    throw classifyAIError(provider, res.status, data && data.error && (data.error.message || data.error));
  }
  if (data && data.error) {
    // 200 OK but body contains an error object
    throw classifyAIError(provider, 0, data.error.message || String(data.error));
  }
  return data || {};
}
async function callAI(messages, lowTokens = false, overrideSystem = null) {
  messages = sanitizeMessages(messages);
  const provider  = document.getElementById('provider-select').value;
  const model     = document.getElementById('model-select').value;
  const customUrl = document.getElementById('custom-url').value.trim();
  const max_tokens = lowTokens ? 300 : 8000;
  const sysPrompt = overrideSystem !== null ? overrideSystem : SYSTEM;
  // Anthropic prompt-cache: send system as a cacheable block when long enough (>= ~1024 tok ≈ 4000 chars).
  // Cache TTL is 5 min — keeps every follow-up turn within a session warm. Cuts input billing ~90% on the system block.
  const anthropicSystem = (sysPrompt && sysPrompt.length >= 4000)
    ? [{ type: 'text', text: sysPrompt, cache_control: { type: 'ephemeral' } }]
    : sysPrompt;

  if (provider === 'custom') {
    const endpoint = (customUrl || 'http://localhost:4141') + '/v1/messages';
    const d = await postJSON(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, max_tokens, system: anthropicSystem, messages })
    }, 'custom');
    recordTokenUsage(provider, model, d.usage);
    return d.content?.[0]?.text || d.choices?.[0]?.message?.content || 'No response';
  }

  if (provider === 'anthropic') {
    const key = sessionStorage.getItem('apiKey_anthropic') || document.getElementById('api-key-input').value.trim();
    if (!key) throw new AIError('No Anthropic API key provided. Please paste your key in Setup.', 'setup', 'anthropic');
    const d = await postJSON('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model, max_tokens, system: anthropicSystem, messages })
    }, 'anthropic');
    recordTokenUsage(provider, model, d.usage);
    return d.content?.[0]?.text || 'No response';
  }

  if (provider === 'openai') {
    const key = sessionStorage.getItem('apiKey_openai') || document.getElementById('api-key-input').value.trim();
    if (!key) throw new AIError('No OpenAI API key provided. Please paste your key in Setup.', 'setup', 'openai');
    const openaiMessages = sysPrompt
      ? [{ role: 'system', content: sysPrompt }, ...messages]
      : messages;
    const d = await postJSON('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({ model, max_tokens, messages: openaiMessages })
    }, 'openai');
    recordTokenUsage(provider, model, d.usage);
    return d.choices?.[0]?.message?.content || 'No response';
  }

  throw new AIError('Unknown provider: ' + provider, 'setup', provider);
}

// Centralized AI error handler: shows banner with status-specific guidance and surfaces the setup modal when needed.
function handleAIError(e, context) {
  const ctx = context ? (context + ': ') : '';
  if (e && e.code === 'setup') {
    showErr(ctx + e.message);
    openApiSetupModal(e.provider, e.message);
    return;
  }
  if (e && e.code === 'auth') {
    showErr(ctx + e.message);
    openApiSetupModal(e.provider, e.message);
    return;
  }
  if (e && e.code === 'rate') { showErr(ctx + e.message); return; }
  if (e && e.code === 'network') { showErr(ctx + e.message); return; }
  if (e && e.code === 'server') { showErr(ctx + e.message); return; }
  showErr(ctx + ((e && e.message) || 'Unknown error.'));
}

// ── Interview flow ────────────────────────────────────
// Sample-question presets — one-click from Home to a pre-configured interview.
const SAMPLE_QUESTIONS = {
  twitter:   "Design Twitter's home feed: 500M DAU, sub-200ms read latency, supports both celebrity fan-out (100M+ followers) and chronological/ranked timelines. Walk me through how you'd build it.",
  shortener: "Design a global URL shortener (like bit.ly) handling 10B redirects/day. Sub-50ms redirect latency worldwide, custom aliases, click analytics, and abuse protection.",
  uber:      "Design Uber's dispatch and matching system: match riders to nearby drivers in <2s, support surge pricing, handle trip state transitions, and scale to 30M trips/day across regions."
};
function startSampleInterview(key) {
  const q = SAMPLE_QUESTIONS[key];
  if (!q) return;
  // Move into Setup so the user can see (and tweak) what was pre-filled, then start
  switchTab('setup');
  const qi = document.getElementById('question-input');
  if (qi) qi.value = q;
  // Defaults are already mid-level / Balanced / open / No-limit per markup, so just kick off
  startInterview();
}
async function startInterview() {
  hideErr();
  const qi = document.getElementById('question-input');
  const q  = qi.value.trim();
  if (!q) {
    qi.classList.remove('shake');
    void qi.offsetWidth;
    qi.classList.add('shake');
    qi.focus();
    return;
  }

  const provider = document.getElementById('provider-select').value;
  if (provider === 'anthropic' || provider === 'openai') {
    const key = sessionStorage.getItem('apiKey_' + provider) || document.getElementById('api-key-input').value.trim();
    if (!key) {
      const label = (provider === 'anthropic' ? 'Anthropic' : 'OpenAI');
      showErr('Please paste your ' + label + ' API key above before starting.');
      openApiSetupModal(provider, 'No ' + label + ' API key provided.');
      return;
    }
  }

  SYSTEM = buildSystemPrompt(q, selectedStyle, getFocusAreas(), selectedLevel, selectedFormat, getCompanyContext());
  // Snapshot any prior in-flight session into history before overwriting
  snapshotToHistory();
  currentQuestion = q;
  currentSessionId = newSessionId();
  document.getElementById('q-text').textContent = q;
  document.getElementById('header-sub').textContent =
    selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1) + ' · ' + selectedStyle;

  document.getElementById('tab-interview').disabled = false;
  document.getElementById('status-dot').style.display = 'block';
  switchTab('interview');
  history = [];
  document.getElementById('chat').innerHTML = '';
  clearSession();
  tokenSession = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0, calls: 0, last: null };
  startTimer();

  const startBtn = document.getElementById('start-btn');
  startBtn.disabled = true;
  await init();
  startBtn.disabled = false;
}

const chat  = document.getElementById('chat');
const input = document.getElementById('user-input');
const btn   = document.getElementById('send-btn');

function renderMarkdown(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code style="font-family:var(--font-mono);font-size:12px;background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px">$1</code>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

function addMsg(role, text, histIdx) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap ' + (role === 'assistant' ? 'interviewer' : 'user');
  const lbl = document.createElement('div');
  lbl.className = 'msg-label';
  lbl.textContent = role === 'assistant' ? 'INTERVIEWER' : 'YOU';
  const msg = document.createElement('div');
  msg.className = 'msg';
  msg.innerHTML = renderMarkdown(text);
  wrap.appendChild(lbl);
  wrap.appendChild(msg);
  if (role === 'user' && histIdx !== undefined) {
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.title = 'Edit message';
    editBtn.textContent = '✏️';
    editBtn.onclick = () => editMsg(wrap, msg, histIdx);
    wrap.appendChild(editBtn);
  }
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  const t = document.createElement('div');
  t.className = 'typing-indicator';
  t.id = 'typing';
  t.innerHTML = '<div class="typing-label">INTERVIEWER</div><div class="typing-bubble"><div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>';
  chat.appendChild(t);
  chat.scrollTop = chat.scrollHeight;
}
function removeTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

function buildOpenerInstant(question, style, format) {
  // Strip trailing period for clean inline rendering
  const q = question.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/, '');
  const formatHint = format === 'feedback'
    ? "I'll give structured feedback at the end — type \"feedback\" any time for a checkpoint."
    : (format === 'coding' ? "We'll keep it tight and code-focused." : "");
  const openersByStyle = {
    strict:    [`Question: **${q}.** The floor is yours.`,
                `Here's the problem: **${q}.** Begin.`,
                `Your task: **${q}.** Where do you start?`],
    balanced:  [`Welcome — here's the problem: **${q}.** Where would you like to start?`,
                `Here's your question: **${q}.** Take it from the top.`,
                `The question is: **${q}.** Drive the design — where do you begin?`],
    friendly:  [`Hey! Let's dig into this one: **${q}.** Where would you like to start?`,
                `Welcome — fun problem: **${q}.** What's your opening move?`,
                `Alright, here we go: **${q}.** Drive — where do you start?`],
  };
  const list = openersByStyle[style] || openersByStyle.balanced;
  const opener = list[Math.floor(Math.random() * list.length)];
  return formatHint ? `${opener}\n\n${formatHint}` : opener;
}

async function init() {
  btn.disabled = true;
  // INSTANT opener — built from a local template so the user sees the question framed immediately,
  // no round-trip to the model. The AI takes over from message #2 onward with full history context.
  try {
    const opener = buildOpenerInstant(currentQuestion, selectedStyle, selectedFormat);
    history.push({ role: 'user', content: 'Start.' });
    history.push({ role: 'assistant', content: opener });
    addMsg('assistant', opener);
    speak(opener);
    saveSession();
  } catch (e) {
    handleAIError(e, 'Could not start');
    switchTab('setup');
  }
  btn.disabled = false;
  input.focus();
}

function quickSend(text) {
  if (btn.disabled) return;
  document.getElementById('user-input').value = text;
  send();
}

async function restartInterview() {
  if (!currentQuestion) return;
  if (!confirm('Restart this interview? Your current chat and whiteboard will be cleared. The same question, level, and style will be used.')) return;
  // Snapshot current run into past-interviews history before resetting
  snapshotToHistory();
  // New sessionId so the restarted run becomes its own history entry
  currentSessionId = newSessionId();
  // Reset state — keep currentQuestion, SYSTEM, level/style/format/duration/focus
  history = [];
  document.getElementById('chat').innerHTML = '';
  // Clear whiteboard
  if (window._excalidrawAPI) {
    try { window._excalidrawAPI.updateScene({ elements: [] }); } catch (e) {}
  }
  clearSession();
  startTimer();
  await init();
}

// ── Export current session as Markdown ───────────────
function fmtDuration(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function buildWhiteboardPngBlob(entry) {
  if (!(entry.wb && entry.wb.length && window.ExcalidrawLib && ExcalidrawLib.exportToBlob)) return null;
  try {
    return await ExcalidrawLib.exportToBlob({
      elements: entry.wb,
      appState: { exportBackground: true, viewBackgroundColor: '#ffffff', exportPadding: 24 },
      mimeType: 'image/png',
    });
  } catch (e) { return null; }
}
async function buildSessionMarkdown(entry, opts) {
  opts = opts || {};
  const baseName = opts.baseName || entryBaseName(entry);
  const dt = new Date(entry.savedAt || Date.now());
  const lines = [];
  lines.push('# Interview Session');
  lines.push('');
  lines.push('**Question:** ' + entry.question);
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push('| Date | ' + dt.toLocaleString() + ' |');
  lines.push('| Level | ' + entry.level + ' |');
  lines.push('| Style | ' + entry.style + ' |');
  lines.push('| Format | ' + entry.format + ' |');
  lines.push('| Duration | ' + entry.duration + ' min planned, ' + fmtDuration(entry.elapsedSec || 0) + ' elapsed |');
  if (entry.focusAreas && entry.focusAreas.length) lines.push('| Focus Areas | ' + entry.focusAreas.join(', ') + ' |');
  if (entry.companyContext) lines.push('| Company | ' + entry.companyContext.replace(/\|/g, '\\|').replace(/\n/g, ' ') + ' |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Transcript');
  lines.push('');
  for (const m of entry.history) {
    if (m.role === 'user' && m.content === 'Start.') continue;
    lines.push('### ' + (m.role === 'assistant' ? 'Interviewer' : 'You'));
    lines.push('');
    lines.push(m.content);
    lines.push('');
  }
  // Whiteboard — reference sibling files so markdown previewers actually render them.
  if (entry.wb && entry.wb.length) {
    lines.push('---');
    lines.push('');
    lines.push('## Whiteboard');
    lines.push('');
    if (opts.includePngLink !== false) {
      lines.push('![Whiteboard](' + baseName + '.png)');
      lines.push('');
    }
    lines.push('> Editable scene: [`' + baseName + '.excalidraw`](' + baseName + '.excalidraw) — open at https://excalidraw.com (File → Open).');
    lines.push('');
  } else {
    lines.push('---');
    lines.push('');
    lines.push('## Whiteboard');
    lines.push('');
    lines.push('_No whiteboard content for this session._');
    lines.push('');
  }
  return lines.join('\n');
}
function entryBaseName(entry) {
  const safeQ = (entry.question || 'session').slice(0, 40).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const ts = new Date(entry.savedAt || Date.now()).toISOString().slice(0, 10);
  return 'interview-' + ts + '-' + safeQ;
}
function exportEntryMarkdown(entry) {
  const baseName = entryBaseName(entry);
  return buildSessionMarkdown(entry, { baseName }).then(md =>
    new Blob([md], { type: 'text/markdown' })
  );
}
function exportEntryExcalidraw(entry) {
  const els = Array.isArray(entry.wb) ? entry.wb : [];
  if (!els.length) return null;
  const scene = {
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements: els,
    appState: { viewBackgroundColor: '#ffffff', gridSize: null },
    files: {}
  };
  return new Blob([JSON.stringify(scene, null, 2)], { type: 'application/vnd.excalidraw+json' });
}
async function exportEntryPng(entry) {
  return await buildWhiteboardPngBlob(entry); // returns Blob or null
}
async function exportEntryFiles(entry) {
  const baseName = entryBaseName(entry);
  const folder = baseName + '/';

  const [mdBlob, pngBlob] = await Promise.all([
    exportEntryMarkdown(entry),
    exportEntryPng(entry),
  ]);
  const excBlob = exportEntryExcalidraw(entry);

  if (typeof JSZip === 'undefined') {
    // Fallback: download files separately if JSZip failed to load
    if (mdBlob) downloadBlob(mdBlob, baseName + '.md');
    if (excBlob) downloadBlob(excBlob, baseName + '.excalidraw');
    if (pngBlob) downloadBlob(pngBlob, baseName + '.png');
    return;
  }

  const zip = new JSZip();
  const dir = zip.folder(baseName);
  if (mdBlob)  dir.file(baseName + '.md',         mdBlob);
  if (pngBlob) dir.file(baseName + '.png',        pngBlob);
  if (excBlob) dir.file(baseName + '.excalidraw', excBlob);

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  downloadBlob(zipBlob, baseName + '.zip');
}
function buildCurrentEntry() {
  const wbEls = (window._excalidrawAPI
    ? window._excalidrawAPI.getSceneElements().filter(el => !el.isDeleted)
    : []);
  return {
    question: currentQuestion,
    history: history.slice(),
    level: selectedLevel,
    style: selectedStyle,
    format: selectedFormat,
    duration: selectedDuration,
    focusAreas: getFocusAreas(),
    companyContext: getCompanyContext(),
    elapsedSec: timerStart ? Math.floor((Date.now() - timerStart) / 1000) : 0,
    wb: wbEls,
    savedAt: Date.now()
  };
}
async function exportSession() {
  if (!currentQuestion || !history.length) {
    alert('Nothing to export yet — start the interview first.');
    return;
  }
  await exportEntryFiles(buildCurrentEntry());
}

// ── History modal ─────────────────────────────────────
function openHistory() {
  renderHistory();
  document.getElementById('hist-modal').classList.add('show');
}
function closeHistory() {
  document.getElementById('hist-modal').classList.remove('show');
}
function openCheatsheet() {
  document.getElementById('cs-modal').classList.add('show');
}
function closeCheatsheet() {
  document.getElementById('cs-modal').classList.remove('show');
}
function csStudy(topic) {
  closeCheatsheet();
  startStudySession(topic, '');
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function renderHistory() {
  const body = document.getElementById('hist-body');
  const list = loadHistoryList();
  if (!list.length) {
    body.innerHTML = '<div class="hist-empty">No past interviews yet. Restart or start a new one — the previous session will be saved here.</div>';
    return;
  }
  body.innerHTML = list.map(e => {
    const dt = new Date(e.savedAt).toLocaleString();
    const msgs = e.history.filter(m => !(m.role === 'user' && m.content === 'Start.')).length;
    return '<div class="hist-item" data-id="' + e.id + '">'
      + '<div class="hist-q">' + escapeHtml(e.question) + '</div>'
      + '<div class="hist-meta">'
      +   '<span>' + escapeHtml(dt) + '</span>'
      +   '<span>· ' + escapeHtml(e.level) + ' · ' + escapeHtml(e.style) + '</span>'
      +   '<span>· ' + msgs + ' msgs · ' + fmtDuration(e.elapsedSec || 0) + '</span>'
      + '</div>'
      + '<div class="hist-actions">'
      +   '<button class="hist-btn" onclick="toggleHistTranscript(\'' + e.id + '\')">View</button>'
      +   '<button class="hist-btn" onclick="resumeHistEntry(\'' + e.id + '\')">▶ Resume</button>'
      +   '<button class="hist-btn" onclick="exportHistEntry(\'' + e.id + '\')">📥 Export</button>'
      +   '<button class="hist-btn danger" onclick="deleteHistoryEntry(\'' + e.id + '\')">Delete</button>'
      + '</div>'
      + '<div class="hist-transcript" id="ht-' + e.id + '"></div>'
      + '</div>';
  }).join('');
}
function toggleHistTranscript(id) {
  const el = document.getElementById('ht-' + id);
  if (!el) return;
  if (el.classList.contains('open')) { el.classList.remove('open'); el.innerHTML = ''; return; }
  const entry = loadHistoryList().find(e => e.id === id);
  if (!entry) return;
  el.innerHTML = entry.history
    .filter(m => !(m.role === 'user' && m.content === 'Start.'))
    .map(m => '<div class="msg-row"><strong>' + (m.role === 'assistant' ? 'Interviewer' : 'You') + '</strong>' + escapeHtml(m.content).replace(/\n/g, '<br>') + '</div>')
    .join('');
  el.classList.add('open');
}
async function exportHistEntry(id) {
  const entry = loadHistoryList().find(e => e.id === id);
  if (!entry) return;
  await exportEntryFiles(entry);
}

function resumeHistEntry(id) {
  const entry = loadHistoryList().find(e => e.id === id);
  if (!entry) return;
  if (currentQuestion && history.length && !confirm('Resume this past interview? Your current session will be snapshotted to history first.')) return;
  // Snapshot current in-flight session so nothing is lost
  snapshotToHistory();
  // Adopt the entry's id so further snapshots update this entry in-place
  currentSessionId = entry.id;
  // Rebuild SYSTEM prompt from the entry's settings (older entries didn't store SYSTEM)
  const sys = buildSystemPrompt(
    entry.question,
    entry.style,
    entry.focusAreas || [],
    entry.level,
    entry.format,
    entry.companyContext || ''
  );
  // Reuse restoreSession's hydration path
  const data = {
    question: entry.question,
    sessionId: entry.id,
    history: entry.history,
    system: sys,
    level: entry.level,
    style: entry.style,
    format: entry.format,
    duration: entry.duration,
    focusAreas: entry.focusAreas,
    companyContext: entry.companyContext || '',
    timerStart: Date.now() - (entry.elapsedSec || 0) * 1000,
    wb: entry.wb || []
  };
  // Persist so refresh keeps the resumed session
  safeSetItem(SESSION_KEY, JSON.stringify(Object.assign({}, data, { savedAt: Date.now() })));
  closeHistory();
  if (window._restoreSessionFromData) window._restoreSessionFromData(data);
}

async function fillStarterSentence() {
  const starterBtn = document.getElementById('starter-btn');
  starterBtn.disabled = true;
  starterBtn.textContent = '⏳ thinking...';
  try {
    const question = document.getElementById('q-text').textContent.trim();
    const systemOverride = `You are an interview coach helping a candidate open their answer to a system design / technical interview question.
The interview question is: "${question}"
Your ONLY job: write 1-2 short, confident opening sentences the candidate can say RIGHT NOW to begin their answer.
Rules:
- Address the question directly — reference it explicitly
- Frame how they'll approach it (e.g. clarify requirements, list components, state a key assumption)
- NO full answer, NO hints about the solution, NO explanation, NO preamble, NO quotes around the sentences
- Return ONLY the sentences themselves, nothing else`;
    // Single clean user message — the system prompt has all the context needed
    const payload = [{ role: 'user', content: 'Generate the opening sentences now.' }];
    const reply = await callAI(payload, false, systemOverride);
    const inputEl = document.getElementById('user-input');
    inputEl.value = reply.trim();
    inputEl.focus();
  } catch(e) {
    // silently fail — don't disrupt the interview
  }
  starterBtn.disabled = false;
  starterBtn.textContent = '🗣️ How to Start';
}

// ═══ VOICE MODE — Web Speech API (STT + TTS) ═══
const VOICE_MODE_KEY = 'voiceMode_v1';
let voiceMode = (() => { try { return localStorage.getItem(VOICE_MODE_KEY) === '1'; } catch(e) { return false; } })();
let _recog = null;
let _recogActive = false;
let _ttsUtter = null;

function setVoiceMode(on) {
  voiceMode = !!on;
  try { localStorage.setItem(VOICE_MODE_KEY, voiceMode ? '1' : '0'); } catch(e) {}
  const mic = document.getElementById('mic-btn');
  if (mic) mic.style.display = voiceMode ? '' : 'none';
  const sum = document.getElementById('sum-voice');
  if (sum) sum.textContent = voiceMode ? 'On' : 'Off';
  if (!voiceMode) { stopMic(); stopTTS(); }
}

function _initRecog() {
  if (_recog) return _recog;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  _recog = new SR();
  _recog.continuous = true;
  _recog.interimResults = true;
  _recog.lang = 'en-US';
  let baseText = '';
  _recog.onstart = () => { _recogActive = true; baseText = input.value; document.getElementById('mic-btn').classList.add('recording'); };
  _recog.onend = () => { _recogActive = false; document.getElementById('mic-btn').classList.remove('recording'); };
  _recog.onerror = (e) => { console.warn('STT error', e.error); _recogActive = false; document.getElementById('mic-btn').classList.remove('recording'); };
  _recog.onresult = (e) => {
    let finalTxt = '', interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalTxt += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (finalTxt) baseText = (baseText ? baseText + ' ' : '') + finalTxt.trim();
    input.value = (baseText + (interim ? ' ' + interim : '')).trim();
  };
  return _recog;
}

function toggleMic() {
  if (_recogActive) { stopMic(); return; }
  const r = _initRecog();
  if (!r) { alert('Speech recognition not supported in this browser. Try Chrome.'); return; }
  stopTTS();
  try { r.start(); } catch(e) { /* already started */ }
}
function stopMic() { if (_recog && _recogActive) { try { _recog.stop(); } catch(e) {} } }

function speak(text) {
  if (!voiceMode || !text) return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  // Strip markdown-ish noise so TTS sounds natural
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_`#>]+/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return;
  stopTTS();
  _ttsUtter = new SpeechSynthesisUtterance(clean);
  _ttsUtter.rate = 1.02;
  _ttsUtter.pitch = 1.0;
  _ttsUtter.lang = 'en-US';
  synth.speak(_ttsUtter);
}
function stopTTS() { try { window.speechSynthesis.cancel(); } catch(e) {} _ttsUtter = null; }

// ═══ CROSS-SESSION MEMORY — past weak spots ═══
function buildPastWeakSpotsBlock() {
  let weak = [];
  try {
    const prog = JSON.parse(localStorage.getItem(STUDY_PROGRESS_KEY) || '{}');
    weak = Object.keys(prog)
      .map(id => ({ id, ...prog[id] }))
      .filter(p => p.title && (p.gapSourcedFrom || (p.mastery || 0) < 60))
      .sort((a, b) => (a.mastery || 0) - (b.mastery || 0))
      .slice(0, 5)
      .map(p => p.title);
  } catch(e) {}
  if (!weak.length) return '';
  return `\nPAST WEAK SPOTS: In previous sessions the candidate has shown gaps in: ${weak.join(', ')}. Where naturally relevant, steer follow-up questions or deep-dives toward these areas so they get reinforcement. Do NOT mention this list to the candidate or otherwise reveal you have prior context — let it shape your probing organically.`;
}

async function send() {
  const text = input.value.trim();
  if (!text || btn.disabled) return;
  input.value = '';
  history.push({ role: 'user', content: text });
  addMsg('user', text, history.length - 1);
  btn.disabled = true;
  showTyping();
  try {
    let aiMessages = history.slice();
    const wbCtx = serializeWb();
    if (wbCtx) {
      // Silently enrich AI payload — history/UI stay clean
      aiMessages = history.slice(0, -1).concat([{ role: 'user', content: text + '\n\n' + wbCtx }]);
    }
    const reply = await callAI(aiMessages);
    removeTyping();
    const { text: cleanReply, hadWbUpdate } = renderWhiteboardUpdate(reply);
    history.push({ role: 'assistant', content: cleanReply });
    addMsg('assistant', cleanReply + (hadWbUpdate ? '\n\n✏️ *Updated whiteboard*' : ''));
    speak(cleanReply);
    saveSession();
  } catch (e) {
    removeTyping();
    addMsg('assistant', '⚠️ ' + ((e && e.message) || 'Error'));
    handleAIError(e);
  }
  btn.disabled = false;
  input.focus();
}

function editMsg(wrap, msgEl, histIdx) {
  const original = history[histIdx].content;
  // Replace bubble with textarea
  const ta = document.createElement('textarea');
  ta.className = 'msg-edit-area';
  ta.value = original;
  ta.rows = Math.max(2, original.split('\n').length);
  const acts = document.createElement('div');
  acts.className = 'edit-actions';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'edit-save';
  saveBtn.textContent = 'Send';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'edit-cancel';
  cancelBtn.textContent = 'Cancel';
  acts.appendChild(cancelBtn);
  acts.appendChild(saveBtn);
  msgEl.replaceWith(ta);
  wrap.querySelector('.edit-btn').style.opacity = '0';
  wrap.after(acts);
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);

  cancelBtn.onclick = () => {
    ta.replaceWith(msgEl);
    acts.remove();
    wrap.querySelector('.edit-btn').style.opacity = '';
  };

  const doSave = async () => {
    const newText = ta.value.trim();
    if (!newText || btn.disabled) return;
    // Restore bubble with new text
    msgEl.innerHTML = renderMarkdown(newText);
    ta.replaceWith(msgEl);
    acts.remove();
    wrap.querySelector('.edit-btn').style.opacity = '';
    // Update history index and drop everything after
    history[histIdx].content = newText;
    history.splice(histIdx + 1);
    // Remove all DOM messages after this wrap
    while (wrap.nextSibling) wrap.nextSibling.remove();
    // Re-send
    btn.disabled = true;
    showTyping();
    try {
      const reply = await callAI(history);
      removeTyping();
      const { text: cleanReply, hadWbUpdate } = renderWhiteboardUpdate(reply);
      history.push({ role: 'assistant', content: cleanReply });
      addMsg('assistant', cleanReply + (hadWbUpdate ? '\n\n✏️ *Updated whiteboard*' : ''));
      speak(cleanReply);
      saveSession();
    } catch (e) {
      removeTyping();
      addMsg('assistant', '⚠️ ' + ((e && e.message) || 'Error'));
      handleAIError(e);
    }
    btn.disabled = false;
    input.focus();
  };

  saveBtn.onclick = doSave;
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSave(); }
    if (e.key === 'Escape') cancelBtn.click();
  });
}



// ── Restore session on page load (browser-crash recovery) ──
(function() {
  function restoreSession(dataOverride) {
    const data = dataOverride || loadSession();
    if (!data || !data.question || !Array.isArray(data.history) || !data.history.length) return;
    _restoring = true;
    try {
      currentQuestion = data.question;
      currentSessionId = data.sessionId || newSessionId();
      SYSTEM = data.system || '';
      selectedLevel = data.level || selectedLevel;
      selectedStyle = data.style || selectedStyle;
      selectedFormat = data.format || selectedFormat;
      selectedDuration = data.duration || selectedDuration;
      history = data.history.slice();

      // Restore focus-area checkboxes
      if (Array.isArray(data.focusAreas)) {
        document.querySelectorAll('.focus-chip input[type=checkbox]').forEach(cb => {
          cb.checked = data.focusAreas.includes(cb.value);
          const chip = cb.closest('.focus-chip');
          if (chip) chip.classList.toggle('selected', cb.checked);
        });
      }
      if (typeof data.companyContext === 'string') {
        const cc = document.getElementById('company-context');
        if (cc) cc.value = data.companyContext;
      }

      document.getElementById('q-text').textContent = currentQuestion;
      document.getElementById('header-sub').textContent =
        selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1) + ' · ' + selectedStyle;
      document.getElementById('tab-interview').disabled = false;
      document.getElementById('status-dot').style.display = 'block';

      // Rebuild chat from history
      const chatEl = document.getElementById('chat');
      chatEl.innerHTML = '';
      history.forEach((m, i) => {
        if (m.role === 'user' && m.content === 'Start.') return; // hide synthetic kickoff
        addMsg(m.role, m.content, m.role === 'user' ? i : undefined);
      });

      // Resume timer from original start
      timerStart = data.timerStart || Date.now();
      const el = document.getElementById('q-timer');
      const elapsedEl = document.getElementById('timer-elapsed');
      const durEl = document.getElementById('timer-duration');
      el.style.display = '';
      durEl.textContent = selectedDuration ? ' / ' + selectedDuration + ':00' : '';
      el.className = 'q-timer';
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        const secs = Math.floor((Date.now() - timerStart) / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        elapsedEl.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        if (selectedDuration > 0) {
          const totalSecs = selectedDuration * 60;
          if (secs >= totalSecs) el.className = 'q-timer overtime';
          else if (secs >= totalSecs * 0.85) el.className = 'q-timer warn';
          else el.className = 'q-timer';
        }
      }, 1000);

      switchTab('interview');

      // Restore whiteboard once Excalidraw mounts (always reset scene when called with override).
      // Eagerly mount Excalidraw so the API is available even if the user doesn't open the
      // drawer — otherwise serializeWb() can't read the scene and the AI sees no whiteboard.
      const wbEls = Array.isArray(data.wb) ? data.wb : [];
      if (wbEls.length || dataOverride) {
        if (!window._excalidrawAPI && typeof initExcalidraw === 'function') {
          try { initExcalidraw(); } catch (e) {}
        }
        const tryRestoreWb = () => {
          if (window._excalidrawAPI) {
            window._excalidrawAPI.updateScene({ elements: wbEls });
          } else {
            setTimeout(tryRestoreWb, 300);
          }
        };
        tryRestoreWb();
      }
    } finally {
      _restoring = false;
    }
  }

  // Save on page hide (best-effort crash protection)
  function persistOnExit() { try { snapshotToHistory(); } catch (e) {} saveSession(); }
  window.addEventListener('pagehide', persistOnExit);
  window.addEventListener('beforeunload', persistOnExit);

  // Expose for History "Resume" button
  window._restoreSessionFromData = restoreSession;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSession);
  } else {
    restoreSession();
  }
})();

// ── Home panel scroll animations ──────────────────────
(function() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.dataset.delay || 0;
        setTimeout(() => el.classList.add('visible'), delay);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.15 });

  function initHelpAnimations() {
    document.querySelectorAll('.home-feature').forEach((el, i) => {
      el.dataset.delay = i * 100;
      obs.observe(el);
    });
    document.querySelectorAll('.home-mode').forEach((el, i) => {
      el.dataset.delay = i * 120;
      obs.observe(el);
    });
    document.querySelectorAll('.home-step').forEach((el, i) => {
      el.dataset.delay = i * 90;
      obs.observe(el);
    });
    document.querySelectorAll('.home-sample').forEach((el, i) => {
      el.dataset.delay = i * 90;
      obs.observe(el);
    });
  }

  // Run when switching to help tab, and once on load
  const origSwitch = window.switchTab;
  window.switchTab = function(name) {
    origSwitch(name);
    if (name === 'help') setTimeout(initHelpAnimations, 30);
  };

  // If help is visible on load
  if (document.getElementById('panel-help').classList.contains('active')) {
    setTimeout(initHelpAnimations, 30);
  }
})();

