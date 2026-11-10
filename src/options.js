const { parseGlossary } = globalThis.JargonLens;
const $ = (id) => document.getElementById(id);
const say = (t, bad) => { $("msg").textContent = t; $("msg").className = bad ? "e" : ""; };

async function renderSources() {
  const { sources = {}, glossaries = {} } = await chrome.storage.local.get(["sources", "glossaries"]);
  const ul = $("sources");
  ul.innerHTML = "";
  for (const [url, info] of Object.entries(sources)) {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.textContent = url;
    const meta = document.createElement("div");
    meta.className = info.error ? "e m" : "m";
    meta.textContent = info.error ? info.error : (info.count || 0) + " terms, synced " + new Date(info.updated).toLocaleString();
    left.appendChild(meta);
    const rm = document.createElement("button");
    rm.className = "g"; rm.textContent = "Remove"; rm.style.marginTop = "0";
    rm.onclick = async () => { delete sources[url]; delete glossaries[url]; await chrome.storage.local.set({ sources, glossaries }); renderSources(); };
    li.append(left, rm);
    ul.appendChild(li);
  }
  const manual = glossaries.manual || [];
  if (manual.length && !$("paste").value) $("paste").value = manual.map((e) => `"${e.term}","${e.meaning.replace(/"/g, '""')}"`).join("\n");
}

$("add").onclick = async () => {
  let url;
  try { url = new URL($("url").value.trim()); if (url.protocol !== "https:") throw 0; } catch { return say("Enter a full https:// link.", true); }
  const granted = await chrome.permissions.request({ origins: [url.origin + "/*"] });
  if (!granted) return say("Permission is needed so the extension can download that file.", true);
  const { sources = {} } = await chrome.storage.local.get("sources");
  sources[url.href] = { count: 0, updated: Date.now(), error: null };
  await chrome.storage.local.set({ sources });
  say("Syncing…");
  const r = await chrome.runtime.sendMessage({ type: "sync", url: url.href });
  say(r && r.error ? r.error : "Added " + ((r && r.count) || 0) + " terms.", !!(r && r.error));
  $("url").value = "";
  renderSources();
};

$("save").onclick = async () => {
  let list;
  try { list = parseGlossary($("paste").value); } catch (e) { return say(e.message, true); }
  const { glossaries = {} } = await chrome.storage.local.get("glossaries");
  glossaries.manual = list;
  await chrome.storage.local.set({ glossaries });
  say("Saved " + list.length + " terms.");
};

$("clear").onclick = async () => {
  const { glossaries = {} } = await chrome.storage.local.get("glossaries");
  delete glossaries.manual;
  await chrome.storage.local.set({ glossaries });
  $("paste").value = "";
  say("Removed.");
};

renderSources();
