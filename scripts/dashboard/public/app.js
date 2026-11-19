// 看板前端：拉 API、画图、切 Tab。图表全部手写 SVG，无外部依赖、可离线。
const $ = (sel, root = document) => root.querySelector(sel);
const SVG_NS = "http://www.w3.org/2000/svg";

const state = {
  meta: null,
  answers: null,
  pool: null,
  social: null,
  answerSort: "reads",
};

/* ---------------- 通用工具 ---------------- */

const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("zh-CN"));
const pctText = (n) => (n == null ? "—" : `${n.toFixed(2)}%`);
const truncate = (s, len) => (s.length > len ? `${s.slice(0, len)}…` : s);

/** 按像素宽度裁剪标签：中文按全宽算，数字和字母按半宽算，避免日期被误截 */
function fitLabel(text, maxPx, fontSize) {
  const isWide = (ch) => /[\u3000-\u9fff\uff00-\uffef]/.test(ch);
  let width = 0;
  let out = "";
  for (const ch of text) {
    const charWidth = isWide(ch) ? fontSize : fontSize * 0.56;
    if (width + charWidth > maxPx) return `${out}…`;
    width += charWidth;
    out += ch;
  }
  return out;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/* ---------------- 悬浮提示 ---------------- */

const tip = $("#tooltip");

function bindTip(node, html) {
  node.addEventListener("mouseenter", (e) => {
    tip.innerHTML = html;
    tip.classList.add("show");
    positionTip(e);
  });
  node.addEventListener("mousemove", positionTip);
  node.addEventListener("mouseleave", () => tip.classList.remove("show"));
}

function positionTip(e) {
  const pad = 14;
  const rect = tip.getBoundingClientRect();
  // 靠近右/下边缘时翻到另一侧，避免被裁掉
  const left = e.clientX + pad + rect.width > window.innerWidth ? e.clientX - pad - rect.width : e.clientX + pad;
  const top = e.clientY + pad + rect.height > window.innerHeight ? e.clientY - pad - rect.height : e.clientY + pad;
  tip.style.left = `${Math.max(4, left)}px`;
  tip.style.top = `${Math.max(4, top)}px`;
}

/* ---------------- 图表：横向条形 ---------------- */

/**
 * 横向条形图。每行一条，长度按 value 归一。
 * rows: [{ label, value, display, color, tip }]
 */
function hbarChart(container, rows, { labelWidth = 260, rowHeight = 26, fontSize = 12 } = {}) {
  container.innerHTML = "";
  if (!rows.length) {
    container.appendChild(el("div", "empty", "暂无数据"));
    return;
  }

  // 按容器实际宽度建 viewBox，SVG 1:1 渲染，字号才不会被缩放拉小
  const width = Math.max(360, container.clientWidth || 900);
  const valueWidth = 90;
  const barMax = width - labelWidth - valueWidth - 8;
  const height = rows.length * rowHeight + 8;
  const max = Math.max(...rows.map((r) => r.value), 1);

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" });

  rows.forEach((row, i) => {
    const y = i * rowHeight + 4;
    const barW = Math.max(2, (row.value / max) * barMax);

    const label = svgEl("text", {
      x: 0,
      y: y + rowHeight / 2 + 4,
      class: "axis-label",
      "font-size": fontSize,
    });
    label.textContent = fitLabel(row.label, labelWidth - 10, fontSize);
    svg.appendChild(label);

    const rect = svgEl("rect", {
      x: labelWidth,
      y: y + (rowHeight - 16) / 2,
      width: barW,
      height: 16,
      rx: 3,
      fill: row.color ?? "#1667d1",
      class: "bar",
    });
    bindTip(rect, row.tip ?? `${row.label}<br>${row.display}`);
    svg.appendChild(rect);

    const value = svgEl("text", {
      x: labelWidth + barMax + 8,
      y: y + rowHeight / 2 + 4,
      class: "value-label",
      "font-size": fontSize,
      "text-anchor": "start",
    });
    value.textContent = row.display;
    svg.appendChild(value);
  });

  container.appendChild(svg);
}

/* ---------------- 图表：堆叠柱状 ---------------- */

/**
 * 堆叠柱状图，用于「每轮决策的入选/拒绝/跳过」。
 * rows: [{ label, parts: [{ key, value, color }] }]
 */
function stackedColumnChart(container, rows, series, { height = 240 } = {}) {
  container.innerHTML = "";
  if (!rows.length) {
    container.appendChild(el("div", "empty", "暂无数据"));
    return;
  }

  const width = Math.max(360, container.clientWidth || 900);
  const padBottom = 34;
  const padTop = 10;
  const plotH = height - padBottom - padTop;
  const slot = width / rows.length;
  const barW = Math.min(64, slot * 0.6);
  const max = Math.max(...rows.map((r) => r.parts.reduce((s, p) => s + p.value, 0)), 1);

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" });

  rows.forEach((row, i) => {
    const cx = slot * i + slot / 2;
    let acc = 0;
    row.parts.forEach((part) => {
      if (!part.value) return;
      const h = (part.value / max) * plotH;
      const y = padTop + plotH - acc - h;
      const rect = svgEl("rect", {
        x: cx - barW / 2,
        y,
        width: barW,
        height: Math.max(1, h),
        fill: series.find((s) => s.key === part.key)?.color ?? "#1667d1",
        class: "bar",
      });
      const total = row.parts.reduce((s, p) => s + p.value, 0);
      bindTip(
        rect,
        `<b>${row.label}</b><br>${series.find((s) => s.key === part.key)?.label}：${part.value}` +
          `<br>本轮合计 ${total} 题`
      );
      svg.appendChild(rect);
      acc += h;
    });

    const label = svgEl("text", {
      x: cx,
      y: height - 16,
      class: "axis-label",
      "font-size": 11,
      "text-anchor": "middle",
    });
    label.textContent = row.label.slice(5); // 去掉年份前缀，只留 MM-DD
    svg.appendChild(label);

    // 柱顶标注（如「跳过 90」），避免把数量级悬殊的项堆进同一根柱
    if (row.note) {
      const note = svgEl("text", {
        x: cx,
        y: padTop + plotH - acc - 6,
        class: "axis-label",
        "font-size": 10,
        "text-anchor": "middle",
      });
      note.textContent = row.note;
      svg.appendChild(note);
    }
  });

  container.appendChild(svg);
}

/* ---------------- 图表：环形占比 ---------------- */

const DONUT_COLORS = ["#1667d1", "#5c9ded", "#9fc3f0", "#d0e2f8", "#e9f1fb"];

function donutChart(container, rows, { size = 220 } = {}) {
  container.innerHTML = "";
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) {
    container.appendChild(el("div", "empty", "暂无数据"));
    return;
  }

  const wrap = el("div");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "20px";

  const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: "img" });
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  rows.forEach((row, i) => {
    const frac = row.value / total;
    const dash = frac * circumference;
    const circle = svgEl("circle", {
      cx,
      cy,
      r,
      fill: "none",
      stroke: DONUT_COLORS[i % DONUT_COLORS.length],
      "stroke-width": 20,
      "stroke-dasharray": `${dash} ${circumference - dash}`,
      "stroke-dashoffset": -offset,
      transform: `rotate(-90 ${cx} ${cy})`,
      class: "bar",
    });
    bindTip(circle, `<b>${row.label}</b><br>${fmt(row.value)} 个（${((frac * 100).toFixed(1))}%）`);
    svg.appendChild(circle);
    offset += dash;
  });

  const center = svgEl("text", {
    x: cx,
    y: cy + 6,
    "text-anchor": "middle",
    "font-size": 20,
    "font-weight": 600,
    fill: "#1c2024",
  });
  center.textContent = fmt(total);
  svg.appendChild(center);
  wrap.appendChild(svg);

  const legend = el("div");
  legend.style.display = "flex";
  legend.style.flexDirection = "column";
  legend.style.gap = "6px";
  rows.forEach((row, i) => {
    const item = el("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.gap = "8px";
    item.style.fontSize = "12px";
    const dot = el("span");
    dot.style.width = "10px";
    dot.style.height = "10px";
    dot.style.borderRadius = "2px";
    dot.style.background = DONUT_COLORS[i % DONUT_COLORS.length];
    const text = el("span", null, `${row.label} ${fmt(row.value)}`);
    text.style.color = "#6b7280";
    item.append(dot, text);
    legend.appendChild(item);
  });
  wrap.appendChild(legend);

  container.appendChild(wrap);
}

/* ---------------- 卡片 ---------------- */

function renderCards(container, cards) {
  container.innerHTML = "";
  for (const c of cards) {
    const node = el("div", `card${c.alert ? " alert" : ""}`);
    node.appendChild(el("div", "label", c.label));
    node.appendChild(el("div", "value", c.value));
    if (c.sub) node.appendChild(el("div", "sub", c.sub));
    container.appendChild(node);
  }
}

/* ---------------- 列表 ---------------- */

function renderList(container, items, renderItem) {
  container.innerHTML = "";
  if (!items.length) {
    container.appendChild(el("div", "empty", "暂无数据"));
    return;
  }
  const list = el("div", "list");
  items.forEach((item, i) => list.appendChild(renderItem(item, i)));
  container.appendChild(list);
}

function listItem({ rank, title, titleHref, meta, tag, tagClass }) {
  const node = el("div", "list-item");
  if (rank != null) node.appendChild(el("span", "rank", String(rank)));
  const titleEl = el("span", "title");
  if (titleHref) {
    const a = el("a", null, title);
    a.href = titleHref;
    a.target = "_blank";
    a.rel = "noreferrer";
    titleEl.appendChild(a);
  } else {
    titleEl.textContent = title;
  }
  node.appendChild(titleEl);
  if (meta) node.appendChild(el("span", "meta", meta));
  if (tag) node.appendChild(el("span", `tag ${tagClass ?? "mid"}`, tag));
  return node;
}

/* ---------------- 画面二：回答表现 ---------------- */

const rateColor = (rate) => (rate == null ? "#9aa4b2" : rate >= 1.5 ? "#2f9e44" : rate >= 0.8 ? "#5c9ded" : rate >= 0.4 ? "#e8a33d" : "#c92a2a");
const rateTag = (rate) => (rate == null ? null : rate >= 1.5 ? ["高", "high"] : rate < 0.4 ? ["低", "low"] : null);

function renderAnswers() {
  const { items, summary } = state.answers;

  renderCards($("#answer-cards"), [
    { label: "回答总数", value: fmt(summary.answerCount), sub: `累计阅读 ${fmt(summary.totalReads)}` },
    { label: "累计赞同", value: fmt(summary.totalUpvotes), sub: `收藏 ${fmt(summary.totalFavorites)}` },
    { label: "平均赞阅比", value: pctText(summary.avgUpvoteRate), sub: `每 1000 阅读约 ${(summary.avgUpvoteRate * 10).toFixed(1)} 个赞同` },
    { label: "中位阅读量", value: fmt(summary.medianReads), sub: "一半回答高于此值" },
    {
      label: "高阅读低转化",
      value: `${summary.lowEfficiency.length} 篇`,
      sub: "阅读高于中位但赞阅比低于均值",
      alert: summary.lowEfficiency.length > 0,
    },
  ]);

  hbarChart(
    $("#chart-rate-buckets"),
    summary.buckets.map((b) => ({
      label: b.label,
      value: b.count,
      display: `${b.count} 篇`,
      color: b.label.startsWith("≥") ? "#2f9e44" : b.label.startsWith("<") ? "#c92a2a" : "#5c9ded",
      tip: `${b.label}<br>${b.count} 篇回答`,
    })),
    { labelWidth: 150, rowHeight: 34 }
  );

  renderList($("#list-low-efficiency"), summary.lowEfficiency, (item) =>
    listItem({
      title: item.title,
      meta: `${fmt(item.reads)} 阅读 · 赞阅比 ${pctText(item.upvoteRate)}`,
      tag: "低效",
      tagClass: "low",
    })
  );

  const top = items.filter((i) => i.reads > 0).slice(0, 12);
  hbarChart(
    $("#chart-top-reads"),
    top.map((item) => ({
      label: item.title,
      value: item.reads,
      display: fmt(item.reads),
      color: rateColor(item.upvoteRate),
      tip:
        `<b>${truncate(item.title, 40)}</b><br>阅读 ${fmt(item.reads)}` +
        `<br>赞同 ${fmt(item.upvotes)}（${pctText(item.upvoteRate)}）` +
        `<br>收藏 ${fmt(item.favorites)}（${pctText(item.favoriteRate)}）`,
    })),
    { labelWidth: 400, rowHeight: 28 }
  );

  renderAnswerTable();
}

function renderAnswerTable() {
  const items = [...state.answers.items].sort((a, b) => (b[state.answerSort] ?? -1) - (a[state.answerSort] ?? -1));
  const tbody = $("#answer-table tbody");
  tbody.innerHTML = "";

  items.forEach((item) => {
    const tr = el("tr");
    const titleTd = el("td", "title-cell", item.title);
    tr.appendChild(titleTd);
    tr.appendChild(el("td", "num", fmt(item.reads)));
    tr.appendChild(el("td", "num", fmt(item.upvotes)));
    const rateTd = el("td", "num", pctText(item.upvoteRate));
    if (item.upvoteRate != null && item.upvoteRate < 0.4) rateTd.style.color = "#c92a2a";
    if (item.upvoteRate != null && item.upvoteRate >= 1.5) rateTd.style.color = "#2f9e44";
    tr.appendChild(rateTd);
    tr.appendChild(el("td", "num", pctText(item.favoriteRate)));
    tr.appendChild(el("td", "num", item.snapshotDate ?? "—"));
    tr.addEventListener("click", () => openDetail(item, tr));
    tbody.appendChild(tr);
  });
}

/* ---------------- 详情抽屉 ---------------- */

let drawer = null;

function ensureDrawer() {
  if (drawer) return drawer;
  drawer = el("aside", "drawer");
  drawer.innerHTML = '<button class="close" aria-label="关闭">×</button><div class="drawer-body"></div>';
  drawer.querySelector(".close").addEventListener("click", closeDrawer);
  document.body.appendChild(drawer);
  return drawer;
}

function closeDrawer() {
  drawer?.classList.remove("open");
  document.querySelectorAll("#answer-table tbody tr.selected").forEach((tr) => tr.classList.remove("selected"));
}

async function openDetail(item, tr) {
  ensureDrawer();
  document.querySelectorAll("#answer-table tbody tr.selected").forEach((row) => row.classList.remove("selected"));
  tr?.classList.add("selected");

  const body = drawer.querySelector(".drawer-body");
  body.innerHTML = `<h3>${escapeHtml(item.title)}</h3>
    <div class="meta-line">${item.publishedAt ? `发布于 ${item.publishedAt} · ` : ""}快照 ${item.snapCount} 期</div>
    <div class="empty">载入中…</div>`;
  drawer.classList.add("open");

  let detail = null;
  try {
    const res = await fetch(`/api/answer-detail?url=${encodeURIComponent(item.answerUrl)}`);
    detail = await res.json();
  } catch (err) {
    body.innerHTML = `<h3>${escapeHtml(item.title)}</h3><div class="empty">载入失败：${escapeHtml(err.message)}</div>`;
    return;
  }
  if (detail.error) {
    body.innerHTML = `<h3>${escapeHtml(item.title)}</h3><div class="empty">${escapeHtml(detail.error)}</div>`;
    return;
  }

  body.innerHTML = "";

  const head = el("div");
  head.innerHTML = `<h3>${escapeHtml(detail.title)}</h3>
    <div class="meta-line">${detail.publishedAt ? `发布于 ${detail.publishedAt} · ` : ""}共 ${detail.snapshots.length} 期快照</div>`;
  body.appendChild(head);

  const latest = detail.snapshots[detail.snapshots.length - 1];
  if (latest) {
    const dl = el("dl", "kv");
    const pairs = [
      ["阅读", fmt(latest.reads)],
      ["赞同", `${fmt(latest.upvotes)}（${pctText(pctOf(latest.upvotes, latest.reads))}）`],
      ["收藏", `${fmt(latest.favorites)}（${pctText(pctOf(latest.favorites, latest.reads))}）`],
      ["评论", fmt(latest.comments)],
      ["喜欢", fmt(latest.likes)],
      ["同题回答数", fmt(latest.totalAnswers)],
      ["排名", latest.rank == null ? "—" : `第 ${latest.rank}`],
    ];
    for (const [k, v] of pairs) {
      dl.appendChild(el("dt", null, k));
      dl.appendChild(el("dd", null, v));
    }
    body.appendChild(dl);
  }

  if (latest?.source && Object.keys(latest.source).length) {
    body.appendChild(el("h4", null, "最新一期流量来源"));
    const rows = Object.entries(latest.source)
      .map(([label, value]) => ({ label, value: Math.round(value * 100), display: `${Math.round(value * 100)}%` }))
      .sort((a, b) => b.value - a.value);
    const chart = el("div", "chart");
    body.appendChild(chart);
    hbarChart(chart, rows, { labelWidth: 160, rowHeight: 28 });
  }

  if (detail.snapshots.length > 1) {
    body.appendChild(el("h4", null, "快照历史"));
    const table = el("table", "data-table");
    table.innerHTML = `<thead><tr><th>日期</th><th class="num">阅读</th><th class="num">赞同</th><th class="num">收藏</th></tr></thead>`;
    const tbody = el("tbody");
    for (const s of detail.snapshots) {
      const row = el("tr");
      row.appendChild(el("td", null, s.date));
      row.appendChild(el("td", "num", fmt(s.reads)));
      row.appendChild(el("td", "num", fmt(s.upvotes)));
      row.appendChild(el("td", "num", fmt(s.favorites)));
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    body.appendChild(table);
  }

  if (detail.peers.length) {
    body.appendChild(el("h4", null, "同规模问题的回答表现"));
    renderListInto(body, detail.peers, (p) =>
      listItem({
        title: p.title ?? "（无标题）",
        meta: `${fmt(p.upvotes)} 赞同 · 同题 ${fmt(p.totalAnswers)} 答`,
      })
    );
  }
}

function renderListInto(parent, items, renderItem) {
  const wrap = el("div");
  parent.appendChild(wrap);
  renderList(wrap, items, renderItem);
}

const pctOf = (part, total) => (total > 0 ? (part / total) * 100 : null);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------------- 画面三：选题池 ---------------- */

const STATUS_LABEL = {
  candidate: "候选",
  selected: "已选中",
  drafted: "已起草",
  published: "已发布",
  dropped: "已弃选",
};

function renderPool() {
  const pool = state.pool;

  renderCards($("#pool-cards"), [
    { label: "问题池总数", value: fmt(pool.totals.questions), sub: "采集进去的全部问题" },
    { label: "候选待处理", value: fmt(pool.totals.candidates), sub: "还没选中、没起草" },
    {
      label: "从未被评估",
      value: fmt(pool.neverEvaluated),
      sub: "没进过任何一轮打分",
      alert: pool.neverEvaluated > pool.totals.candidates * 0.3,
    },
    {
      label: "已发布",
      value: fmt(pool.statusRows.find((r) => r.status === "published")?.c ?? 0),
      sub: "答过并已发布",
    },
    {
      label: "草稿",
      value: fmt(pool.draftStatus.reduce((s, r) => s + r.c, 0)),
      sub: "登记在册的稿子",
    },
  ]);

  donutChart(
    $("#chart-pool-status"),
    pool.statusRows.map((r) => ({ label: STATUS_LABEL[r.status] ?? r.status, value: r.c }))
  );

  donutChart(
    $("#chart-pool-source"),
    pool.sourceRows.map((r) => ({ label: r.source, value: r.c }))
  );

  stackedColumnChart(
    $("#chart-decisions"),
    pool.recentRuns.map((run) => ({
      label: run.run_date,
      // 跳过动辄上百条，混在一起会把入选/拒绝压成一条线，单独用文字标注
      note: `跳过 ${run.skipped}`,
      parts: [
        { key: "ranked", value: run.ranked },
        { key: "rejected", value: run.rejected },
      ],
    })),
    [
      { key: "ranked", label: "入选", color: "#2f9e44" },
      { key: "rejected", label: "拒绝", color: "#e8590c" },
    ]
  );

  renderList($("#list-rejects"), pool.rejectTop, (item, i) =>
    listItem({
      rank: i + 1,
      title: item.reason,
      meta: `${item.count} 次`,
      tag: item.sample && item.sample !== item.reason ? "例：" + truncate(item.sample, 18) : null,
    })
  );

  renderList($("#list-ranked-not-written"), pool.rankedNotWritten, (item) =>
    listItem({
      title: item.title,
      titleHref: `https://www.zhihu.com/question/${item.questionId}`,
      meta: `${item.runDate} 第 ${item.rank} 名 · ${item.score ?? "—"} 分`,
      tag: item.source ?? null,
    })
  );
}

/* ---------------- 画面四：互动关系 ---------------- */

function renderSocial() {
  const social = state.social;

  renderCards($("#social-cards"), [
    { label: "互动用户", value: fmt(social.totals.likers), sub: `累计点赞 ${fmt(social.totals.totalLikeCount)} 次` },
    {
      label: "深度互动",
      value: fmt((social.likeBuckets[3]?.count ?? 0) + (social.likeBuckets[4]?.count ?? 0)),
      sub: "赞过 6 次以上的人",
    },
    {
      label: "已回赞",
      value: fmt(social.totals.voted),
      sub: `覆盖率 ${((social.totals.voted / social.totals.likers) * 100).toFixed(1)}%`,
    },
    {
      label: "待回赞",
      value: fmt(social.pendingVoteTotal),
      sub: "赞过你但还没回应",
      alert: social.pendingVoteTotal > 0,
    },
  ]);

  hbarChart(
    $("#chart-tiers"),
    social.likeBuckets.map((b) => ({
      label: b.label,
      value: b.count,
      display: `${b.count} 人`,
      color: b.label.includes("10 次以上") ? "#2f9e44" : b.label.includes("6–10") ? "#5c9ded" : "#9fc3f0",
      tip: `${b.label}<br>${b.count} 人（占 ${((b.count / social.totals.likers) * 100).toFixed(1)}%）`,
    })),
    { labelWidth: 200, rowHeight: 34 }
  );

  $("#pending-hint").textContent =
    `赞过你但还没被回赞的人，共 ${fmt(social.pendingVoteTotal)} 人，按点赞次数排前 ${social.pendingVote.length} 个。`;

  // 回赞执行情况：按天汇总，只看最近 12 天有记录的日子
  const byDate = new Map();
  for (const e of social.eventRows) {
    byDate.set(e.event_date, (byDate.get(e.event_date) ?? 0) + e.c);
  }
  const eventRows = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12)
    .map(([date, count]) => ({
      label: date.slice(5), // 只留 MM-DD，年份对看板没意义
      value: count,
      display: `${count} 次`,
      color: "#5c9ded",
      tip: `${date}<br>回赞 ${count} 次`,
    }));
  hbarChart($("#chart-events"), eventRows, { labelWidth: 70, rowHeight: 24, fontSize: 11 });

  renderList($("#list-pending-vote"), social.pendingVote, (item, i) =>
    listItem({
      rank: i + 1,
      title: item.name,
      titleHref: `https://www.zhihu.com/people/${item.token}`,
      meta: `赞过 ${item.likeCount} 次`,
    })
  );

  const tbody = $("#liker-table tbody");
  tbody.innerHTML = "";
  for (const l of social.topLikers) {
    const tr = el("tr");
    const nameTd = el("td", null, l.name);
    if (l.tier) {
      const badge = el("span", "tag high", l.tier);
      badge.style.marginLeft = "6px";
      nameTd.appendChild(badge);
    }
    tr.appendChild(nameTd);
    tr.appendChild(el("td", "num", fmt(l.likeCount)));
    tr.appendChild(el("td", "num", fmt(l.followers)));
    tr.appendChild(el("td", "num", fmt(l.voteups)));
    tr.appendChild(el("td", null, l.lastSeen ?? "—"));
    tbody.appendChild(tr);
  }
}

/* ---------------- 数据加载与 Tab ---------------- */

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} 返回 ${res.status}`);
  return res.json();
}

function renderFreshness() {
  const meta = state.meta;
  const node = $("#freshness");
  if (!meta) {
    node.textContent = "数据载入失败";
    return;
  }
  const today = new Date().toLocaleDateString("sv-SE");
  const days = meta.latest.snapshot ? daysBetween(meta.latest.snapshot, today) : null;
  const stale = days != null && days >= 3;
  node.innerHTML =
    `快照 ${meta.latest.snapshot ?? "—"}` +
    (days == null ? "" : ` <span class="${stale ? "stale" : ""}">（${days === 0 ? "今天" : `${days} 天前`}）</span>`) +
    ` · 问题 ${fmt(meta.counts.questions)} · 回答 ${fmt(meta.counts.answers)}` +
    ` · 采集日 ${meta.snapshotDays.length} 个`;
}

function daysBetween(from, to) {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

async function loadAll() {
  $("#refresh").disabled = true;
  try {
    const [meta, answers, pool, social] = await Promise.all([
      fetchJson("/api/meta"),
      fetchJson("/api/answers"),
      fetchJson("/api/pool"),
      fetchJson("/api/social"),
    ]);
    state.meta = meta;
    state.answers = answers;
    state.pool = pool;
    state.social = social;
    renderFreshness();
    renderAnswers();
    renderPool();
    renderSocial();
  } catch (err) {
    $("#freshness").textContent = `载入失败：${err.message}`;
  } finally {
    $("#refresh").disabled = false;
  }
}

function switchView(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  // 非激活的 Tab 宽度为 0，图表画不准；切回来后按真实宽度重绘一次
  redrawView(name);
}

function redrawView(name) {
  if (!state.answers) return;
  if (name === "answers") renderAnswers();
  if (name === "pool") renderPool();
  if (name === "social") renderSocial();
}

$("#tabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) switchView(tab.dataset.view);
});

// 支持直接打开 #pool / #social，也方便截图与分享定位
window.addEventListener("hashchange", () => {
  const name = location.hash.slice(1);
  if (["answers", "pool", "social"].includes(name)) switchView(name);
});

$("#answer-sorts").addEventListener("click", (e) => {
  const btn = e.target.closest(".sort");
  if (!btn) return;
  state.answerSort = btn.dataset.sort;
  document.querySelectorAll("#answer-sorts .sort").forEach((b) => b.classList.toggle("active", b === btn));
  renderAnswerTable();
});

$("#refresh").addEventListener("click", loadAll);

const initialView = location.hash.slice(1);
if (["answers", "pool", "social"].includes(initialView)) switchView(initialView);
loadAll();
