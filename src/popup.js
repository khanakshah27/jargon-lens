const on = document.getElementById("on"), builtin = document.getElementById("builtin");
chrome.storage.sync.get({ enabled: true, builtIn: true }).then((s) => { on.checked = s.enabled; builtin.checked = s.builtIn; });
on.onchange = () => chrome.storage.sync.set({ enabled: on.checked });
builtin.onchange = () => chrome.storage.sync.set({ builtIn: builtin.checked });
document.getElementById("opts").onclick = (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); };
