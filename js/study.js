// ===== STUDY MODE =====
const STUDY_SESSION_KEY = 'studySession_v1';
const STUDY_HISTORY_KEY = 'studyHistory_v1';
const STUDY_PROGRESS_KEY = 'studyProgress_v1';
const STUDY_HISTORY_MAX = 50;

const STUDY_BUILTIN_TOPICS = [
  { id:'horizontal-vs-vertical', title:'Horizontal vs Vertical Scaling', cat:'Scalability', tags:['scalability'] },
  { id:'load-balancing', title:'Load Balancing Algorithms', cat:'Scalability', tags:['scalability','latency'] },
  { id:'sharding-strategies', title:'Sharding Strategies', cat:'Scalability', tags:['scalability'] },
  { id:'consistent-hashing', title:'Consistent Hashing', cat:'Scalability', tags:['scalability','sharding'] },
  { id:'message-queues', title:'Message Queues vs Streams', cat:'Scalability', tags:['scalability'] },
  { id:'kafka-basics', title:'Kafka Partitions & Consumers', cat:'Scalability', tags:['scalability'] },
  { id:'hot-partitions', title:'Hot Partitions & Mitigation', cat:'Scalability', tags:['scalability'] },

  { id:'cap-pacelc', title:'CAP & PACELC Theorem', cat:'Reliability', tags:['reliability','consistency'] },
  { id:'idempotency', title:'Idempotency & Exactly-Once', cat:'Reliability', tags:['reliability'] },
  { id:'retry-backoff', title:'Retries & Exponential Backoff', cat:'Reliability', tags:['reliability'] },
  { id:'circuit-breaker', title:'Circuit Breaker Pattern', cat:'Reliability', tags:['reliability'] },
  { id:'eventual-consistency', title:'Eventual Consistency Patterns', cat:'Reliability', tags:['reliability'] },
  { id:'leader-election', title:'Leader Election (Raft/Paxos)', cat:'Reliability', tags:['reliability'] },
  { id:'quorum-rw', title:'Quorum Reads & Writes', cat:'Reliability', tags:['reliability'] },
  { id:'graceful-degradation', title:'Graceful Degradation', cat:'Reliability', tags:['reliability'] },
  { id:'backpressure', title:'Backpressure & Flow Control', cat:'Reliability', tags:['reliability'] },
  { id:'dead-letter-queues', title:'Dead-Letter Queues', cat:'Reliability', tags:['reliability'] },
  { id:'distributed-locks', title:'Distributed Locks', cat:'Reliability', tags:['reliability'] },
  { id:'event-sourcing', title:'Event Sourcing & CQRS', cat:'Reliability', tags:['reliability'] },

  { id:'caching-strategies', title:'Caching Strategies', cat:'Latency', tags:['latency','scalability'] },
  { id:'cdn-strategies', title:'CDN & Edge Caching', cat:'Latency', tags:['latency'] },
  { id:'tail-latency', title:'Tail Latency & Hedged Requests', cat:'Latency', tags:['latency'] },
  { id:'bloom-filters', title:'Bloom Filters', cat:'Latency', tags:['latency'] },

  { id:'sql-vs-nosql', title:'SQL vs NoSQL Trade-offs', cat:'Databases', tags:['databases'] },
  { id:'indexing-basics', title:'Indexing & Query Plans', cat:'Databases', tags:['databases','latency'] },
  { id:'isolation-levels', title:'Transaction Isolation Levels', cat:'Databases', tags:['databases'] },
  { id:'db-replication', title:'DB Replication (sync vs async)', cat:'Databases', tags:['databases','reliability'] },
  { id:'sharding-strategies', title:'Sharding Strategies (range / hash / directory)', cat:'Databases', tags:['databases','scalability'] },
  { id:'read-replicas', title:'Scaling Reads with Replicas', cat:'Databases', tags:['databases','scalability'] },
  { id:'normalization', title:'Normalization vs Denormalization', cat:'Databases', tags:['databases'] },
  { id:'btree-vs-lsm', title:'B-Tree vs LSM Tree', cat:'Databases', tags:['databases','latency'] },
  { id:'oltp-vs-olap', title:'OLTP vs OLAP', cat:'Databases', tags:['databases','analytics'] },
  { id:'connection-pooling', title:'Connection Pooling & Limits', cat:'Databases', tags:['databases','reliability'] },
  { id:'materialized-views', title:'Materialized Views & Pre-aggregation', cat:'Databases', tags:['databases','latency'] },
  { id:'change-data-capture', title:'Change Data Capture (CDC)', cat:'Databases', tags:['databases'] },
  { id:'data-warehouse-lake', title:'Data Warehouse vs Data Lake', cat:'Databases', tags:['databases','analytics'] },
  { id:'etl-vs-elt', title:'ETL vs ELT Pipelines', cat:'Databases', tags:['databases','analytics'] },
  { id:'time-series-db', title:'Time-Series Databases', cat:'Databases', tags:['databases'] },

  { id:'oauth-jwt', title:'OAuth & JWT Auth', cat:'Security', tags:['security'] },
  { id:'rate-limiting', title:'Rate Limiting Algorithms', cat:'Security', tags:['reliability','security'] },
  { id:'tls-handshake', title:'TLS Handshake & mTLS', cat:'Security', tags:['security','networking'] },

  { id:'observability', title:'Logging, Metrics, Traces', cat:'Observability', tags:['observability'] },
  { id:'slo-sli-error-budget', title:'SLO / SLI / Error Budgets', cat:'Observability', tags:['observability','reliability'] },
  { id:'service-mesh', title:'Service Mesh & Sidecars', cat:'Observability', tags:['observability'] },

  { id:'tcp-vs-udp', title:'TCP vs UDP & QUIC', cat:'Networking', tags:['networking','latency'] },
  { id:'http2-http3', title:'HTTP/2 vs HTTP/3', cat:'Networking', tags:['networking','latency'] },
  { id:'dns-anycast', title:'DNS & Anycast Routing', cat:'Networking', tags:['networking'] },
  { id:'websockets-sse', title:'WebSockets vs SSE vs Polling', cat:'Networking', tags:['networking'] },
];

const STUDY_CAT_META = {
  'Scalability':   { icon:'📈' },
  'Reliability':   { icon:'🛡' },
  'Latency':       { icon:'⚡' },
  'Databases':     { icon:'🗄' },
  'Security':      { icon:'🔒' },
  'Observability': { icon:'👁' },
  'Networking':    { icon:'🌐' },
};
const STUDY_CAT_ORDER = ['Scalability','Reliability','Latency','Databases','Security','Observability','Networking'];
const STUDY_COLLAPSED_KEY = 'studyCategoriesCollapsed_v1';
function loadStudyCollapsed() {
  try { const r = localStorage.getItem(STUDY_COLLAPSED_KEY); return r ? JSON.parse(r) : {}; } catch(e) { return {}; }
}
function saveStudyCollapsed(o) { try { localStorage.setItem(STUDY_COLLAPSED_KEY, JSON.stringify(o)); } catch(e) {} }

let studyTopic = '', studyTopicId = '', studyHistory = [], studySystem = '';
let studyHintTier = 0, studyMastery = 0, studyTimerStart = null, studyTimerInterval = null;
let studySessionId = '', studySourceInterviewId = '', _studyRestoring = false;

function newStudyId() { return 'sh_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function loadStudyHistoryList() {
  try { const r = localStorage.getItem(STUDY_HISTORY_KEY); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
  catch(e) { return []; }
}
function saveStudyHistoryList(list) {
  try {
    const sorted = list.slice().sort((a,b) => (b.lastActiveAt||0) - (a.lastActiveAt||0));
    localStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(sorted.slice(0, STUDY_HISTORY_MAX)));
  } catch(e) {}
}
function loadStudyProgress() {
  try { const r = localStorage.getItem(STUDY_PROGRESS_KEY); return r ? JSON.parse(r) : {}; } catch(e) { return {}; }
}
function saveStudyProgress(p) { try { localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(p)); } catch(e) {} }

function dismissStudyGap(topicId) {
  if (!topicId) return;
  const prog = loadStudyProgress();
  if (!prog[topicId]) { renderStudyLanding(); return; }
  // If the entry has real mastery progress, just clear the gap flag; otherwise drop it.
  if ((prog[topicId].mastery || 0) > 0 || (prog[topicId].sessionsCount || 0) > 0) {
    delete prog[topicId].gapSourcedFrom;
  } else {
    delete prog[topicId];
  }
  saveStudyProgress(prog);
  renderStudyLanding();
}

function saveStudySession() {
  if (_studyRestoring || !studyTopic) return;
  try {
    localStorage.setItem(STUDY_SESSION_KEY, JSON.stringify({
      sessionId: studySessionId, topicId: studyTopicId, topic: studyTopic,
      history: studyHistory, system: studySystem, hintTier: studyHintTier,
      mastery: studyMastery, timerStart: studyTimerStart,
      sourceInterviewId: studySourceInterviewId, level: selectedLevel,
      savedAt: Date.now(), schemaVersion: 1
    }));
  } catch(e) {}
}
function clearStudySession() { try { localStorage.removeItem(STUDY_SESSION_KEY); } catch(e) {} }
function loadStudySession() {
  try { const r = localStorage.getItem(STUDY_SESSION_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}

function snapshotStudyToHistory() {
  if (!studyTopic || !studyHistory.length) return;
  const realMsgs = studyHistory.filter(m => !(m.role === 'user' && m.content === '__START__'));
  // Require at least one real exchange (a user reply OR more than just the opening tutor message)
  const userMsgs = realMsgs.filter(m => m.role === 'user');
  if (!userMsgs.length) return;
  if (!studySessionId) studySessionId = newStudyId();
  const list = loadStudyHistoryList();
  const existing = list.find(e => e.id === studySessionId);
  const entry = {
    id: studySessionId, topicId: studyTopicId, topic: studyTopic,
    history: studyHistory.slice(), level: selectedLevel,
    hintTier: studyHintTier, mastery: studyMastery,
    elapsedSec: studyTimerStart ? Math.floor((Date.now() - studyTimerStart) / 1000) : 0,
    sourceInterviewId: studySourceInterviewId,
    messageCount: realMsgs.length,
    lastActiveAt: Date.now(),
    createdAt: existing ? (existing.createdAt || Date.now()) : Date.now(),
    schemaVersion: 1
  };
  const next = list.filter(e => e.id !== studySessionId);
  next.unshift(entry);
  saveStudyHistoryList(next);
  if (studyTopicId) {
    const prog = loadStudyProgress();
    const prev = prog[studyTopicId] || { sessionsCount: 0 };
    prog[studyTopicId] = {
      mastery: Math.max(prev.mastery || 0, studyMastery),
      sessionsCount: (prev.sessionsCount || 0) + (existing ? 0 : 1),
      lastStudiedAt: Date.now(),
      title: studyTopic,
      gapSourcedFrom: prev.gapSourcedFrom || studySourceInterviewId || null
    };
    saveStudyProgress(prog);
  }
}
function deleteStudyHistoryEntry(id) {
  saveStudyHistoryList(loadStudyHistoryList().filter(e => e.id !== id));
  renderHistory();
}

function getStudySuggestions(limit) {
  const focus = getFocusAreas().map(f => f.toLowerCase());
  const prog = loadStudyProgress();
  const gaps = Object.keys(prog)
    .map(id => ({ id, ...prog[id] }))
    .filter(p => p.gapSourcedFrom && (p.mastery || 0) < 80)
    .sort((a,b) => (b.lastStudiedAt||0) - (a.lastStudiedAt||0))
    .slice(0, 4);
  const seen = new Set();
  const out = [];
  gaps.forEach(g => { seen.add(g.id); out.push({ id: g.id, title: g.title || g.id, isGap: true }); });
  const ranked = STUDY_BUILTIN_TOPICS.slice().sort((a,b) => {
    const aOv = a.tags.filter(t => focus.some(f => f.includes(t) || t.includes(f))).length;
    const bOv = b.tags.filter(t => focus.some(f => f.includes(t) || t.includes(f))).length;
    return bOv - aOv;
  });
  for (const t of ranked) {
    if (seen.has(t.id)) continue;
    out.push({ id: t.id, title: t.title, isGap: false });
    if (out.length >= (limit || 12)) break;
  }
  return out;
}

function renderStudyLanding() {
  const catWrap = document.getElementById('study-categories');
  if (!catWrap) return;

  const prog = loadStudyProgress();
  const gapIds = new Set(Object.keys(prog).filter(id => prog[id].gapSourcedFrom && (prog[id].mastery || 0) < 80));
  const collapsed = loadStudyCollapsed();

  // Group builtins by category
  const byCat = {};
  STUDY_BUILTIN_TOPICS.forEach(t => { (byCat[t.cat] = byCat[t.cat] || []).push(t); });

  catWrap.innerHTML = STUDY_CAT_ORDER.filter(c => byCat[c]).map((cat, i) => {
    const meta = STUDY_CAT_META[cat] || { icon:'•' };
    const isCollapsed = !!collapsed[cat];
    const items = byCat[cat].map(t => {
      const isGap = gapIds.has(t.id);
      return `<button class="study-cat-topic${isGap ? ' gap' : ''}" data-topic="${escapeHtml(t.title)}" data-id="${escapeHtml(t.id)}">${escapeHtml(t.title)}</button>`;
    }).join('');
    return `<div class="study-cat" data-cat="${escapeHtml(cat)}">
      <button class="study-cat-header${isCollapsed ? '' : ' expanded'}" onclick="toggleStudyCat('${escapeHtml(cat)}')">
        <span class="study-cat-chevron">▸</span>
        <span class="study-cat-icon">${meta.icon}</span>
        <span class="study-cat-label">${cat}</span>
        <span class="study-cat-count">${byCat[cat].length}</span>
      </button>
      <div class="study-cat-body${isCollapsed ? '' : ' open'}" data-cat-body="${escapeHtml(cat)}">${items}</div>
    </div>`;
  }).join('');
  catWrap.querySelectorAll('.study-cat-topic').forEach(el => {
    el.onclick = () => startStudySession(el.dataset.topic, el.dataset.id);
  });

  // Gaps from past interviews — separate block above categories
  const gapBlock = document.getElementById('study-gap-block');
  const gapList = document.getElementById('study-gap-list');
  const gaps = Object.keys(prog)
    .map(id => ({ id, ...prog[id] }))
    .filter(p => p.gapSourcedFrom && (p.mastery || 0) < 80)
    .sort((a,b) => (b.lastStudiedAt||0) - (a.lastStudiedAt||0))
    .slice(0, 6);
  if (gaps.length) {
    gapBlock.style.display = '';
    gapList.innerHTML = gaps.map(g => {
      const m = Math.round(g.mastery || 0);
      return `<div class="study-gap-card" data-topic="${escapeHtml(g.title || g.id)}" data-id="${escapeHtml(g.id)}" role="button" tabindex="0"><span class="gap-icon">⚠</span><span class="gap-title">${escapeHtml(g.title || g.id)}</span><span class="gap-mastery">${m}%</span><button class="gap-dismiss" data-dismiss="${escapeHtml(g.id)}" title="Remove from gaps" aria-label="Remove from gaps">×</button></div>`;
    }).join('');
    gapList.querySelectorAll('.study-gap-card').forEach(el => {
      el.onclick = (ev) => {
        if (ev.target.closest('.gap-dismiss')) return;
        startStudySession(el.dataset.topic, el.dataset.id);
      };
    });
    gapList.querySelectorAll('.gap-dismiss').forEach(btn => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        dismissStudyGap(btn.dataset.dismiss);
      };
    });
  } else {
    gapBlock.style.display = 'none';
  }

  // Resume hero card
  const list = loadStudyHistoryList();
  const resume = list[0];
  const resumeBlock = document.getElementById('study-resume-block');
  if (resume) {
    resumeBlock.style.display = '';
    const ago = fmtAgo(Date.now() - (resume.lastActiveAt || resume.createdAt || Date.now()));
    document.getElementById('study-resume-card').innerHTML =
      `<div class="study-resume-hero">
        <div class="topic">${escapeHtml(resume.topic)}<span class="sub">${resume.mastery||0}% mastery · ${resume.messageCount || 0} msgs · ${ago}</span></div>
        <button class="study-resume-btn" onclick="resumeStudyEntry('${resume.id}')">▶ Resume</button>
      </div>`;
  } else { resumeBlock.style.display = 'none'; }

  // Recent — compact card list
  const recentBlock = document.getElementById('study-recent-block');
  const recent = list.slice(1, 8);
  if (recent.length) {
    recentBlock.style.display = '';
    document.getElementById('study-recent-list').innerHTML = recent.map(e => {
      const ago = fmtAgo(Date.now() - (e.lastActiveAt || e.createdAt || Date.now()));
      const m = e.mastery || 0;
      return `<div class="study-recent-card">
        <div class="rc-main">
          <div class="rc-topic">${escapeHtml(e.topic)}</div>
          <div class="rc-meta">${m}% · ${e.messageCount||0} msgs · ${ago}</div>
        </div>
        <div class="rc-bar"><i style="width:${m}%"></i></div>
        <button class="rc-resume" onclick="resumeStudyEntry('${e.id}')">Resume →</button>
        <button class="rc-del" onclick="deleteStudyHistoryEntry('${e.id}')" title="Delete">×</button>
      </div>`;
    }).join('');
  } else { recentBlock.style.display = 'none'; }
}

function toggleStudyCat(cat) {
  const collapsed = loadStudyCollapsed();
  collapsed[cat] = !collapsed[cat];
  saveStudyCollapsed(collapsed);
  const header = document.querySelector('.study-cat[data-cat="' + cat + '"] .study-cat-header');
  const body = document.querySelector('.study-cat-body[data-cat-body="' + cat + '"]');
  if (header && body) {
    header.classList.toggle('expanded', !collapsed[cat]);
    body.classList.toggle('open', !collapsed[cat]);
  }
}

function fmtAgo(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function buildStudyPrompt(topic, level) {
  const levelDesc = {
    junior: 'a junior engineer (1–3 yrs). Use plain language, build from fundamentals, prefer concrete examples over jargon.',
    'mid-level': 'a mid-level engineer (3–6 yrs). Assume basic distributed-systems vocabulary; probe trade-offs.',
    senior: 'a senior engineer (6+ yrs). Assume strong fundamentals; probe edge cases, failure modes, and second-order effects.'
  }[level] || 'a mid-level engineer';

  return `You are a Socratic tutor helping a learner master a specific technical topic. You are NOT an interviewer. You are NOT giving a lecture. You teach by asking.

ALWAYS respond in English only.

TOPIC LOCK: The topic is "${topic}". Stay strictly on this topic. If the learner drifts off-topic, acknowledge in one short line and redirect with a question tied back to the topic.

LEARNER LEVEL: ${levelDesc}

THE SOCRATIC LOOP (this is the core rule):
- Lead with ONE focused question. Never lead with a definition or explanation.
- Each turn is at most 3 sentences before yielding with a question. If you write a paragraph, you have failed.
- Never reveal a full answer unprompted. If the learner asks "show me" or "give me the answer", give it — otherwise scaffold them to it.

HINT LADDER (escalate only when triggered):
- Tier 1 (gentle nudge): a leading question that points at the right thinking direction.
- Tier 2 (bigger hint): name the concept or technique to consider, but not how to apply it.
- Tier 3 (near-answer): walk through 1-2 steps, leave the conclusion for the learner.
Trigger escalation when:
- The learner types "hint" → advance one tier.
- The learner says "I'm stuck" or gives an empty/very vague answer twice in a row.
- The learner types "show me" → reveal the full answer with a brief explanation, then ask a check question.

CONCEPT CHECK (mandatory):
After any concept lands, ask one short verification question before moving to the next sub-topic. Do not advance silently.

TEACH-WHEN-UNKNOWN (override — do not skip):
Socratic ≠ withholding. If the learner signals they do not know the underlying concept you are hinting at — phrases like "I'm not familiar with X", "I don't know what X is", "never heard of X", "what is X", or two consecutive empty / "I'm stuck" / clearly-confused responses on the SAME sub-question — STOP hinting and TEACH.
Teaching format (use when triggered):
1. ONE short paragraph (3–5 sentences) defining the concept in plain language with a concrete example.
2. A tiny ASCII or worded illustration if it helps (optional, ≤3 lines).
3. Then ONE check question to confirm they got it.
Never keep escalating hints about a term the learner has explicitly said they don't know. Hints are for nudging recall, not for guessing vocabulary they were never taught.

DIFFICULTY RATCHET (mandatory):
Track how the learner is doing across the session. When they answer 2 sub-questions in a row correctly and confidently (no hints used, no "I'm stuck"), level up:
- Move from definition → trade-offs → real failure modes → concrete system-design scenarios.
- Introduce a NEW sub-concept tied to the topic (e.g. on "SQL vs NoSQL" after they nail CAP and denormalization, push into: quorum (R/W/N), tunable consistency, secondary indexes in NoSQL, write amplification, hot partitions, multi-region replication, change data capture).
- Frame the next question as a concrete scenario at real scale: "You're designing X at Y scale, traffic pattern Z — which model and why?"
Conversely, if they keep struggling, drop down a level (smaller sub-question, simpler example).
Do NOT stay on the same difficulty band for more than 2 turns when they are clearly nailing it — that wastes the session.

HONESTY (anti-sycophancy — strict):
- Never write "great question", "excellent", "you're doing great", or similar empty praise.
- If the learner is wrong: say "Not quite — [specific gap]." Then re-ask or hint. Never pretend a wrong answer was right.
- Validate only specific correct content: "Right — [reason it's right]."

WHITEBOARD PEDAGOGY:
The learner has an Excalidraw whiteboard. Use it to teach when helpful. When you sketch:
- Add small partial diagrams ("fill in the blank") — 1-3 elements with placeholder labels like "???" or "[your component]".
- Use color "#cdb4db" (purple) for placeholder elements, "#a8e6cf" (green) for hints, "#ffd3b6" (orange) for full reveals.
- After drawing, ask: "What goes in the ??? slot?" or "How would you connect these?"
Only emit a whiteboard update when the learner has shown a sketch OR you are explicitly drawing a partial. Do NOT narrate an empty canvas.

SPECIAL COMMANDS:
- "hint" → advance hint tier as described.
- "harder" → re-pose the current sub-question at a deeper level.
- "easier" → break the current sub-question into a smaller piece.
- "why" → briefly explain why you asked the last question (1-2 sentences), then re-ask.
- "explain" → give a short concept explanation WITHOUT revealing the target answer to the current question.
- "show me" → reveal the full answer to the current sub-question, with a brief explanation.
- "skip" → mark current sub-question as 'to revisit' and move on.
- "quiz" → enter end-of-session protocol.
- "done" → enter end-of-session protocol.
- "draw" → push a partial diagram to the whiteboard for the learner to complete.

END-OF-SESSION PROTOCOL (on "quiz" or "done"):
1. Brief recap (3 bullets max — what was covered).
2. Mini-quiz: ask 3 short questions of mixed difficulty (one easy, one medium, one harder). Wait for the learner to answer each.
3. After all 3, give a short scorecard: "X / 3 — [strength] / [gap]".
4. Append a "topics to revisit" line.
5. Append a fenced \`\`\`mastery JSON block at the very end like:
\`\`\`mastery
{"score": 75}
\`\`\`
where score is 0-100 reflecting overall demonstrated understanding this session. Be honest — not generous. Empty answers / many wrongs → 20-40. Solid grasp with some gaps → 60-75. Strong, including the harder Q → 85+. This block will be parsed and stripped from display.

WHITEBOARD_UPDATE FORMAT (when applicable):
Append a fenced block at the VERY END of your response (after any mastery block):
\`\`\`whiteboard
{"components":[{"label":"???","type":"rectangle","color":"#cdb4db"}],"connections":[]}
\`\`\`
Rules: type ∈ {rectangle, ellipse, diamond} (diamond for databases/stores); color #cdb4db (placeholder), #a8e6cf (hint), #ffd3b6 (full); short labels (2-4 words); 1-3 components for partials, full set only on "show me"/end.

TONE: Warm, curious, patient — but rigorous. Use "let's", "notice that", "what would happen if…". Never grade the learner. Never adjective-praise effort.

Your VERY FIRST message (triggered by "__START__"):
Greet the learner in one sentence, name the topic, then immediately ask ONE opening Socratic question that probes what they already know about "${topic}" — e.g. "Before we dive in — in your own words, what problem does ${topic} solve?" Do NOT explain anything yet.`;
}

function showStudyLanding() {
  document.getElementById('study-landing').style.display = 'flex';
  document.getElementById('study-session').style.display = 'none';
  renderStudyLanding();
}
function showStudySession() {
  document.getElementById('study-landing').style.display = 'none';
  document.getElementById('study-session').style.display = 'flex';
}

function startStudyFromInput() {
  const t = document.getElementById('study-topic-input').value.trim();
  if (!t) { document.getElementById('study-topic-input').focus(); return; }
  startStudySession(t, '');
}

async function startStudySession(topic, topicId, sourceInterviewId) {
  if (studyTopic && studyHistory.length) snapshotStudyToHistory();
  studyTopic = topic;
  studyTopicId = topicId || topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'');
  studySessionId = newStudyId();
  studyHistory = [];
  studyHintTier = 0;
  studyMastery = 0;
  studyTimerStart = Date.now();
  studySourceInterviewId = sourceInterviewId || '';
  studySystem = buildStudyPrompt(studyTopic, selectedLevel);
  document.getElementById('study-topic-text').textContent = studyTopic;
  document.getElementById('study-chat').innerHTML = '';
  updateStudyHintDots();
  updateStudyMastery();
  startStudyTimer();
  clearStudySession();
  showStudySession();
  switchTab('study');
  await initStudy();
}

function startStudyTimer() { /* timer UI removed; studyTimerStart still tracks elapsed for History */ }
function stopStudyTimer() { /* no-op */ }

function updateStudyHintDots() {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('study-hd-' + i);
    if (el) el.classList.toggle('on', i <= studyHintTier);
  }
}
function updateStudyMastery() {
  document.getElementById('study-mastery-fill').style.width = studyMastery + '%';
  document.getElementById('study-mastery-pct').textContent = studyMastery + '%';
}

function addStudyMsg(role, text) {
  const chatEl = document.getElementById('study-chat');
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap ' + (role === 'assistant' ? 'tutor' : 'user');
  const lbl = document.createElement('div');
  lbl.className = 'msg-label';
  lbl.textContent = role === 'assistant' ? 'TUTOR' : 'YOU';
  const msg = document.createElement('div');
  msg.className = 'msg';
  msg.innerHTML = renderMarkdown(text);
  wrap.appendChild(lbl);
  wrap.appendChild(msg);
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function showStudyTyping() {
  const chatEl = document.getElementById('study-chat');
  const t = document.createElement('div');
  t.className = 'typing-indicator';
  t.id = 'study-typing';
  t.innerHTML = '<div class="typing-label">TUTOR</div><div class="typing-bubble" style="border-left-color:var(--study-accent)"><div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>';
  chatEl.appendChild(t);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function removeStudyTyping() { const t = document.getElementById('study-typing'); if (t) t.remove(); }

async function callStudyAI(messages) { return await callAI(messages, false, studySystem); }

async function initStudy() {
  const sendBtn = document.getElementById('study-send-btn');
  sendBtn.disabled = true;
  showStudyTyping();
  try {
    const reply = await callStudyAI([{ role: 'user', content: '__START__' }]);
    removeStudyTyping();
    studyHistory.push({ role: 'user', content: '__START__' });
    const cleaned = processStudyReply(reply);
    studyHistory.push({ role: 'assistant', content: cleaned.text });
    addStudyMsg('assistant', cleaned.display);
    saveStudySession();
  } catch(e) {
    removeStudyTyping();
    addStudyMsg('assistant', '⚠️ Error: ' + e.message);
  }
  sendBtn.disabled = false;
  document.getElementById('study-input').focus();
}

function processStudyReply(reply) {
  let text = reply;
  const mRe = /```mastery\s*\n([\s\S]*?)```/;
  const mMatch = text.match(mRe);
  if (mMatch) {
    try {
      const md = JSON.parse(mMatch[1].trim());
      if (typeof md.score === 'number') {
        studyMastery = Math.max(0, Math.min(100, Math.round(md.score)));
        updateStudyMastery();
      }
    } catch(e) {}
    text = text.replace(mRe, '').trim();
  }
  const wbResult = renderWhiteboardUpdate(text);
  text = wbResult.text;
  return { text, display: text + (wbResult.hadWbUpdate ? '\n\n✏️ *Updated whiteboard*' : '') };
}

function quickStudy(t) {
  document.getElementById('study-input').value = t;
  sendStudy();
}

async function sendStudy() {
  const inputEl = document.getElementById('study-input');
  const text = inputEl.value.trim();
  const sendBtn = document.getElementById('study-send-btn');
  if (!text || sendBtn.disabled) return;
  inputEl.value = '';
  const lower = text.toLowerCase();
  if (lower === 'hint' && studyHintTier < 3) { studyHintTier++; updateStudyHintDots(); }
  studyHistory.push({ role: 'user', content: text });
  addStudyMsg('user', text);
  sendBtn.disabled = true;
  showStudyTyping();
  try {
    let aiMsgs = studyHistory.slice();
    const wbCtx = serializeWb();
    if (wbCtx) {
      aiMsgs = studyHistory.slice(0, -1).concat([{ role: 'user', content: text + '\n\n' + wbCtx }]);
    }
    const reply = await callStudyAI(aiMsgs);
    removeStudyTyping();
    const cleaned = processStudyReply(reply);
    studyHistory.push({ role: 'assistant', content: cleaned.text });
    addStudyMsg('assistant', cleaned.display);
    saveStudySession();
  } catch(e) {
    removeStudyTyping();
    addStudyMsg('assistant', '⚠️ Error: ' + e.message);
  }
  sendBtn.disabled = false;
  inputEl.focus();
}

function endStudySession(askConfirm) {
  if (askConfirm && studyHistory.length && !confirm('Exit this study session? It will be saved to History.')) return;
  snapshotStudyToHistory();
  stopStudyTimer();
  studyTopic = ''; studyTopicId = ''; studyHistory = []; studySystem = '';
  studyHintTier = 0; studyMastery = 0; studyTimerStart = null; studySessionId = ''; studySourceInterviewId = '';
  clearStudySession();
  showStudyLanding();
}

async function restartStudy() {
  if (!studyTopic) return;
  if (studyHistory.length && !confirm('Restart this study session? The current run will be saved to History.')) return;
  if (studyHistory.length) snapshotStudyToHistory();
  const topic = studyTopic, topicId = studyTopicId, src = studySourceInterviewId;
  studySessionId = newStudyId();
  studyHistory = [];
  studyHintTier = 0;
  studyMastery = 0;
  studyTimerStart = Date.now();
  studySourceInterviewId = src;
  studySystem = buildStudyPrompt(topic, selectedLevel);
  document.getElementById('study-chat').innerHTML = '';
  updateStudyHintDots();
  updateStudyMastery();
  clearStudySession();
  await initStudy();
}

function resumeStudyEntry(id) {
  const entry = loadStudyHistoryList().find(e => e.id === id);
  if (!entry) return;
  if (studyTopic && studyHistory.length && !confirm('Resume this study session? Your current one will be saved first.')) return;
  if (studyTopic && studyHistory.length) snapshotStudyToHistory();
  studyTopic = entry.topic;
  studyTopicId = entry.topicId || '';
  studySessionId = entry.id;
  studyHistory = entry.history.slice();
  studyHintTier = entry.hintTier || 0;
  studyMastery = entry.mastery || 0;
  studyTimerStart = Date.now() - (entry.elapsedSec || 0) * 1000;
  studySourceInterviewId = entry.sourceInterviewId || '';
  studySystem = buildStudyPrompt(studyTopic, entry.level || selectedLevel);
  document.getElementById('study-topic-text').textContent = studyTopic;
  document.getElementById('study-chat').innerHTML = '';
  studyHistory.forEach(m => {
    if (m.role === 'user' && m.content === '__START__') return;
    addStudyMsg(m.role, m.content);
  });
  updateStudyHintDots();
  updateStudyMastery();
  startStudyTimer();
  saveStudySession();
  closeHistory();
  showStudySession();
  switchTab('study');
}

function restoreStudyOnLoad() {
  const data = loadStudySession();
  if (!data || !data.topic || !Array.isArray(data.history) || !data.history.length) return false;
  _studyRestoring = true;
  try {
    studyTopic = data.topic;
    studyTopicId = data.topicId || '';
    studySessionId = data.sessionId || newStudyId();
    studyHistory = data.history.slice();
    studySystem = data.system || buildStudyPrompt(studyTopic, data.level || selectedLevel);
    studyHintTier = data.hintTier || 0;
    studyMastery = data.mastery || 0;
    studyTimerStart = data.timerStart || Date.now();
    studySourceInterviewId = data.sourceInterviewId || '';
    document.getElementById('study-topic-text').textContent = studyTopic;
    document.getElementById('study-chat').innerHTML = '';
    studyHistory.forEach(m => {
      if (m.role === 'user' && m.content === '__START__') return;
      addStudyMsg(m.role, m.content);
    });
    updateStudyHintDots();
    updateStudyMastery();
    startStudyTimer();
    showStudySession();
    return true;
  } finally { _studyRestoring = false; }
}

// History modal — Interview/Study tabs
let _histTab = 'interview';
function switchHistTab(name) {
  _histTab = name;
  document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('hist-tab-' + name).classList.add('active');
  renderHistory();
}
const _origOpenHistory = openHistory;
openHistory = function(tab) {
  _histTab = tab || 'interview';
  document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('hist-tab-' + _histTab).classList.add('active');
  renderHistory();
  document.getElementById('hist-modal').classList.add('show');
};
const _origRenderHistory = renderHistory;
renderHistory = function() {
  if (_histTab === 'study') return renderStudyHistory();
  return _origRenderHistory();
};

function renderStudyHistory() {
  const body = document.getElementById('hist-body');
  const list = loadStudyHistoryList();
  if (!list.length) {
    body.innerHTML = '<div class="hist-empty">No study sessions yet. Pick a topic in the 📚 Study tab.</div>';
    return;
  }
  body.innerHTML = list.map(e => {
    const dt = new Date(e.lastActiveAt || e.createdAt || Date.now()).toLocaleString();
    return '<div class="hist-item">'
      + '<div class="hist-q">' + escapeHtml(e.topic) + '</div>'
      + '<div class="hist-meta">'
      +   '<span>' + escapeHtml(dt) + '</span>'
      +   '<span>· ' + (e.messageCount||0) + ' msgs · mastery ' + (e.mastery||0) + '%</span>'
      +   '<span>· ' + fmtDuration(e.elapsedSec||0) + '</span>'
      + '</div>'
      + '<div class="hist-actions">'
      +   '<button class="hist-btn" onclick="resumeStudyEntry(\'' + e.id + '\')">▶ Resume</button>'
      +   '<button class="hist-btn danger" onclick="deleteStudyHistoryEntry(\'' + e.id + '\')">Delete</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

// Feedback → Study deep-link rendering
const _origAddMsg = addMsg;
addMsg = function(role, text, histIdx) {
  _origAddMsg(role, text, histIdx);
  if (role !== 'assistant') return;
  const topics = parseStudyTopicsFromFeedback(text);
  if (!topics.length) return;
  const chatEl = document.getElementById('chat');
  const lastWrap = chatEl.lastElementChild;
  if (!lastWrap) return;
  const row = document.createElement('div');
  row.className = 'study-deeplink-row';
  row.innerHTML = '<div class="label">📚 STUDY THESE NEXT</div>' + topics.map(t =>
    '<button class="study-deeplink-chip" data-topic="' + escapeHtml(t) + '">📚 ' + escapeHtml(t) + ' →</button>'
  ).join('');
  row.querySelectorAll('.study-deeplink-chip').forEach(btn => {
    btn.onclick = () => {
      // Mark these as gap-sourced in progress
      const prog = loadStudyProgress();
      const tid = btn.dataset.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'');
      if (!prog[tid]) {
        prog[tid] = { mastery: 0, sessionsCount: 0, lastStudiedAt: 0, title: btn.dataset.topic, gapSourcedFrom: currentSessionId || 'unknown' };
        saveStudyProgress(prog);
      }
      startStudySession(btn.dataset.topic, tid, currentSessionId || '');
    };
  });
  lastWrap.appendChild(row);
};

function parseStudyTopicsFromFeedback(text) {
  const m = text.match(/Suggested Study Topics[^\n]*\n([\s\S]*?)(?:\n\s*\n|$)/i);
  if (!m) return [];
  const lines = m[1].split('\n').map(l => l.trim()).filter(l => /^[-*•]/.test(l));
  const topics = [];
  for (const line of lines) {
    let t = line.replace(/^[-*•]\s*/, '');
    t = t.replace(/^\*\*(.+?)\*\*:?\s*/, '$1').replace(/^Read about:?\s*/i, '').replace(/^Study:?\s*/i, '');
    const cut = t.search(/[:—.]/);
    if (cut > 8) t = t.slice(0, cut).trim();
    t = t.replace(/[`*_]/g, '').trim();
    if (t.length >= 4 && t.length <= 80) topics.push(t);
    if (topics.length >= 5) break;
  }
  return topics;
}

document.getElementById('study-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendStudy(); }
});
document.getElementById('study-topic-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); startStudyFromInput(); }
});

const _origSwitchTabFn = window.switchTab;
window.switchTab = function(name) {
  _origSwitchTabFn(name);
  if (name === 'study') {
    if (studyTopic) showStudySession(); else showStudyLanding();
  }
};

window.addEventListener('pagehide', function() { try { snapshotStudyToHistory(); } catch(e) {} saveStudySession(); });
window.addEventListener('beforeunload', function() { try { snapshotStudyToHistory(); } catch(e) {} saveStudySession(); });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { restoreStudyOnLoad(); renderStudyLanding(); });
} else {
  restoreStudyOnLoad();
  renderStudyLanding();
}
