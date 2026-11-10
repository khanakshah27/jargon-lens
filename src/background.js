/* Keeps shared company glossaries (JSON or CSV at a URL) up to date. */
importScripts("glossary-parse.js");
const { parseGlossary } = self.JargonLens;
const REFRESH_MINUTES = 360;

async function syncSource(url) {
  const { sources = {}, glossaries = {} } = await chrome.storage.local.get(["sources", "glossaries"]);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const entries = parseGlossary(await res.text());
    if (!entries.length) throw new Error("No terms found in that file.");
    glossaries[url] = entries;
    sources[url] = { count: entries.length, updated: Date.now(), error: null };
  } catch (err) {
    sources[url] = { ...(sources[url] || {}), error: String(err.message || err), updated: Date.now() };
  }
  await chrome.storage.local.set({ sources, glossaries });
  return sources[url];
}

async function syncAll() {
  const { sources = {} } = await chrome.storage.local.get("sources");
  for (const url of Object.keys(sources)) await syncSource(url);
}

chrome.runtime.onInstalled.addListener(() => chrome.alarms.create("refresh", { periodInMinutes: REFRESH_MINUTES }));
chrome.alarms.onAlarm.addListener((a) => a.name === "refresh" && syncAll());
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === "sync") { (msg.url ? syncSource(msg.url) : syncAll()).then(reply); return true; }
});
