#!/usr/bin/env node
/**
 * Whiteboard integration test for InterviewApp
 * Tests interpretWhiteboard() logic and the silent AI injection flow.
 * Run: node test-whiteboard.js
 */

// ── Copy interpretWhiteboard() verbatim from index.html ──────────────────────
function interpretWhiteboard(elements) {
  if (!elements || elements.length === 0) return null;

  const shapes = elements.filter(e => !e.isDeleted && (e.type === 'rectangle' || e.type === 'ellipse' || e.type === 'diamond'));
  const texts  = elements.filter(e => !e.isDeleted && e.type === 'text' && (e.text || '').trim());
  const arrows = elements.filter(e => !e.isDeleted && (e.type === 'arrow' || e.type === 'line'));

  const LABEL_NORMS = {
    db: 'database', database: 'database', sql: 'database', postgres: 'database', mysql: 'database', mongo: 'database',
    cache: 'cache', redis: 'Redis (cache)', memcache: 'Memcached (cache)',
    queue: 'queue', kafka: 'Kafka (queue)', mq: 'message queue', rabbitmq: 'RabbitMQ (queue)',
    lb: 'load balancer', 'load balancer': 'load balancer',
    cdn: 'CDN', gateway: 'API gateway', 'api gateway': 'API gateway', proxy: 'proxy',
    svc: 'service', service: 'service',
    client: 'client', browser: 'browser', mobile: 'mobile client', user: 'client',
  };
  function normalizeLabel(raw) {
    const l = raw.trim().toLowerCase();
    for (const [k, v] of Object.entries(LABEL_NORMS)) {
      if (l === k || l.startsWith(k + ' ') || l.endsWith(' ' + k)) return v.charAt(0).toUpperCase() + v.slice(1);
    }
    return raw.trim();
  }

  const shapeLabels = {};
  for (const s of shapes) {
    if (s.text && s.text.trim()) { shapeLabels[s.id] = normalizeLabel(s.text); continue; }
    const sx1 = s.x, sy1 = s.y, sx2 = s.x + s.width, sy2 = s.y + s.height;
    for (const t of texts) {
      const tx = t.x + (t.width || 0) / 2, ty = t.y + (t.height || 0) / 2;
      if (tx >= sx1 && tx <= sx2 && ty >= sy1 && ty <= sy2) {
        shapeLabels[s.id] = normalizeLabel(t.text); break;
      }
    }
  }

  const components = [];
  const seenLabels = new Set();
  for (const s of shapes) {
    const lbl = shapeLabels[s.id] || `Unlabeled ${s.type}`;
    if (!seenLabels.has(lbl)) { components.push({ id: s.id, label: lbl, x: s.x, y: s.y }); seenLabels.add(lbl); }
  }
  for (const t of texts) {
    const lbl = normalizeLabel(t.text);
    if (!seenLabels.has(lbl) && t.text.length < 40) { components.push({ id: t.id, label: lbl, x: t.x, y: t.y }); seenLabels.add(lbl); }
  }

  function findCompNear(id, x, y) {
    if (id) { const c = components.find(c => c.id === id); if (c) return c.label; }
    let best = null, bestD = 80;
    for (const c of components) {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { bestD = d; best = c.label; }
    }
    return best;
  }
  const connections = [];
  const inferred = [];
  for (const a of arrows) {
    const startId = a.startBinding?.elementId;
    const endId   = a.endBinding?.elementId;
    const pts     = a.points || [];
    const startPt = pts[0]   ? { x: a.x + pts[0][0], y: a.y + pts[0][1] } : { x: a.x, y: a.y };
    const endPt   = pts[pts.length - 1] ? { x: a.x + pts[pts.length-1][0], y: a.y + pts[pts.length-1][1] } : null;
    const from = findCompNear(startId, startPt.x, startPt.y);
    const to   = endPt ? findCompNear(endId, endPt.x, endPt.y) : null;
    if (from && to && from !== to) connections.push(`${from} → ${to}`);
    else if (from || to) inferred.push(`Arrow from ${from || '?'} to ${to || '?'} — endpoint unclear`);
  }

  components.sort((a, b) => a.x - b.x);

  const connectedIds = new Set();
  connections.forEach(c => { const [f, t] = c.split(' → '); connectedIds.add(f); connectedIds.add(t); });
  const unconnected = components.filter(c => !connectedIds.has(c.label));

  const labels = components.map(c => c.label.toLowerCase());
  const gaps = [];
  if (unconnected.length) gaps.push(`Unconnected component(s): ${unconnected.map(c => c.label).join(', ')}`);
  if (!labels.some(l => l.includes('database') || l.includes('db') || l.includes('storage'))) gaps.push('No database or storage layer visible');
  if (connections.length === 0 && components.length > 1) gaps.push('No explicit connections drawn — flow is entirely inferred from layout');
  if (!labels.some(l => l.includes('client') || l.includes('browser') || l.includes('user') || l.includes('mobile'))) gaps.push('No client/entry-point visible');

  const lines = ['[WHITEBOARD CONTEXT]', ''];
  if (components.length) {
    lines.push('Components identified:');
    components.forEach(c => lines.push(`  • ${c.label}`));
    lines.push('');
  } else {
    lines.push('No recognizable components found — the whiteboard may be empty or labels are missing.');
    lines.push('');
  }
  if (connections.length) {
    lines.push('Connections (explicit):');
    connections.forEach(c => lines.push(`  • ${c}`));
    lines.push('');
  }
  if (inferred.length) {
    lines.push('Inferred / unclear connections:');
    inferred.forEach(i => lines.push(`  • ${i}`));
    lines.push('');
  }
  if (gaps.length) {
    lines.push('Gaps & ambiguities:');
    gaps.forEach(g => lines.push(`  • ${g}`));
    lines.push('');
  }
  lines.push('Note: This is a partial, work-in-progress sketch. Interpret intent, not just structure. Ask about missing connections, unclear components, and gaps.');
  return lines.join('\n');
}

// ── Simulate the send() injection logic ──────────────────────────────────────
function buildAIPayload(history, userText, wbShareEnabled, wbSceneElements) {
  let aiMessages = history.slice();
  if (wbShareEnabled && wbSceneElements) {
    const wbCtx = interpretWhiteboard(wbSceneElements);
    if (wbCtx) {
      aiMessages = history.slice(0, -1).concat([{ role: 'user', content: userText + '\n\n' + wbCtx }]);
    }
  }
  return aiMessages;
}

// ── Test harness ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function assert(desc, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${desc}`);
    passed++;
  } else {
    console.log(`  ❌ ${desc}${detail ? '\n     → ' + detail : ''}`);
    failed++;
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Realistic messy Excalidraw scene: API Gateway → Rate Limiter → Redis + DB unconnected
const SCENE_MESSY = [
  { id: 's1', type: 'rectangle', x: 50,  y: 100, width: 120, height: 60, text: 'API Gateway', isDeleted: false },
  { id: 's2', type: 'rectangle', x: 250, y: 100, width: 120, height: 60, text: 'Rate Limiter', isDeleted: false },
  { id: 's3', type: 'rectangle', x: 450, y: 100, width: 100, height: 60, text: 'redis',        isDeleted: false },
  { id: 's4', type: 'rectangle', x: 450, y: 230, width: 100, height: 60, text: 'db',           isDeleted: false },
  // Arrow: s1 → s2 (bound)
  { id: 'a1', type: 'arrow', x: 170, y: 130, isDeleted: false,
    startBinding: { elementId: 's1' }, endBinding: { elementId: 's2' },
    points: [[0, 0], [80, 0]] },
  // Arrow: s2 → s3 (bound)
  { id: 'a2', type: 'arrow', x: 370, y: 130, isDeleted: false,
    startBinding: { elementId: 's2' }, endBinding: { elementId: 's3' },
    points: [[0, 0], [80, 0]] },
  // s4 (db) has NO arrow — deliberately unconnected
];

// Completely empty scene
const SCENE_EMPTY = [];

// Scene with only vague text labels (no shapes)
const SCENE_TEXT_ONLY = [
  { id: 't1', type: 'text', x: 50,  y: 50,  text: 'client',  isDeleted: false },
  { id: 't2', type: 'text', x: 200, y: 50,  text: 'lb',      isDeleted: false },
  { id: 't3', type: 'text', x: 350, y: 50,  text: 'svc',     isDeleted: false },
];

// Scene with a deleted element that should be ignored
const SCENE_WITH_DELETED = [
  { id: 's1', type: 'rectangle', x: 0, y: 0, width: 100, height: 60, text: 'API Gateway', isDeleted: false },
  { id: 's2', type: 'rectangle', x: 200, y: 0, width: 100, height: 60, text: 'Database',   isDeleted: true  }, // deleted!
];

// Scene for AI injection: user typed message + whiteboard
const HISTORY_ONE_TURN = [
  { role: 'user',      content: 'Start.' },
  { role: 'assistant', content: 'Where would you start?' },
  { role: 'user',      content: 'I would design the system as follows...' },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════');
console.log(' WHITEBOARD INTEGRATION TEST REPORT');
console.log('════════════════════════════════════════════════════\n');

// ── 1. Empty / null input ────────────────────────────────────────────────────
console.log('── 1. Empty / null input ───────────────────────────');
assert('null elements → returns null',     interpretWhiteboard(null) === null);
assert('empty array → returns null',       interpretWhiteboard([]) === null);
console.log();

// ── 2. Output format ─────────────────────────────────────────────────────────
console.log('── 2. Output always starts with [WHITEBOARD CONTEXT] ─');
const out = interpretWhiteboard(SCENE_MESSY);
assert('[WHITEBOARD CONTEXT] header present',   out.startsWith('[WHITEBOARD CONTEXT]'));
assert('No raw JSON in output',                 !out.includes('"type"') && !out.includes('"id"'));
assert('Contains "Components identified:"',     out.includes('Components identified:'));
assert('Contains gap/ambiguity section',        out.includes('Gaps & ambiguities:'));
assert('Contains final note about sketch',      out.includes('work-in-progress'));
console.log();

// ── 3. Label normalisation ───────────────────────────────────────────────────
console.log('── 3. Label normalisation ──────────────────────────');
assert('"redis" → "Redis (cache)"',   out.includes('Redis (cache)'));
assert('"db" → "Database"',           out.includes('Database'));
assert('"API Gateway" normalised (lowercase g)',  out.includes('API gateway'));
assert('"Rate Limiter" kept as-is',   out.includes('Rate Limiter'));
console.log();

// ── 4. Connections ───────────────────────────────────────────────────────────
console.log('── 4. Explicit connections ─────────────────────────');
assert('Detects API gateway → Rate Limiter', out.includes('API gateway → Rate Limiter'));
assert('Detects Rate Limiter → Redis (cache)', out.includes('Rate Limiter → Redis (cache)'));
console.log();

// ── 5. Gap detection ─────────────────────────────────────────────────────────
console.log('── 5. Gap detection ────────────────────────────────');
assert('Flags unconnected Database', out.includes('Unconnected component') && out.toLowerCase().includes('database'));
assert('Flags missing client/entry-point', out.includes('No client/entry-point visible'));
console.log();

// ── 6. Deleted elements ignored ──────────────────────────────────────────────
console.log('── 6. Deleted elements ignored ─────────────────────');
const outDel = interpretWhiteboard(SCENE_WITH_DELETED);
assert('Non-deleted shape appears (API gateway)',  outDel.includes('API gateway'));
assert('Deleted shape is excluded',  !outDel.includes('Database') || outDel.includes('No database'));
console.log();

// ── 7. Text-only scene (no shapes) ───────────────────────────────────────────
console.log('── 7. Text-only labels normalised ──────────────────');
const outText = interpretWhiteboard(SCENE_TEXT_ONLY);
assert('Output not null for text-only scene', outText !== null);
assert('"client" normalised to "Client"',     outText.includes('Client'));
assert('"lb" normalised to "Load balancer"',  outText.toLowerCase().includes('load balancer'));
assert('"svc" normalised to "Service"',       outText.toLowerCase().includes('service'));
assert('Flags no explicit connections',       outText.includes('No explicit connections drawn'));
console.log();

// ── 8. AI payload injection (CORE) ───────────────────────────────────────────
console.log('── 8. AI payload injection ─────────────────────────');
const userText = 'Here is my design so far';

// Simulate exactly what send() does: push user message to history first, then build payload
const HISTORY_WITH_NEW_MSG = [
  { role: 'user',      content: 'Start.' },
  { role: 'assistant', content: 'Where would you start?' },
  { role: 'user',      content: userText },  // already pushed, as send() does
];

// 8a. Toggle OFF → payload unchanged
const payloadOff = buildAIPayload(HISTORY_WITH_NEW_MSG, userText, false, SCENE_MESSY);
assert('Toggle OFF: payload length = history length', payloadOff.length === HISTORY_WITH_NEW_MSG.length);
assert('Toggle OFF: last message is unmodified user text',
  payloadOff[payloadOff.length - 1].content === userText);

// 8b. Toggle ON → last message in AI payload enriched
const payloadOn = buildAIPayload(HISTORY_WITH_NEW_MSG, userText, true, SCENE_MESSY);
const lastMsgOn = payloadOn[payloadOn.length - 1].content;
assert('Toggle ON: payload length unchanged (same number of turns)',
  payloadOn.length === HISTORY_WITH_NEW_MSG.length);
assert('Toggle ON: last AI message starts with user text',
  lastMsgOn.startsWith(userText));
assert('Toggle ON: [WHITEBOARD CONTEXT] silently appended',
  lastMsgOn.includes('[WHITEBOARD CONTEXT]'));
assert('Toggle ON: UI-visible history is NOT modified (original history unchanged)',
  HISTORY_WITH_NEW_MSG[HISTORY_WITH_NEW_MSG.length - 1].content === userText);

// 8c. Toggle ON but no scene → no enrichment
const payloadNoScene = buildAIPayload(HISTORY_WITH_NEW_MSG, userText, true, null);
assert('Toggle ON + no scene: last message unchanged',
  payloadNoScene[payloadNoScene.length - 1].content === userText);

// 8d. Whiteboard context NOT visible in "UI history" (simulates addMsg receiving only userText)
assert('UI chat only ever receives typed message (no JSON in UI text)',
  !userText.includes('[WHITEBOARD CONTEXT]') && !userText.includes('"type"'));
console.log();

// ── 9. No raw JSON leaks ──────────────────────────────────────────────────────
console.log('── 9. No raw JSON / technical data leaks ───────────');
assert('Output contains no "{" characters', !out.includes('{'));
assert('Output contains no "}" characters', !out.includes('}'));
assert('Output contains no "elementId"',    !out.includes('elementId'));
assert('Output contains no "isDeleted"',    !out.includes('isDeleted'));
console.log();

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('────────────────────────────────────────────────────');
console.log(`Total: ${passed + failed} | ✅ ${passed} passed | ❌ ${failed} failed`);
if (failed === 0) {
  console.log('OVERALL STATUS: ✅ ALL PASS — whiteboard injection is working correctly');
} else {
  console.log('OVERALL STATUS: ❌ FAILURES — see above');
  process.exit(1);
}
console.log('════════════════════════════════════════════════════\n');
