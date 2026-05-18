// ── CDN failure degradation (#6) ──────────────────────
// React / Excalidraw / JSZip load from CDNs — if any fails, degrade gracefully
// instead of silently breaking the whiteboard or export flow.
(function() {
  function check() {
    const missing = [];
    if (typeof React === 'undefined')          missing.push('React');
    if (typeof ReactDOM === 'undefined')       missing.push('React-DOM');
    if (typeof ExcalidrawLib === 'undefined')  missing.push('Excalidraw');
    if (typeof JSZip === 'undefined')          missing.push('JSZip');
    if (!missing.length) return;
    const wbDown = missing.some(m => m === 'React' || m === 'React-DOM' || m === 'Excalidraw');
    // Disable the whiteboard toggle + show a placeholder note in the drawer.
    if (wbDown) {
      const tog = document.getElementById('wb-tab');
      if (tog) {
        tog.disabled = true;
        tog.title = 'Whiteboard unavailable — CDN failed to load (' + missing.join(', ') + ')';
        tog.style.opacity = '0.45';
        tog.style.pointerEvents = 'none';
      }
      const cont = document.getElementById('wb-excalidraw-container');
      if (cont) {
        cont.innerHTML = '<div style="padding:24px;font-family:var(--font-ui);font-size:13px;color:var(--text-muted);line-height:1.6">⚠️ <strong>Whiteboard unavailable.</strong><br>Couldn’t load Excalidraw from the CDN (' + missing.join(', ') + ').<br>Check your network / ad-blocker and refresh. The chat still works without it.</div>';
      }
    }
    if (typeof JSZip === 'undefined') {
      // exportEntryFiles already falls back to separate-file downloads when JSZip is missing —
      // just surface the degradation once in the error banner.
      if (typeof showErr === 'function') showErr('Note: JSZip CDN failed — exports will download as separate files (.md + .png + .excalidraw) instead of a single .zip.');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check);
  else setTimeout(check, 0);
})();
