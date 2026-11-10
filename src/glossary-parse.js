/* Turns a shared glossary (JSON or CSV text) into [{term, meaning}]. */
(function (root) {
  "use strict";

  function parseCsvLine(line) {
    const cells = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    return cells.map((s) => s.trim());
  }

  function parseGlossary(text) {
    const src = String(text || "").replace(/^﻿/, "").trim();
    if (!src) return [];
    const clean = (t, m) => ({ term: String(t || "").trim(), meaning: String(m || "").trim() });
    let out = [];
    if (src[0] === "[" || src[0] === "{") {
      let data;
      try { data = JSON.parse(src); } catch (e) { throw new Error("That is not valid JSON."); }
      if (Array.isArray(data)) {
        out = data.map((r) => clean(r.term || r.acronym || r.name, r.meaning || r.definition || r.description));
      } else {
        out = Object.entries(data).map(([k, v]) => clean(k, typeof v === "string" ? v : v && (v.meaning || v.definition)));
      }
    } else {
      const lines = src.split(/\r?\n/).filter((l) => l.trim());
      const first = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
      const hasHeader = /^(term|acronym|name|word)$/.test(first[0]);
      for (const line of hasHeader ? lines.slice(1) : lines) {
        const [t, ...rest] = parseCsvLine(line);
        out.push(clean(t, rest.join(", ")));
      }
    }
    return out.filter((e) => e.term && e.meaning);
  }

  const api = { parseGlossary };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JargonLens = Object.assign(root.JargonLens || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
