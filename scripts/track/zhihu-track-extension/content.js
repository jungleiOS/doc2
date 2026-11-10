// 知乎答主选题追踪 - 内容脚本
// 在作者名片旁注入「＋追踪答主」按钮，点击后写入本地服务。
// 写回双通道：优先直连 127.0.0.1（server 已放行 CORS），被页面 CSP 拦截时回退 background 转发。

(function () {
  "use strict";

  var BTN_ATTR = "data-zh-track-btn";
  var SERVER = "http://127.0.0.1:43121";

  // 通道二：background service worker 转发（有 host_permissions，不受页面 CSP 限制）
  function swPost(path, body) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        if (!done) { done = true; resolve({ ok: false, error: "background 无响应（service worker 可能未启动）" }); }
      }, 8000);
      try {
        chrome.runtime.sendMessage({ type: "track-post", path: path, body: body }, function (resp) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(resp || { ok: false, error: "background 返回空响应" });
        });
      } catch (err) {
        if (!done) { done = true; clearTimeout(timer); resolve({ ok: false, error: String(err && err.message || err) }); }
      }
    });
  }

  // 优先直连；fetch 被页面 CSP 拒绝（TypeError）时才回退 background
  function post(path, body) {
    return fetch(SERVER + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
        return { ok: res.ok, status: res.status, data: data };
      });
    }, function (err) {
      return swPost(path, body).then(function (resp) {
        resp.via = "background（直连被页面 CSP 拦截）";
        return resp;
      });
    });
  }

  // 从作者链接提取 token：/people/<token>
  function extractToken(href) {
    if (!href) return "";
    var m = href.match(/\/people\/([^/?#]+)/);
    return m ? m[1] : "";
  }

  // 找作者名片容器：回答页 .AnswerItem .AuthorInfo，文章页 .Post-Author，选择器从宽到严容错
  // 知乎的「相关推荐」卡片会嵌套多层 .AuthorInfo（外层卡片 + 内层作者 + 隐藏 hovercard），
  // 同一 token 只保留嵌套最深的一个容器，避免一个卡片被注入多个按钮。
  function findAuthorBlocks() {
    var blocks = Array.prototype.slice.call(
      document.querySelectorAll(".AnswerItem .AuthorInfo, .Post-Author, .AuthorInfo")
    );
    var withToken = [];
    blocks.forEach(function (block) {
      var link = findAuthorLink(block);
      var token = link ? extractToken(link.getAttribute("href")) : "";
      if (token) withToken.push({ block: block, token: token });
    });
    return withToken
      .filter(function (x) {
        // 若同 token 的另一个容器嵌套在 x 内部，则跳过 x（保留更内层的）
        return !withToken.some(function (y) {
          return y.block !== x.block && y.token === x.token && x.block.contains(y.block);
        });
      })
      .map(function (x) { return x.block; });
  }

  // 在名片容器内找作者链接（用于取 token 和昵称）
  function findAuthorLink(block) {
    var links = block.querySelectorAll('a[href*="/people/"]');
    for (var i = 0; i < links.length; i++) {
      var token = extractToken(links[i].getAttribute("href"));
      if (token) return links[i];
    }
    return null;
  }

  // 取作者昵称：优先链接文字；链接里只有头像时退到 img alt / 名片内的名字元素；
  // 都没有则用 token 兜底，保证写入不因空 name 被拒
  function authorName(block, link, token) {
    var t = link.textContent.replace(/[\u200b\u200c\u200d]/g, "").trim();
    if (t) return t;
    var img = link.querySelector("img");
    t = img && img.alt ? img.alt.trim() : "";
    if (t) return t;
    var nameEl = block.querySelector(".AuthorInfo-name, [class*='AuthorInfo-name'], .AuthorInfo-job + *");
    t = nameEl ? nameEl.textContent.trim() : "";
    if (t) return t;
    return token;
  }

  function applyStyle(btn, tracked) {
    btn.textContent = tracked ? "✓已追踪" : "＋追踪答主";
    btn.style.cssText = [
      "display:inline-block",
      "margin-left:8px",
      "padding:1px 8px",
      "font-size:12px",
      "line-height:18px",
      "border-radius:10px",
      "cursor:pointer",
      "vertical-align:middle",
      tracked
        ? "color:#8590a6;border:1px solid #cfd8dc;background:#f6f8fa"
        : "color:#056de8;border:1px solid #056de8;background:#fff",
    ].join(";");
  }

  // 给单个名片注入按钮
  function injectButton(block) {
    if (block.getAttribute(BTN_ATTR)) return;
    var link = findAuthorLink(block);
    if (!link) return;
    var token = extractToken(link.getAttribute("href"));
    if (!token) return;
    if (block.querySelector("[" + BTN_ATTR + "]")) return;

    var btn = document.createElement("span");
    btn.setAttribute(BTN_ATTR, "1");
    applyStyle(btn, false);
    btn.title = "追踪此答主（用于追踪他回答的题目，供自己选题参考）（本地）";

    function addAuthor(note) {
      post("/add", {
        urlToken: token,
        name: authorName(block, link, token),
        headline: "",
        sourceAnswerUrl: location.href,
        note: note,
        tags: [],
      }).then(function (resp) {
        if (resp.ok) {
          applyStyle(btn, true);
          document.title = "[TRACK-OK] " + link.textContent.trim();
        } else {
          console.error("[选题追踪] 写入失败，本地服务是否已启动？", resp);
          var why = resp.error || (resp.data && (resp.data.error || resp.data.raw)) || ("HTTP " + resp.status) || "未知原因";
          if (resp.via) why += "（" + resp.via + "）";
          document.title = "[TRACK-FAIL] " + why;
          alert("写入失败：" + why + "\n\n本地服务是否已启动？（开机自启：launchctl print gui/$(id -u)/com.jiangjun.zhihu-track-server）");
        }
      });
    }

    function removeAuthor() {
      post("/remove", { urlToken: token }).then(function (resp) {
        if (resp.ok) {
          applyStyle(btn, false);
        } else {
          alert("取消追踪失败：" + ((resp.data && resp.data.error) || resp.error || "未知原因"));
        }
      });
    }

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      // 已追踪状态下再点 = 取消追踪
      if (btn.textContent.indexOf("已追踪") >= 0) {
        if (confirm("取消追踪「" + authorName(block, link, token) + "」？\n（下次采集不再抓他的新回答）")) removeAuthor();
        return;
      }
      var note = prompt("为什么追踪这位答主？（一句话，可留空）", "") || "";
      addAuthor(note);
    });

    // 插到名片容器内末尾，尽量不破坏原有布局；同时在容器上打标记，避免 MutationObserver 重复触发
    block.setAttribute(BTN_ATTR, "1");
    block.appendChild(btn);
  }

  // 批量给已追踪作者的按钮换样式（用 POST /has 一次查整页）
  function markTracked() {
    var blocks = findAuthorBlocks();
    var tokenToBtns = new Map();
    blocks.forEach(function (block) {
      var btn = block.querySelector("[" + BTN_ATTR + "]");
      if (!btn) return;
      var link = findAuthorLink(block);
      var token = link ? extractToken(link.getAttribute("href")) : "";
      if (!token) return;
      if (!tokenToBtns.has(token)) tokenToBtns.set(token, []);
      tokenToBtns.get(token).push(btn);
    });
    if (!tokenToBtns.size) return;

    var tokens = Array.from(tokenToBtns.keys());
    post("/has", tokens).then(function (resp) {
      if (!resp.ok || !resp.data) return;
      (resp.data.tracked || []).forEach(function (token) {
        (tokenToBtns.get(token) || []).forEach(function (btn) { applyStyle(btn, true); });
      });
    });
  }

  // 主流程：注入缺失的按钮，再批量刷新「已追踪」样式
  function scan() {
    findAuthorBlocks().forEach(injectButton);
    markTracked();
  }

  // 自动化联调钩子：页面派发 document CustomEvent「zh-track-test-add」（detail: {token, name, note}）
  // 即可绕过 prompt 走完整写回链路（用于 ego-browser 自动测试，正常浏览无影响）
  document.addEventListener("zh-track-test-add", function (e) {
    var d = e.detail || {};
    if (!d.token) return;
    post("/add", {
      urlToken: d.token,
      name: d.name || d.token,
      headline: "",
      sourceAnswerUrl: location.href,
      note: d.note || "自动化联调",
      tags: [],
    }).then(function (resp) {
      document.title = resp.ok ? "[TRACK-OK] " + (d.name || d.token)
        : "[TRACK-FAIL] " + (resp.error || (resp.data && resp.data.error) || ("HTTP " + resp.status));
    });
  });

  scan();

  // SPA 路由变化（知乎是单页应用）：监听 url 变化后重新扫描
  var lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // 等新页面 DOM 渲染一轮再扫
      setTimeout(scan, 1500);
    }
  }, 1000);

  // 动态加载的回答流（收起/展开、推荐流）：用 MutationObserver 兜底
  var observer = new MutationObserver(function () {
    // 节流：只在还有未注入按钮的顶层名片时触发
    var missing = findAuthorBlocks().some(function (b) { return !b.hasAttribute(BTN_ATTR); });
    if (missing) scan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
