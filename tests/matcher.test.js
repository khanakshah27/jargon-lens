const test = require("node:test");
const assert = require("node:assert");
const { createMatcher } = require("../src/matcher.js");
const { parseGlossary } = require("../src/glossary-parse.js");
const builtin = require("../src/glossary.json");

const m = createMatcher(builtin);
const terms = (s) => m.find(s).map((x) => x.entry.term);

test("finds acronyms with exact case", () => {
  assert.deepStrictEqual(terms("This is a P0, please check the OKR doc"), ["P0", "OKR"]);
  assert.deepStrictEqual(terms("okr and p0 in lowercase are not acronyms"), []);
});

test("handles plurals of acronyms", () => {
  assert.deepStrictEqual(terms("Our OKRs and SLAs"), ["OKR", "SLA"]);
});

test("ignores terms inside other words", () => {
  assert.deepStrictEqual(terms("MOPR PRESS SPRINTER"), []);
});

test("matches multi-word phrases ignoring case", () => {
  assert.deepStrictEqual(terms("Let's Circle Back and take this offline"), ["circle back", "take this offline"]);
  assert.deepStrictEqual(terms("Let's take this offline"), ["take this offline"]);
});

test("prefers the longest phrase", () => {
  const mm = createMatcher([{ term: "tech", meaning: "x" }, { term: "tech debt", meaning: "y" }]);
  assert.deepStrictEqual(mm.find("we have tech debt").map((x) => x.entry.term), ["tech debt"]);
});

test("reports correct offsets", () => {
  const [hit] = m.find("ping me by EOD");
  assert.strictEqual(hit.start, 0);
  const s = "ping me by EOD";
  const eod = m.find(s)[1];
  assert.strictEqual(s.slice(eod.start, eod.end), "EOD");
});

test("company glossary overrides built-in meaning", () => {
  const mm = createMatcher([...builtin, { term: "PR", meaning: "Public Relations", source: "acme" }]);
  assert.strictEqual(mm.find("send the PR")[0].entry.meaning, "Public Relations");
});

test("slashes and symbols in terms are escaped", () => {
  assert.deepStrictEqual(terms("our CI/CD pipeline"), ["CI/CD"]);
});

test("parses CSV with header, quotes and commas", () => {
  const out = parseGlossary('term,meaning\nAtlas,"Our platform, version 2"\nNPS,Net Promoter Score');
  assert.deepStrictEqual(out, [
    { term: "Atlas", meaning: "Our platform, version 2" },
    { term: "NPS", meaning: "Net Promoter Score" },
  ]);
});

test("parses JSON array and object forms", () => {
  assert.strictEqual(parseGlossary('[{"term":"A1","meaning":"x"}]').length, 1);
  assert.deepStrictEqual(parseGlossary('{"A1":"x","B2":{"definition":"y"}}').map((e) => e.term), ["A1", "B2"]);
});

test("rejects broken JSON", () => {
  assert.throws(() => parseGlossary("[{oops"));
});

test("built-in glossary is well formed", () => {
  const seen = new Set();
  for (const e of builtin) {
    assert.ok(e.term && e.meaning, "empty entry");
    assert.ok(!seen.has(e.term.toLowerCase()), "duplicate " + e.term);
    seen.add(e.term.toLowerCase());
  }
});
