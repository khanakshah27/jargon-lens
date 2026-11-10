/* Finds glossary terms inside plain text. No DOM, no extension APIs, so it is easy to test. */
(function (root) {
  "use strict";

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
  // Acronyms (all capitals, or a capital plus digits like P0) must match case exactly.
  const isAcronym = (t) => /^[A-Z0-9][A-Z0-9/&-]*$/.test(t) && /[A-Z]/.test(t);
  // Short mixed-case terms such as "SaaS", "MoM", "YoY" are also case sensitive.
  const isMixedShort = (t) => t.length <= 5 && /[a-z]/.test(t) && /[A-Z]/.test(t.slice(1));

  function createMatcher(entries) {
    const map = new Map(); // lowercase term -> entry (later entries win, so company glossaries override)
    for (const e of entries) {
      if (!e || !e.term || !e.meaning) continue;
      const term = String(e.term).trim();
      if (term.length < 2) continue;
      map.set(term.toLowerCase(), { term, meaning: String(e.meaning).trim(), source: e.source || "built-in" });
    }
    const list = [...map.values()].sort((a, b) => b.term.length - a.term.length);
    if (!list.length) return { find: () => [], size: 0 };

    const alt = list
      .map((e) => esc(e.term) + (isAcronym(e.term) || isMixedShort(e.term) ? "(?:s)?" : ""))
      .join("|");
    const re = new RegExp("(?<![A-Za-z0-9_])(?:" + alt + ")(?![A-Za-z0-9_])", "gi");

    function find(text) {
      const out = [];
      if (!text || text.length < 2) return out;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        let hit = m[0];
        let entry = map.get(hit.toLowerCase());
        if (!entry && /s$/i.test(hit)) entry = map.get(hit.slice(0, -1).toLowerCase()); // OKRs -> OKR
        if (!entry) continue;
        const exact = hit.toLowerCase() === entry.term.toLowerCase() ? hit : hit.slice(0, -1);
        if ((isAcronym(entry.term) || isMixedShort(entry.term)) && exact !== entry.term) continue;
        out.push({ start: m.index, end: m.index + hit.length, entry });
      }
      return out;
    }
    return { find, size: list.length };
  }

  const api = { createMatcher };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JargonLens = Object.assign(root.JargonLens || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
