/* Underlines known jargon (without touching the page's DOM) and shows a tooltip on hover. */
(function () {
  "use strict";
  const JL = globalThis.JargonLens;
  const MAX_NODES = 15000;
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "CODE", "PRE", "SVG"]);

  let matcher = null;
  let enabled = true;
  let highlight = null;
  let tip = null, tipBody = null;
  let scanTimer = 0, moveTimer = 0, lastHit = null;

  // ---------- settings ----------
  async function load() {
    const sync = await chrome.storage.sync.get({ enabled: true, builtIn: true });
    const local = await chrome.storage.local.get({ glossaries: {} });
    enabled = sync.enabled;
    const entries = [];
    if (sync.builtIn) entries.push(...JL.BUILTIN);
    for (const [src, list] of Object.entries(local.glossaries)) {
      for (const e of list) entries.push({ term: e.term, meaning: e.meaning, source: src === "manual" ? "your glossary" : src });
    }
    matcher = JL.createMatcher(entries);
    rescan();
  }

  // ---------- underline ----------
  function injectStyle() {
    if (document.getElementById("jargon-lens-style")) return;
    const s = document.createElement("style");
    s.id = "jargon-lens-style";
    s.textContent = "::highlight(jargon-lens){text-decoration:underline dotted #7c5cff;text-decoration-thickness:2px;text-underline-offset:3px;}";
    (document.head || document.documentElement).appendChild(s);
  }

  function skipNode(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (SKIP.has(n.tagName)) return true;
      if (n.isContentEditable) return true; // never decorate text the person is typing
      if (n.id === "jargon-lens-host") return true;
    }
    return false;
  }

  function rescan() {
    if (!("highlights" in CSS)) return;
    if (!highlight) { highlight = new Highlight(); CSS.highlights.set("jargon-lens", highlight); }
    highlight.clear();
    if (!enabled || !matcher || !matcher.size || !document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n, count = 0;
    while ((n = walker.nextNode()) && count++ < MAX_NODES) {
      const text = n.data;
      if (text.length < 2 || !n.parentElement || skipNode(n.parentElement)) continue;
      for (const m of matcher.find(text)) {
        const r = new Range();
        r.setStart(n, m.start);
        r.setEnd(n, m.end);
        highlight.add(r);
      }
    }
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(rescan, 600);
  }

  // ---------- tooltip ----------
  function ensureTip() {
    if (tip) return;
    const host = document.createElement("div");
    host.id = "jargon-lens-host";
    host.style.cssText = "all:initial;position:fixed;z-index:2147483647;top:0;left:0;pointer-events:none;";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML =
      "<style>.tip{position:fixed;max-width:320px;padding:10px 12px;border-radius:10px;background:#1d1a2f;color:#f4f1ff;" +
      "font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 28px rgba(20,10,60,.35);display:none}" +
      ".t{font-weight:700;color:#cbbcff;margin-bottom:2px}.s{margin-top:6px;font-size:11px;opacity:.65}</style>" +
      '<div class="tip"><div class="t"></div><div class="m"></div><div class="s"></div></div>';
    document.documentElement.appendChild(host);
    tip = root.querySelector(".tip");
    tipBody = { t: tip.querySelector(".t"), m: tip.querySelector(".m"), s: tip.querySelector(".s") };
  }

  function show(hit, rect) {
    ensureTip();
    tipBody.t.textContent = hit.entry.term;
    tipBody.m.textContent = hit.entry.meaning;
    tipBody.s.textContent = hit.entry.source === "built-in" ? "" : "from " + hit.entry.source;
    tip.style.display = "block";
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = Math.min(Math.max(8, rect.left), innerWidth - w - 8);
    let y = rect.top - h - 8;
    if (y < 8) y = rect.bottom + 8;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  function hide() {
    if (tip) tip.style.display = "none";
    lastHit = null;
  }

  function hitTest(x, y) {
    if (!enabled || !matcher) return null;
    const pos = document.caretPositionFromPoint
      ? document.caretPositionFromPoint(x, y)
      : (() => { const r = document.caretRangeFromPoint && document.caretRangeFromPoint(x, y); return r && { offsetNode: r.startContainer, offset: r.startOffset }; })();
    if (!pos || !pos.offsetNode || pos.offsetNode.nodeType !== Node.TEXT_NODE) return null;
    const node = pos.offsetNode;
    if (!node.parentElement || skipNode(node.parentElement)) return null;
    for (const m of matcher.find(node.data)) {
      if (pos.offset < m.start || pos.offset > m.end) continue;
      const r = new Range();
      r.setStart(node, m.start);
      r.setEnd(node, m.end);
      const rect = r.getBoundingClientRect();
      if (x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 2 && y <= rect.bottom + 2) return { entry: m.entry, rect, key: node.data.slice(m.start, m.end) + m.start };
    }
    return null;
  }

  function onMove(e) {
    clearTimeout(moveTimer);
    const x = e.clientX, y = e.clientY;
    moveTimer = setTimeout(() => {
      const hit = hitTest(x, y);
      if (!hit) return hide();
      if (lastHit && lastHit.key === hit.key) return;
      lastHit = hit;
      show(hit, hit.rect);
    }, 120);
  }

  // ---------- start ----------
  injectStyle();
  document.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("scroll", hide, { passive: true, capture: true });
  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  chrome.storage.onChanged.addListener(load);
  load();
})();
