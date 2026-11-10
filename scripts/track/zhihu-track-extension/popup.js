// 追踪列表面板：读 /list 渲染名单，点「移除」调 /remove
var SERVER = "http://127.0.0.1:43121";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function load() {
  fetch(SERVER + "/list")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var authors = d.authors || [];
      document.getElementById("count").textContent = "（" + authors.length + " 人）";
      var box = document.getElementById("list");
      if (!authors.length) {
        box.innerHTML = '<div class="empty">还没有追踪任何答主<br>去知乎回答页点「＋追踪答主」</div>';
        return;
      }
      box.innerHTML = "";
      authors.forEach(function (a) {
        var item = document.createElement("div");
        item.className = "item";
        var meta = [a.note, a.addedAt ? "加入于 " + a.addedAt : ""].filter(Boolean).join(" · ");
        item.innerHTML =
          '<div class="info"><div class="name"><a target="_blank" href="https://www.zhihu.com/people/' +
          encodeURIComponent(a.urlToken) + '/answers">' + esc(a.name || a.urlToken) + "</a></div>" +
          '<div class="meta">' + esc(meta) + "</div></div>";
        var btn = document.createElement("button");
        btn.textContent = "移除";
        btn.addEventListener("click", function () {
          btn.disabled = true;
          btn.textContent = "…";
          fetch(SERVER + "/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urlToken: a.urlToken }),
          }).then(load, load);
        });
        item.appendChild(btn);
        box.appendChild(item);
      });
    })
    .catch(function () {
      document.getElementById("list").innerHTML =
        '<div class="empty">连不上本地服务<br>确认 server.mjs 在跑（launchctl kickstart gui/$(id -u)/com.jiangjun.zhihu-track-server）</div>';
    });
}

load();
