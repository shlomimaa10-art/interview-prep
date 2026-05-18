// ── Whiteboard share — always-on, no toggle needed ───

// ── serializeWb — Excalidraw → AI context ────────────
function serializeWb() {
  // Prefer the live Excalidraw scene; fall back to the persisted session whiteboard
  // when the drawer hasn't been opened yet (lazy-mount means _excalidrawAPI may be
  // null even though wb elements exist in localStorage from a restored session).
  let elements = null;
  if (window._excalidrawAPI) {
    elements = window._excalidrawAPI.getSceneElements().filter(el => !el.isDeleted);
  }
  if (!elements || !elements.length) {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.wb) && data.wb.length) {
          elements = data.wb.filter(el => !el.isDeleted);
        }
      }
    } catch (e) { /* ignore */ }
  }
  if (!elements || !elements.length) return null;

  const components = [];
  const connections = [];
  const idToLabel = {};

  // Excalidraw stores labels as separate text elements with containerId pointing
  // to their parent shape/arrow. Build that lookup first so we can resolve the
  // real label for each container instead of falling back to el.type.
  const containerIdToText = {};
  for (const el of elements) {
    if (el.type === 'text' && el.containerId) {
      const t = (el.text || '').trim();
      if (t) containerIdToText[el.containerId] = t;
    }
  }

  for (const el of elements) {
    if (el.type === 'arrow') continue;
    // Standalone text (no containerId): treat as its own component.
    // Bound text (has containerId): skip — it's already attached to its container as a label.
    if (el.type === 'text' && el.containerId) continue;
    // Skip section header/bullet text elements (start with ▸ or •)
    if (el.type === 'text' && /^[▸•]/.test((el.text || '').trim())) continue;
    const bound = containerIdToText[el.id];
    const lbl = (bound || el.text || '').trim() || el.type;
    idToLabel[el.id] = lbl;
    components.push(lbl);
  }

  for (const el of elements) {
    if (el.type !== 'arrow') continue;
    const src = el.startBinding ? idToLabel[el.startBinding.elementId] : null;
    const tgt = el.endBinding   ? idToLabel[el.endBinding.elementId]   : null;
    if (src && tgt) {
      const arrowLabel = (containerIdToText[el.id] || el.label?.text || '').trim();
      connections.push(arrowLabel ? `${src} —[${arrowLabel}]→ ${tgt}` : `${src} → ${tgt}`);
    }
  }

  const connSet = new Set();
  connections.forEach(c => {
    const m = c.match(/^(.+?) →/); if (m) connSet.add(m[1].trim());
    const m2 = c.match(/→ (.+)$/); if (m2) connSet.add(m2[1].trim());
  });
  const unconnected = components.filter(c => !connSet.has(c));
  const labels = components.map(l => l.toLowerCase());
  const gaps = [];
  if (unconnected.length) gaps.push(`Unconnected: ${unconnected.join(', ')}`);
  if (!labels.some(l => l.includes('database') || l.includes('db') || l.includes('storage') || l.includes('cache') || l.includes('redis'))) gaps.push('No storage/cache layer visible');
  if (connections.length === 0 && components.length > 1) gaps.push('No connections drawn — flow is inferred from layout only');
  if (!labels.some(l => l.includes('client') || l.includes('browser') || l.includes('user') || l.includes('mobile'))) gaps.push('No client/entry-point visible');

  const lines = ['[WHITEBOARD CONTEXT]', ''];
  lines.push('Components:');
  components.forEach(c => lines.push(`  • ${c}`));
  lines.push('');
  if (connections.length) { lines.push('Connections:'); connections.forEach(c => lines.push(`  • ${c}`)); lines.push(''); }
  if (gaps.length) { lines.push('Gaps & ambiguities:'); gaps.forEach(g => lines.push(`  • ${g}`)); lines.push(''); }
  lines.push('Note: This is a work-in-progress sketch. Interpret intent, not just structure. Ask about missing connections and gaps.');
  return lines.join('\n');
}


// ── Render AI whiteboard updates onto Excalidraw ─────
// Library item mapping: component keywords → sysdesign library index
const WB_LIB_MAP = {
  'server': 1, 'app server': 1, 'api server': 1, 'application server': 1, 'web server': 1,
  'servers': 2, 'multi server': 2, 'multi instance': 4,
  'database': 6, 'db': 6, 'relational db': 6, 'sql': 6, 'postgres': 6, 'mysql': 6, 'rds': 6,
  'object storage': 7, 's3': 7, 'blob': 7,
  'cold storage': 8,
  'nosql': 9, 'document db': 9, 'mongodb': 9, 'dynamodb': 9,
  'columnar': 10, 'columnar db': 10, 'clickhouse': 10, 'analytics db': 10,
  'graph db': 11, 'neo4j': 11,
  'cache': 13, 'redis': 13, 'memcached': 13,
  'auth': 14, 'authentication': 14, 'iam': 14,
  'dns': 15,
  'load balancer': 16, 'lb': 16, 'nginx': 16, 'alb': 16,
  'queue': 17, 'message queue': 17, 'kafka': 17, 'rabbitmq': 17, 'sqs': 17, 'mq': 17,
  'pipeline': 18, 'stream': 18,
  'cloud': 19,
  'cdn': 20, 'cloudfront': 20,
  'mobile': 22, 'mobile app': 22, 'ios': 22, 'android': 22,
  'client': 23, 'browser': 23, 'web app': 23, 'frontend': 23, 'web client': 23, 'user': 23,
};

function _wbFindLibMatch(label) {
  const lower = label.toLowerCase().trim();
  if (WB_LIB_MAP[lower] !== undefined) return WB_LIB_MAP[lower];
  for (const [key, idx] of Object.entries(WB_LIB_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return idx;
  }
  return null;
}

function renderWhiteboardUpdate(reply) {
  const re = /```whiteboard\s*\n([\s\S]*?)```/;
  const match = reply.match(re);
  if (!match) return { text: reply, hadWbUpdate: false };

  let data;
  try { data = JSON.parse(match[1].trim()); } catch { return { text: reply, hadWbUpdate: false }; }

  const cleanText = reply.replace(re, '').trim();

  // If Excalidraw hasn't been mounted yet, open the drawer (which mounts it),
  // then retry once the API becomes available.
  if (!window._excalidrawAPI) {
    // Ensure Excalidraw is initialised
    if (typeof initExcalidraw === 'function') { try { initExcalidraw(); } catch(e) {} }
    var drawer = document.getElementById('wb-drawer');
    if (drawer && !drawer.classList.contains('wb-open') && typeof toggleWhiteboard === 'function') {
      toggleWhiteboard();
    }
    // Retry up to ~3 seconds
    var attempts = 0;
    var retryWb = function() {
      if (window._excalidrawAPI) {
        renderWhiteboardUpdate(reply); // re-run with API available
        return;
      }
      if (++attempts < 30) setTimeout(retryWb, 100);
    };
    setTimeout(retryWb, 100);
    return { text: cleanText, hadWbUpdate: true }; // optimistically strip the fence
  }

  try {

  const rawExisting = window._excalidrawAPI.getSceneElements().filter(function(el) { return !el.isDeleted; });
  // Build a set of arrow IDs so we can drop floating edge-label text elements
  // that Excalidraw sometimes attaches to arrows — they carry invalid groupIds
  // and crash updateScene when re-submitted.
  const arrowIds = new Set(rawExisting.filter(function(el) { return el.type === 'arrow'; }).map(function(el) { return el.id; }));
  const hasSections = (data.sections || []).length > 0;
  const isFullAnswer = (data.components || []).length > 0;
  const existing = rawExisting.filter(function(el) {
    if (el.type === 'text' && el.containerId && arrowIds.has(el.containerId)) return false;
    // On a full-answer update, clear all prior generator output (shapes, arrows,
    // arrow labels, section blocks, zone backdrops, summary strip) so the diagram
    // is redrawn cleanly in place instead of stacking below previous attempts.
    // User-drawn elements (which lack our id prefixes) are preserved.
    if (isFullAnswer && el.id && /^(wbs_|wba_|wbal_|wbst_|wbz_|wbsum_)/.test(el.id)) return false;
    return true;
  });

  let maxY = 0;
  for (const el of existing) {
    if (el.type === 'text') continue;
    const bottom = (el.y || 0) + (el.height || 80);
    if (bottom > maxY) maxY = bottom;
  }

  const newElements = [];
  const labelToMeta = {};

  // Index existing component geometry for arrow routing (3 passes)
  for (const el of existing) {
    if (el.type === 'text' && el.text && el.containerId) {
      const lbl = el.text.trim();
      if (!lbl) continue;
      const container = existing.find(function(e) { return e.id === el.containerId; });
      if (container) labelToMeta[lbl.toLowerCase()] = { id: el.containerId, x: container.x, y: container.y, w: container.width, h: container.height };
    }
  }
  for (const el of existing) {
    if (el.boundElements) {
      for (const b of el.boundElements) {
        if (b.type === 'text') {
          const textEl = existing.find(function(e) { return e.id === b.id; });
          if (textEl && textEl.text) labelToMeta[textEl.text.trim().toLowerCase()] = { id: el.id, x: el.x, y: el.y, w: el.width, h: el.height };
        }
      }
    }
  }

  const uid = function() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); };

  // ── Layout constants ────────────────────────────────────────────────────────
  const SHAPE_W = 200;       // baseline (primary) shape width
  const SHAPE_H = 72;        // baseline (primary) shape height
  const HERO_W = 280, HERO_H = 100;   // most-connected node
  const SECONDARY_W = 160, SECONDARY_H = 60; // leaf nodes
  const ROW_GAP = 150;   // vertical distance between row tops
  const COL_GAP = 260;   // horizontal distance between shape centres
  const CANVAS_W = 1600; // total canvas width to centre within
  const ZONE_PAD = 18;   // padding around grouped shapes for zone backdrops

  // ── Zone (semantic band) derived from label ────────────────────────────────
  // Each component belongs to exactly one zone. Zones drive both the colour
  // palette and the grouped backdrop rectangles drawn behind contiguous bands.
  function pickZone(label) {
    const l = (label || '').toLowerCase();
    if (/client|user|browser|mobile|ios|android|web app|frontend/.test(l))      return 'client';
    if (/gateway|lb|load.?bal|cdn|edge|proxy|anycast|dns|waf|reverse.?proxy/.test(l)) return 'edge';
    if (/cache|redis|memcached|in.?mem/.test(l))                                 return 'cache';
    if (/queue|kafka|pub.?sub|stream|sqs|event.?bus|rabbit|kinesis/.test(l))     return 'async';
    if (/db|database|postgres|mysql|dynamo|clickhouse|store|sql|s3|blob|warehouse|datalake/.test(l)) return 'data';
    if (/metric|monitor|observ|alert|grafana|prometheus|log/.test(l))            return 'observability';
    if (/service|api|server|engine|worker|rule|enforce|handler|consumer|producer/.test(l)) return 'service';
    return 'service';
  }
  const ZONE_FILL = {
    client: '#bde0fe', edge: '#a0c4ff', service: '#cdb4db', cache: '#ffd6a5',
    async: '#caffbf', data: '#fdffb6', observability: '#e8e8e8',
  };
  const ZONE_BACKDROP = {
    client: '#eaf4ff', edge: '#e6efff', service: '#efe8f6', cache: '#fff1de',
    async: '#eaffe1', data: '#fffce0', observability: '#f3f3f3',
  };
  const ZONE_LABEL = {
    client: 'Clients', edge: 'Edge', service: 'Services',
    cache: 'Cache', async: 'Async', data: 'Data', observability: 'Observability',
  };

  // ── Color palette ───────────────────────────────────────────────────────────
  function pickColor(label, explicit) {
    if (explicit) return explicit;
    return ZONE_FILL[pickZone(label)] || '#e8e8e8';
  }

  // ── Sections (FR / NFR header blocks) ──────────────────────────────────────
  const sections = data.sections || [];
  let sectionY = maxY + 60;
  const SECTION_LINE_H = 22;

  sections.forEach(function(sec) {
    // Combine title + all items into one text element
    var lines = ['▸ ' + sec.title].concat((sec.items || []).map(function(item) { return '  • ' + item; }));
    var combined = lines.join('\n');
    var lineCount = lines.length;
    var blockH = 20 + lineCount * SECTION_LINE_H;
    newElements.push({
      id: 'wbst_' + uid(), type: 'text',
      x: 60, y: sectionY,
      width: 580, height: blockH,
      angle: 0, strokeColor: '#333333', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
      roughness: 0, opacity: 100, groupIds: [], roundness: null,
      seed: Math.floor(Math.random() * 2e9), version: 2,
      versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
      boundElements: null, containerId: null,
      text: combined, fontSize: 14, fontFamily: 3,
      textAlign: 'left', verticalAlign: 'top', originalText: combined, lineHeight: 1.25,
    });
    sectionY += blockH + 20; // gap between sections
  });

  // ── Layered layout engine ───────────────────────────────────────────────────
  // BFS from nodes with no incoming edges → assign each node a row (depth).
  // Then centre each row horizontally within CANVAS_W.
  const components = data.components || [];
  const connections = data.connections || [];

  if (components.length === 0) {
    if (newElements.length) {
      window._excalidrawAPI.updateScene({ elements: existing.concat(newElements) });
      saveSession();
    }
    return { text: cleanText, hadWbUpdate: newElements.length > 0 };
  }

  // Build adjacency for layout
  const nameIndex = {};
  components.forEach(function(c, i) { nameIndex[c.label.toLowerCase()] = i; });

  const outEdges = components.map(function() { return []; });
  const inDegree = components.map(function() { return 0; });
  connections.forEach(function(conn) {
    var fi = nameIndex[(conn.from || '').toLowerCase()];
    var ti = nameIndex[(conn.to || '').toLowerCase()];
    if (fi == null || ti == null || fi === ti) return;
    outEdges[fi].push(ti);
    inDegree[ti]++;
  });

  // BFS to assign rows
  const rowOf = components.map(function() { return -1; });
  const queue = [];
  components.forEach(function(_, i) { if (inDegree[i] === 0) { rowOf[i] = 0; queue.push(i); } });
  // If everything has incoming edges (cycle), seed with index 0
  if (queue.length === 0) { rowOf[0] = 0; queue.push(0); }
  var head = 0;
  while (head < queue.length) {
    var cur = queue[head++];
    outEdges[cur].forEach(function(nxt) {
      if (rowOf[nxt] === -1) {
        rowOf[nxt] = rowOf[cur] + 1;
        queue.push(nxt);
      }
    });
  }
  // Any still unvisited (disconnected) go in their own row
  components.forEach(function(_, i) { if (rowOf[i] === -1) rowOf[i] = 0; });

  // Group by row
  const maxRow = Math.max.apply(null, rowOf);
  const rows = [];
  for (var r = 0; r <= maxRow; r++) { rows.push([]); }
  components.forEach(function(_, i) { rows[rowOf[i]].push(i); });

  // ── Degree-based sizing (hero / primary / secondary) ───────────────────────
  // The most-connected node becomes the visual anchor; leaf nodes shrink.
  const degree = components.map(function(_, i) {
    var deg = inDegree[i] + outEdges[i].length;
    return deg;
  });
  const maxDeg = Math.max(1, Math.max.apply(null, degree));
  const compW = [], compH = [];
  components.forEach(function(_, i) {
    var d = degree[i];
    // Hero: top 1 by degree (only when meaningfully connected, deg >= 3).
    // Secondary: leaves (deg <= 1). Primary: everything in between.
    if (d === maxDeg && d >= 3) { compW[i] = HERO_W;      compH[i] = HERO_H; }
    else if (d <= 1)            { compW[i] = SECONDARY_W; compH[i] = SECONDARY_H; }
    else                        { compW[i] = SHAPE_W;     compH[i] = SHAPE_H; }
  });

  // ── (Optional) Summary flow strip — Level 1 of the multi-zoom model ────────
  // Only on full-answer renders, and only when we have enough zone variety
  // for the strip to add meaning (>= 3 distinct zones).
  const zoneOrder = ['client', 'edge', 'service', 'cache', 'async', 'data', 'observability'];
  const presentZones = [];
  {
    var seen = {};
    components.forEach(function(c) {
      var z = pickZone(c.label);
      if (!seen[z]) { seen[z] = true; presentZones.push(z); }
    });
    presentZones.sort(function(a, b) { return zoneOrder.indexOf(a) - zoneOrder.indexOf(b); });
  }
  var summaryStripBottomY = sectionY; // baseline if we don't draw a strip
  const drawSummaryStrip = isFullAnswer && presentZones.length >= 3;
  if (drawSummaryStrip) {
    var stripY = sectionY + 20;
    var dotW = 110, dotH = 32, dotGap = 60;
    var stripTotalW = presentZones.length * dotW + (presentZones.length - 1) * dotGap;
    var stripX = Math.max(60, (CANVAS_W - stripTotalW) / 2);
    // One groupId binds every dot, dot label, and connector arrow in the strip
    // together — click any piece to grab the whole flow strip as a single unit.
    var stripGid = 'wbgsum_' + uid();
    var prevDotId = null;
    presentZones.forEach(function(z, idx) {
      var dotId = 'wbsum_' + uid();
      var dotLabelId = 'wbsum_' + uid();
      var x = stripX + idx * (dotW + dotGap);
      newElements.push({
        id: dotId, type: 'ellipse',
        x: x, y: stripY, width: dotW, height: dotH,
        angle: 0, strokeColor: '#888', backgroundColor: ZONE_FILL[z] || '#e8e8e8',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
        roughness: 0, opacity: 100, groupIds: [stripGid], roundness: null,
        seed: Math.floor(Math.random() * 2e9), version: 2,
        versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
        boundElements: [{ id: dotLabelId, type: 'text' }],
      });
      newElements.push({
        id: dotLabelId, type: 'text',
        x: x, y: stripY + dotH / 2 - 8, width: dotW, height: 16,
        angle: 0, strokeColor: '#444', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
        roughness: 0, opacity: 100, groupIds: [stripGid], roundness: null,
        seed: Math.floor(Math.random() * 2e9), version: 2,
        versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
        boundElements: null,
        text: ZONE_LABEL[z] || z, fontSize: 12, fontFamily: 3,
        textAlign: 'center', verticalAlign: 'middle',
        containerId: dotId, originalText: ZONE_LABEL[z] || z, lineHeight: 1.25,
        baseline: 10,
      });
      if (prevDotId) {
        var connId = 'wbsum_' + uid();
        var prevX = stripX + (idx - 1) * (dotW + dotGap) + dotW;
        var curX = x;
        newElements.push({
          id: connId, type: 'arrow',
          x: prevX + 4, y: stripY + dotH / 2,
          width: curX - prevX - 8, height: 1,
          angle: 0, strokeColor: '#999', backgroundColor: 'transparent',
          fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
          roughness: 0, opacity: 100, groupIds: [stripGid],
          roundness: { type: 2 },
          seed: Math.floor(Math.random() * 2e9), version: 2,
          versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
          boundElements: [],
          points: [[0, 0], [curX - prevX - 8, 0]],
          startBinding: { elementId: prevDotId, focus: 0, gap: 4 },
          endBinding:   { elementId: dotId,    focus: 0, gap: 4 },
          startArrowhead: null, endArrowhead: 'arrow',
          lastCommittedPoint: null,
        });
      }
      prevDotId = dotId;
    });
    summaryStripBottomY = stripY + dotH + 30;
  }

  // Compute (x, y) for each component — centred within CANVAS_W using per-shape widths
  const posX = [];
  const posY = [];
  var diagramStartY = sections.length > 0 ? sectionY + 40 : maxY + 80;
  if (drawSummaryStrip) diagramStartY = Math.max(diagramStartY, summaryStripBottomY + 20);

  rows.forEach(function(rowItems, r) {
    // Total width = sum of per-shape widths + gaps between centres (COL_GAP - SHAPE_W per gap).
    var totalW = rowItems.reduce(function(acc, idx) { return acc + compW[idx]; }, 0)
               + Math.max(0, rowItems.length - 1) * (COL_GAP - SHAPE_W);
    var startX = Math.max(60, (CANVAS_W - totalW) / 2);
    var cursorX = startX;
    rowItems.forEach(function(compIdx, col) {
      // Track the tallest shape in the row so siblings can baseline-align vertically.
      posX[compIdx] = cursorX;
      // Vertical centre of the row band based on baseline SHAPE_H so heroes
      // and secondaries align on their middles.
      var rowMid = diagramStartY + r * ROW_GAP + SHAPE_H / 2;
      posY[compIdx] = rowMid - compH[compIdx] / 2;
      cursorX += compW[compIdx] + (COL_GAP - SHAPE_W);
    });
  });

  // ── Zone bands + Excalidraw groupIds (precompute) ──────────────────────────
  // Build (row, contiguous-zone-band) groups up front so we can stamp every
  // element that belongs to a band — backdrop, backdrop label, component shape,
  // component text label, and intra-band arrows — with the same groupId.
  // Result: clicking any element selects the whole zone band as one unit.
  // Cross-band arrows stay ungrouped (they connect zones; they shouldn't be
  // owned by either). Only computed when we're drawing a full-answer diagram
  // (backdrops aren't drawn for hint-sized updates, so grouping there is noise).
  const zoneGroupOfComp = new Array(components.length).fill(null);
  const bandsByRow = rows.map(function(rowItems) {
    var bands = [];
    if (!isFullAnswer) return bands;
    var bandStart = 0;
    while (bandStart < rowItems.length) {
      var bandZone = pickZone(components[rowItems[bandStart]].label);
      var bandEnd = bandStart;
      while (bandEnd + 1 < rowItems.length
             && pickZone(components[rowItems[bandEnd + 1]].label) === bandZone) {
        bandEnd++;
      }
      var bandGid = 'wbgz_' + uid();
      for (var k = bandStart; k <= bandEnd; k++) zoneGroupOfComp[rowItems[k]] = bandGid;
      bands.push({ start: bandStart, end: bandEnd, zone: bandZone, gid: bandGid });
      bandStart = bandEnd + 1;
    }
    return bands;
  });

  // ── Zone backdrops (Level 2 of multi-zoom) ─────────────────────────────────
  // Group adjacent same-zone components per row into a translucent band and
  // emit ONE backdrop rectangle behind the band with a small zone label.
  // Drawn first so the actual shapes render on top.
  if (isFullAnswer) {
    rows.forEach(function(rowItems, r) {
      bandsByRow[r].forEach(function(band) {
        var bandStart = band.start, bandEnd = band.end, bandZone = band.zone;
        // Compute band bbox
        var firstIdx = rowItems[bandStart];
        var bx = posX[firstIdx] - ZONE_PAD;
        var by = posY[firstIdx] - ZONE_PAD - 14; // extra room above for the label
        // Find the tallest shape in the band to size the backdrop correctly
        var maxBandBottom = 0, maxBandRight = 0;
        for (var k = bandStart; k <= bandEnd; k++) {
          var ii = rowItems[k];
          var rightEdge = posX[ii] + compW[ii];
          var bottomEdge = posY[ii] + compH[ii];
          if (rightEdge > maxBandRight) maxBandRight = rightEdge;
          if (bottomEdge > maxBandBottom) maxBandBottom = bottomEdge;
        }
        var bw = (maxBandRight - bx) + ZONE_PAD;
        var bh = (maxBandBottom - by) + ZONE_PAD;
        var bgId = 'wbz_' + uid();
        var bgLabelId = 'wbz_' + uid();
        newElements.push({
          id: bgId, type: 'rectangle',
          x: bx, y: by, width: bw, height: bh,
          angle: 0, strokeColor: '#cccccc', backgroundColor: ZONE_BACKDROP[bandZone] || '#f5f5f5',
          fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'dashed',
          roughness: 0, opacity: 60, groupIds: [band.gid],
          roundness: { type: 3 },
          seed: Math.floor(Math.random() * 2e9), version: 2,
          versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
          boundElements: null,
        });
        newElements.push({
          id: bgLabelId, type: 'text',
          x: bx + 10, y: by + 4, width: 160, height: 16,
          angle: 0, strokeColor: '#777777', backgroundColor: 'transparent',
          fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
          roughness: 0, opacity: 100, groupIds: [band.gid], roundness: null,
          seed: Math.floor(Math.random() * 2e9), version: 2,
          versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
          boundElements: null,
          text: (ZONE_LABEL[bandZone] || bandZone).toUpperCase(),
          fontSize: 10, fontFamily: 3,
          textAlign: 'left', verticalAlign: 'top',
          originalText: (ZONE_LABEL[bandZone] || bandZone).toUpperCase(),
          lineHeight: 1.25, baseline: 9,
        });
      });
    });
  }

  // Emit shapes
  components.forEach(function(comp, i) {
    var shapeId = 'wbs_' + uid();
    var labelId = 'wbl_' + uid();
    var sx = posX[i], sy = posY[i];
    var sw = compW[i], sh = compH[i];
    var bgColor = pickColor(comp.label, comp.color && comp.color !== '#a8e6cf' && comp.color !== '#ffd3b6' ? comp.color : null);
    var st = comp.type === 'ellipse' ? 'ellipse' : comp.type === 'diamond' ? 'diamond' : 'rectangle';
    // Component shape + its bound text label belong to the same zone-band group
    // (when one exists). Excalidraw treats elements that share a groupId as
    // a single selectable unit, so click-to-select grabs the whole band.
    var compGroupIds = zoneGroupOfComp[i] ? [zoneGroupOfComp[i]] : [];

    newElements.push({
      id: shapeId, type: st,
      x: sx, y: sy, width: sw, height: sh,
      angle: 0, strokeColor: '#1a1a1a', backgroundColor: bgColor,
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 0, opacity: 100, groupIds: compGroupIds,
      roundness: st === 'rectangle' ? { type: 3 } : null,
      seed: Math.floor(Math.random() * 2e9), version: 2,
      versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
      boundElements: [{ id: labelId, type: 'text' }],
    });

    newElements.push({
      id: labelId, type: 'text',
      x: sx, y: sy + sh / 2 - 11,
      width: sw, height: 22,
      angle: 0, strokeColor: '#1e1e1e', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
      roughness: 0, opacity: 100, groupIds: compGroupIds, roundness: null,
      seed: Math.floor(Math.random() * 2e9), version: 2,
      versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
      boundElements: null,
      text: comp.label, fontSize: 15, fontFamily: 3,
      textAlign: 'center', verticalAlign: 'middle',
      containerId: shapeId, originalText: comp.label, lineHeight: 1.25,
      baseline: 13,
    });

    labelToMeta[comp.label.toLowerCase()] = { id: shapeId, x: sx, y: sy, w: sw, h: sh, zoneGid: zoneGroupOfComp[i] };
    // Also index a normalised key (no spaces/punctuation) for fuzzy matching
    labelToMeta[comp.label.toLowerCase().replace(/[\s\-_]+/g, '')] = { id: shapeId, x: sx, y: sy, w: sw, h: sh, zoneGid: zoneGroupOfComp[i] };
  });

  // Build an index of all *placed* shapes for arrow routing collision checks.
  // Includes both the new components and any previously-rendered shapes we kept.
  const placedShapes = [];
  components.forEach(function(c, i) {
    placedShapes.push({ id: labelToMeta[c.label.toLowerCase()].id, x: posX[i], y: posY[i], w: compW[i], h: compH[i] });
  });

  // Segment-vs-rect intersection: returns true if the open segment (a,b)→(c,d)
  // passes through the given rect's interior. Skips shapes whose id is in skipIds.
  function segmentHitsAnyShape(ax, ay, bx, by, skipIds) {
    for (var i = 0; i < placedShapes.length; i++) {
      var s = placedShapes[i];
      if (skipIds.indexOf(s.id) !== -1) continue;
      // Inflate rect slightly so an arrow grazing the edge still counts as crossing
      var r1 = s.x - 4, r2 = s.x + s.w + 4, r3 = s.y - 4, r4 = s.y + s.h + 4;
      // Liang–Barsky clip
      var dx = bx - ax, dy = by - ay;
      var p = [-dx, dx, -dy, dy];
      var q = [ax - r1, r2 - ax, ay - r3, r4 - ay];
      var u1 = 0, u2 = 1, hit = true;
      for (var k = 0; k < 4; k++) {
        if (p[k] === 0) {
          if (q[k] < 0) { hit = false; break; }
        } else {
          var t = q[k] / p[k];
          if (p[k] < 0) { if (t > u2) { hit = false; break; } if (t > u1) u1 = t; }
          else          { if (t < u1) { hit = false; break; } if (t < u2) u2 = t; }
        }
      }
      if (hit && u1 < u2) return true;
    }
    return false;
  }

  // Emit arrows
  var fuzzyLookup = function(name) {
    var k = (name || '').toLowerCase();
    return labelToMeta[k] || labelToMeta[k.replace(/[\s\-_]+/g, '')] || null;
  };
  connections.forEach(function(conn) {
    var fromMeta = fuzzyLookup(conn.from);
    var toMeta   = fuzzyLookup(conn.to);
    if (!fromMeta || !toMeta || fromMeta.id === toMeta.id) return;
    if (fromMeta.x == null || toMeta.x == null) return;

    var fCx = fromMeta.x + fromMeta.w / 2;
    var fCy = fromMeta.y + fromMeta.h / 2;
    var tCx = toMeta.x + toMeta.w / 2;
    var tCy = toMeta.y + toMeta.h / 2;
    var dx = tCx - fCx, dy = tCy - fCy;
    var sx, sy, ex, ey;

    if (Math.abs(dx) >= Math.abs(dy)) {
      sy = fCy; ey = tCy;
      if (dx > 0) { sx = fromMeta.x + fromMeta.w + 4; ex = toMeta.x - 4; }
      else        { sx = fromMeta.x - 4;               ex = toMeta.x + toMeta.w + 4; }
    } else {
      sx = fCx; ex = tCx;
      if (dy > 0) { sy = fromMeta.y + fromMeta.h + 4; ey = toMeta.y - 4; }
      else        { sy = fromMeta.y - 4;               ey = toMeta.y + toMeta.h + 4; }
    }

    // Decide on routing: straight line, or insert an orthogonal waypoint to avoid
    // crossing intermediate shapes. Trigger when the straight segment passes
    // through any non-endpoint shape OR when the connection spans > 1 row.
    var skipIds = [fromMeta.id, toMeta.id];
    var needsWaypoint = segmentHitsAnyShape(sx, sy, ex, ey, skipIds);
    // Also detour multi-row spans even when nothing is in the way (cleaner read).
    var fromRow = -1, toRow = -1;
    for (var ri = 0; ri < rows.length; ri++) {
      for (var ci = 0; ci < rows[ri].length; ci++) {
        if (labelToMeta[components[rows[ri][ci]].label.toLowerCase()].id === fromMeta.id) fromRow = ri;
        if (labelToMeta[components[rows[ri][ci]].label.toLowerCase()].id === toMeta.id)   toRow   = ri;
      }
    }
    if (fromRow !== -1 && toRow !== -1 && Math.abs(toRow - fromRow) > 1) needsWaypoint = true;

    var points;
    if (needsWaypoint) {
      // Try a single-elbow detour: go out the side, jog vertically through the
      // gutter between rows, then jog into the target. We pick whichever side
      // (above/below) has more vertical clearance.
      // Anchor on right/left edges, mid-vertical between source & target.
      var waySx = (dx >= 0) ? fromMeta.x + fromMeta.w + 4 : fromMeta.x - 4;
      var waySy = fCy;
      var wayEx = (dx >= 0) ? toMeta.x - 4 : toMeta.x + toMeta.w + 4;
      var wayEy = tCy;
      // Mid-x for the elbow — push it into the empty gutter past the source by COL_GAP/2.
      var midX = waySx + (dx >= 0 ? 1 : -1) * Math.max(40, Math.abs(wayEx - waySx) / 2);
      // Detour candidate: out → up/down to mid → over → into target.
      sx = waySx; sy = waySy; ex = wayEx; ey = wayEy;
      points = [[0, 0], [midX - sx, 0], [midX - sx, ey - sy], [ex - sx, ey - sy]];
    } else {
      points = [[0, 0], [ex - sx, ey - sy]];
    }

    var arrowId = 'wba_' + uid();
    // Intra-band arrows (both endpoints in the same zone band) inherit the
    // band's groupId so they move with the band as one unit. Cross-band arrows
    // stay ungrouped — they're "wiring between zones" and shouldn't belong to
    // either side.
    var arrowGroupIds = (fromMeta.zoneGid && fromMeta.zoneGid === toMeta.zoneGid)
      ? [fromMeta.zoneGid] : [];
    var arrowEl = {
      id: arrowId, type: 'arrow',
      x: sx, y: sy,
      width: Math.abs(ex - sx) || 1, height: Math.abs(ey - sy) || 1,
      angle: 0, strokeColor: '#666666', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 0, opacity: 100, groupIds: arrowGroupIds,
      roundness: { type: 2 },
      seed: Math.floor(Math.random() * 2e9), version: 2,
      versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
      boundElements: [],
      points: points,
      startBinding: { elementId: fromMeta.id, focus: 0, gap: 6 },
      endBinding:   { elementId: toMeta.id,   focus: 0, gap: 6 },
      startArrowhead: null, endArrowhead: 'arrow',
      lastCommittedPoint: null,
    };
    newElements.push(arrowEl);
    // Register this arrow on its source and target shapes' boundElements
    [fromMeta.id, toMeta.id].forEach(function(shapeId) {
      var shapeEl = newElements.find(function(e) { return e.id === shapeId; });
      if (shapeEl) shapeEl.boundElements.push({ id: arrowId, type: 'arrow' });
    });

    // Emit label bound to the arrow (moves with it when dragged).
    // Anchor near the midpoint of the routed path (the last segment when
    // a waypoint was used, otherwise the straight midpoint).
    if (conn.label && conn.label.trim()) {
      var mxLocal, myLocal;
      if (points.length > 2) {
        var last = points[points.length - 1];
        var prev = points[points.length - 2];
        mxLocal = (last[0] + prev[0]) / 2;
        myLocal = (last[1] + prev[1]) / 2;
      } else {
        mxLocal = (ex - sx) / 2;
        myLocal = (ey - sy) / 2;
      }
      var labelId = 'wbal_' + uid();
      arrowEl.boundElements.push({ id: labelId, type: 'text' });
      newElements.push({
        id: labelId, type: 'text',
        x: sx + mxLocal - 60, y: sy + myLocal - 10,
        width: 120, height: 20,
        angle: 0, strokeColor: '#555555', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
        roughness: 0, opacity: 100, groupIds: arrowGroupIds, roundness: null,
        seed: Math.floor(Math.random() * 2e9), version: 2,
        versionNonce: Math.floor(Math.random() * 2e9), isDeleted: false,
        boundElements: null, containerId: arrowId,
        text: conn.label.trim(), fontSize: 11, fontFamily: 3,
        textAlign: 'center', verticalAlign: 'middle',
        originalText: conn.label.trim(), lineHeight: 1.25,
        baseline: 10,
      });
    }
  });

  if (newElements.length) {
    window._excalidrawAPI.updateScene({ elements: existing.concat(newElements) });
    saveSession();
    var drawer = document.getElementById('wb-drawer');
    if (drawer && !drawer.classList.contains('wb-open')) toggleWhiteboard();
    setTimeout(function() {
      if (!window._excalidrawAPI) return;
      window._excalidrawAPI.scrollToContent(newElements, { fitToContent: true, animate: true });
    }, 350);
  }

  return { text: cleanText, hadWbUpdate: newElements.length > 0 };
  } catch(e) {
    console.warn('Whiteboard render error:', e);
    return { text: cleanText, hadWbUpdate: false };
  }
}


// ── Whiteboard drawer ─────────────────────────────────
(function() {
  const drawer = document.getElementById('wb-drawer');
  let isOpen = false, wbInited = false;

  window.toggleWhiteboard = function() {
    isOpen = !isOpen;
    drawer.classList.toggle('wb-open', isOpen);
    if (isOpen && !wbInited) {
      // Wait for slide-in transition to finish before refreshing
      drawer.addEventListener('transitionend', function onTE() {
        drawer.removeEventListener('transitionend', onTE);
        wbInited = true;
        // initExcalidraw was called eagerly at startup; if it hasn't resolved yet, call it now
        if (!window._excalidrawAPI) initExcalidraw();
        else window._excalidrawAPI.refresh();
      });
    } else if (isOpen && window._excalidrawAPI) {
      drawer.addEventListener('transitionend', function onTE() {
        drawer.removeEventListener('transitionend', onTE);
        window._excalidrawAPI.refresh();
      });
    }
  };

  // Left-edge drag-to-resize handle
  const handle = document.getElementById('wb-resize-handle');
  let resizing = false, startX = 0, startW = 0;
  handle.addEventListener('mousedown', e => {
    resizing = true;
    startX = e.clientX;
    startW = drawer.offsetWidth;
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeUp);
    e.preventDefault();
  });
  function onResizeMove(e) {
    if (!resizing) return;
    const delta = startX - e.clientX;
    const newW = Math.min(Math.max(320, startW + delta), window.innerWidth * 0.9);
    drawer.style.width = newW + 'px';
    if (window._excalidrawAPI) window._excalidrawAPI.refresh();
  }
  function onResizeUp() {
    resizing = false;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeUp);
    if (window._excalidrawAPI) window._excalidrawAPI.refresh();
  }

  // Refresh on any drawer size change (e.g. window resize)
  new ResizeObserver(() => {
    if (window._excalidrawAPI) window._excalidrawAPI.refresh();
  }).observe(drawer);

  // Eagerly init Excalidraw in the background so the API is available for
  // whiteboard updates even if the user never opens the drawer.
  // The container exists in the DOM but is off-screen (translateX 100%).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { try { initExcalidraw(); } catch(e) {} });
  } else {
    try { initExcalidraw(); } catch(e) {}
  }
})();
