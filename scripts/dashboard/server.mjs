// 知乎内容工作台看板：本地只读服务。
// 用法：node scripts/dashboard/server.mjs [--port 7788]
// 只读 data/zhihu.db，不改任何数据；前端是纯静态文件，零外部依赖、可离线使用。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getMeta, getAnswers, getAnswerDetail, getPool, getSocial } from "./queries.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const dbPath = path.join(__dirname, "../../data/zhihu.db");

const portArg = process.argv.indexOf("--port");
const PORT = portArg >= 0 ? Number(process.argv[portArg + 1]) : Number(process.env.PORT ?? 7788);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    sendJson(res, { error: "not found" }, 404);
    return;
  }
  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(filePath)] ?? "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

/** 统一包一层：出错时返回 JSON 错误而不是让进程崩掉 */
function handle(fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`[dashboard] ${err.message}`);
    return { error: err.message };
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.pathname;

  if (route.startsWith("/api/")) {
    if (route === "/api/meta") return sendJson(res, handle(getMeta));
    if (route === "/api/answers") return sendJson(res, handle(getAnswers));
    if (route === "/api/pool") return sendJson(res, handle(getPool));
    if (route === "/api/social") return sendJson(res, handle(getSocial));
    if (route === "/api/answer-detail") {
      const target = url.searchParams.get("url");
      if (!target) return sendJson(res, { error: "缺少 url 参数" }, 400);
      const detail = handle(() => getAnswerDetail(target));
      return sendJson(res, detail ?? { error: "找不到该回答" }, detail ? 200 : 404);
    }
    return sendJson(res, { error: "unknown api" }, 404);
  }

  if (route === "/" || route === "/index.html") return sendFile(res, path.join(publicDir, "index.html"));
  // 静态文件限定在 public 目录内，防止路径穿越
  const safe = path.normalize(route).replace(/^(\.\.[/\\])+/, "");
  return sendFile(res, path.join(publicDir, safe));
});

if (!fs.existsSync(dbPath)) {
  console.error(`找不到数据库：${dbPath}\n先跑 node scripts/db/sync.mjs 生成。`);
  process.exit(1);
}

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`看板已启动：${url}`);
  console.log("按 Ctrl+C 停止");

  // --open 时自动拉起浏览器，省掉手动点链接
  if (process.argv.includes("--open")) {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    try {
      execFileSync(cmd, [url], { stdio: "ignore" });
    } catch {
      console.log("自动打开浏览器失败，请手动访问上面的地址");
    }
  }
});
