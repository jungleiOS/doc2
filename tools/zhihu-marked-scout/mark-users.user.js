// ==UserScript==
// @name         知乎用户标记器（活跃关注者挖掘）
// @namespace    local.zhihu.marked-scout
// @version      1.0.0
// @description  在知乎页面给用户加「标记」按钮，标记结果存 localStorage，可导出 JSON 供 ego-browser 爬取脚本使用。
// @match        https://www.zhihu.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  var STORAGE_KEY = 'zh_marked_users';
  // 每个 url_token 只挂一次按钮
  var DECORATED = new WeakSet();

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    renderPanel();
  }

  function tokenOf(href) {
    var m = href.match(/zhihu\.com\/people\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function mark(token, name, url) {
    var data = load();
    data[token] = { name: name, url: url, markedAt: new Date().toISOString() };
    save(data);
  }

  function unmark(token) {
    var data = load();
    delete data[token];
    save(data);
  }

  function makeBtn(token, name, url, small) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.zhMark = token;
    btn.style.cssText =
      'margin-left:6px;padding:1px 8px;border-radius:10px;border:1px solid #056de8;' +
      'background:#fff;color:#056de8;font-size:12px;cursor:pointer;line-height:1.6;' +
      (small ? '' : 'font-size:14px;padding:4px 14px;');
    function refresh() {
      var marked = !!load()[token];
      btn.textContent = marked ? '✓已标记' : '＋标记';
      btn.style.background = marked ? '#056de8' : '#fff';
      btn.style.color = marked ? '#fff' : '#056de8';
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (load()[token]) {
        unmark(token);
      } else {
        mark(token, name, url);
      }
      refresh();
    });
    refresh();
    return btn;
  }

  // 个人主页：按钮直接挂到操作区
  function decorateProfile() {
    var token = location.pathname.match(/^\/people\/([^/?#]+)/);
    if (!token) return;
    if (document.querySelector('[data-zh-profile-mark]')) return;
    var nameEl = document.querySelector('.ProfileHeader-name, h1');
    var name = nameEl ? nameEl.textContent.trim() : token[1];
    var btn = makeBtn(token[1], name, 'https://www.zhihu.com/people/' + token[1], false);
    btn.dataset.zhProfileMark = '1';
    (document.querySelector('.ProfileHeader-contentHeader, .ProfileHeader-main') || nameEl).appendChild(btn);
  }

  // 时间线/回答里的作者链接：行内小按钮
  function decorateLinks() {
    var links = document.querySelectorAll('a[href*="/people/"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (DECORATED.has(a)) continue;
      var token = tokenOf(a.href);
      if (!token) continue;
      // 只给作者名类链接加，避免导航栏等噪音
      var cls = a.className || '';
      var isAuthor = /UserLink|author|Author|name/.test(cls) || a.closest('.AnswerItem, .QuestionItem, .ContentItem, .PinItem');
      if (!isAuthor) continue;
      DECORATED.add(a);
      a.insertAdjacentElement('afterend', makeBtn(token, a.textContent.trim(), a.href.split('?')[0], true));
    }
  }

  // 浮动面板：数量 + 导出
  function renderPanel() {
    var panel = document.getElementById('zh-mark-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'zh-mark-panel';
      panel.style.cssText =
        'position:fixed;right:16px;bottom:16px;z-index:99999;background:#fff;' +
        'border:1px solid #d3dce6;border-radius:8px;padding:10px 12px;font-size:13px;' +
        'box-shadow:0 2px 12px rgba(0,0,0,.12);color:#1a1a1a;';
      document.body.appendChild(panel);
    }
    var data = load();
    var keys = Object.keys(data);
    panel.innerHTML =
      '<div style="font-weight:600;margin-bottom:6px;">已标记用户：<b>' + keys.length + '</b></div>' +
      '<div style="display:flex;gap:6px;">' +
      '<button id="zh-mark-copy" style="flex:1;padding:4px 8px;border:1px solid #056de8;border-radius:6px;background:#056de8;color:#fff;cursor:pointer;">复制JSON</button>' +
      '<button id="zh-mark-clear" style="padding:4px 8px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;">清空</button>' +
      '</div>' +
      '<div id="zh-mark-tip" style="margin-top:4px;color:#8590a6;font-size:12px;"></div>';
    panel.querySelector('#zh-mark-copy').addEventListener('click', function () {
      var text = JSON.stringify(keys.map(function (k) { return { token: k, name: data[k].name, url: data[k].url }; }), null, 2);
      navigator.clipboard.writeText(text).then(function () {
        panel.querySelector('#zh-mark-tip').textContent = '已复制，粘贴到 marked-users.json';
      });
    });
    panel.querySelector('#zh-mark-clear').addEventListener('click', function () {
      if (confirm('清空全部 ' + keys.length + ' 个标记？')) {
        save({});
      }
    });
  }

  function run() {
    decorateProfile();
    decorateLinks();
    renderPanel();
  }

  var timer = null;
  new MutationObserver(function () {
    clearTimeout(timer);
    timer = setTimeout(run, 300);
  }).observe(document.body, { childList: true, subtree: true });

  run();
})();
