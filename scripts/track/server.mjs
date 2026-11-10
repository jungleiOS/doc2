#!/usr/bin/env node
// 本地写回服务：供 Chrome 扩展「＋追踪答主」按钮把追踪答主写入 data/tracked-authors.jsonl。
// 用法：node scripts/track/server.mjs   （监听 127.0.0.1:43121，仅接受本机请求）
import http from "node:http";
import fs from "node:fs";
import { trackAuthorsFile } from "./paths.mjs";

const PORT = 43121;
const HOST = "127.0.0.1";

// 读取名单，返回 urlToken -> 行对象 的有序映射
function loadAuthors() {
  const map = new Map();
  if (!fs.existsSync(trackAuthorsFile)) return map;
  const lines = fs.readFileSync(trackAuthorsFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.urlToken) map.set(obj.urlToken, obj);
    } catch {
      // 跳过坏行，不丢整份名单
    }
  }
  return map;
}

// 全量回写（名单行数小，简单可靠；同 urlToken 以内存中的最新版为准）
function saveAuthors(map) {
  const content = [...map.values()].map((o) => JSON.stringify(o)).join("\n") + "\n";
  fs.writeFileSync(trackAuthorsFile, content, "utf-8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// 内容脚本直连的 CORS 预检（MV3 内容脚本受页面 CSP/CORS 约束，OPTIONS 必须放行）
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    // 允许浏览器扩展跨域调用（内容脚本直连 / background 转发，Origin 为 chrome-extension:// 或 https://www.zhihu.com）
    ...corsHeaders(),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  // CORS 预检：直接放行，让内容脚本的直连 fetch 可用
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }
  try {
    if (req.method === "POST" && url.pathname === "/add") {
      const body = JSON.parse(await readBody(req) || "{}");
      const { urlToken } = body;
      let { name } = body;
      const sourceAnswerUrl = body.sourceAnswerUrl || "";
      if (!urlToken) {
        send(res, 400, { ok: false, error: "缺少必填字段：urlToken" });
        return;
      }
      if (!name) name = urlToken; // 名字兜底，展示问题不阻断写入
      const authors = loadAuthors();
      const existing = authors.get(urlToken);
      const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（本地时区）
      if (existing) {
        // 幂等更新：只用非空新值覆盖，避免空字段清掉已有人工维护的昵称/备注
        if (name) existing.name = name;
        if (body.headline) existing.headline = body.headline;
        if (body.note) existing.note = body.note;
        if (Array.isArray(body.tags) && body.tags.length) existing.tags = body.tags;
        saveAuthors(authors);
        send(res, 200, { ok: true, updated: true });
      } else {
        authors.set(urlToken, {
          urlToken,
          name,
          headline: body.headline ?? "",
          sourceAnswerUrl,
          note: body.note ?? "",
          tags: Array.isArray(body.tags) ? body.tags : [],
          addedAt: today,
        });
        saveAuthors(authors);
        send(res, 200, { ok: true, updated: false });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/has") {
      // 批量查询：body 为 token 数组，返回已追踪 token 集合（扩展给整页按钮打标记用）
      const body = JSON.parse(await readBody(req) || "[]");
      const tokens = Array.isArray(body) ? body : [];
      const authors = loadAuthors();
      const tracked = tokens.filter((t) => authors.has(t));
      send(res, 200, { ok: true, tracked });
      return;
    }

    if (req.method === "GET" && url.pathname === "/has") {
      const token = url.searchParams.get("token") || "";
      const authors = loadAuthors();
      send(res, 200, { ok: true, tracked: authors.has(token) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/remove") {
      const body = JSON.parse(await readBody(req) || "{}");
      const { urlToken } = body;
      if (!urlToken) {
        send(res, 400, { ok: false, error: "缺少必填字段：urlToken" });
        return;
      }
      const authors = loadAuthors();
      const existed = authors.delete(urlToken);
      if (existed) saveAuthors(authors);
      send(res, 200, { ok: true, removed: existed });
      return;
    }

    if (req.method === "GET" && url.pathname === "/list") {
      send(res, 200, { ok: true, authors: [...loadAuthors().values()] });
      return;
    }

    send(res, 404, { ok: false, error: "未知路径" });
  } catch (err) {
    send(res, 500, { ok: false, error: String(err.message || err) });
  }
});

server.on("error", (err) => {
  // 开机自启场景：已有一个实例在跑时安静退出（exit 0），不让 launchd 反复重启
  if (err.code === "EADDRINUSE") {
    console.log("端口 43121 已被占用，说明服务已在运行，本实例退出。");
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  const count = loadAuthors().size;
  console.log(`选题追踪服务已启动：http://${HOST}:${PORT}（当前追踪 ${count} 人）`);
  console.log("接口：POST /add、POST /has（批量）、GET /has?token=、GET /list");
});
