// 后台 service worker：代替内容脚本发请求到本地服务。
// MV3 内容脚本受页面 CORS 限制，扩展后台有 host_permissions 可以直接 fetch 127.0.0.1。
const SERVER = "http://127.0.0.1:43121";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "track-post") return false;
  fetch(SERVER + msg.path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg.body),
  })
    .then(async (res) => {
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      sendResponse({ ok: res.ok, status: res.status, data });
    })
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
  return true; // 异步 sendResponse
});
