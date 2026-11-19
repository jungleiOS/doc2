// 看板的数据查询层：只读 data/zhihu.db，产出前端直接可用的 JSON 结构。
// 设计原则：所有图表要用的聚合都在这里算完，前端只负责画，不再做业务计算。
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dbPath = path.join(repoRoot, "data/zhihu.db");

/** 每次请求都开只读连接：数据量小，省去连接池与失效管理 */
function withDb(fn) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

const pct = (part, total) => (total > 0 ? Number(((part / total) * 100).toFixed(2)) : null);

/** 数据新鲜度：让看板自己交代「数据是不是旧的」 */
export function getMeta() {
  return withDb((db) => {
    const one = (sql) => db.prepare(sql).get();
    const snapshotDays = db
      .prepare("SELECT DISTINCT snapshot_date AS d FROM snapshots ORDER BY d")
      .all()
      .map((r) => r.d);

    return {
      generatedAt: new Date().toISOString(),
      counts: {
        questions: one("SELECT COUNT(*) AS c FROM questions").c,
        drafts: one("SELECT COUNT(*) AS c FROM drafts").c,
        answers: one("SELECT COUNT(*) AS c FROM answers").c,
        snapshots: one("SELECT COUNT(*) AS c FROM snapshots").c,
        likers: one("SELECT COUNT(*) AS c FROM likers").c,
        decisions: one("SELECT COUNT(*) AS c FROM question_decisions").c,
      },
      latest: {
        snapshot: snapshotDays[snapshotDays.length - 1] ?? null,
        question: one("SELECT MAX(first_seen) AS d FROM questions").d,
        decision: one("SELECT MAX(run_date) AS d FROM question_decisions").d,
        liker: one("SELECT MAX(event_date) AS d FROM liker_events").d,
      },
      snapshotDays,
    };
  });
}

/**
 * 画面二：回答表现
 * 每篇回答取最新一期快照，算赞阅比、收藏率；同时给出汇总分布用于图表。
 */
export function getAnswers() {
  return withDb((db) => {
    const rows = db
      .prepare(
        `SELECT a.answer_url, a.question_id, a.question_title, a.published_at,
                s.snapshot_date, s.reads, s.upvotes, s.favorites, s.comments, s.likes,
                s.rank, s.total_answers, s.source_json,
                (SELECT COUNT(*) FROM snapshots x WHERE x.answer_url = a.answer_url) AS snap_count,
                (SELECT MIN(x.reads) FROM snapshots x WHERE x.answer_url = a.answer_url) AS first_reads,
                (SELECT MIN(x.upvotes) FROM snapshots x WHERE x.answer_url = a.answer_url) AS first_upvotes
         FROM answers a
         LEFT JOIN v_latest_snapshot s ON s.answer_url = a.answer_url
         ORDER BY COALESCE(s.reads, 0) DESC`
      )
      .all();

    const items = rows.map((r) => ({
      answerUrl: r.answer_url,
      questionId: r.question_id,
      title: r.question_title ?? "（无标题）",
      publishedAt: r.published_at,
      snapshotDate: r.snapshot_date,
      snapCount: r.snap_count,
      reads: r.reads ?? 0,
      upvotes: r.upvotes ?? 0,
      favorites: r.favorites ?? 0,
      comments: r.comments ?? 0,
      likes: r.likes ?? 0,
      rank: r.rank,
      totalAnswers: r.total_answers,
      upvoteRate: pct(r.upvotes ?? 0, r.reads ?? 0),
      favoriteRate: pct(r.favorites ?? 0, r.reads ?? 0),
      readDelta: r.reads != null && r.first_reads != null ? r.reads - r.first_reads : null,
      upvoteDelta: r.upvotes != null && r.first_upvotes != null ? r.upvotes - r.first_upvotes : null,
      source: r.source_json ? JSON.parse(r.source_json) : null,
    }));

    const withReads = items.filter((i) => i.reads > 0);
    const totalReads = withReads.reduce((s, i) => s + i.reads, 0);
    const totalUpvotes = items.reduce((s, i) => s + i.upvotes, 0);
    const totalFavorites = items.reduce((s, i) => s + i.favorites, 0);

    // 赞阅比分档：直接看出「高阅读低赞」和「低阅读高赞」两批完全不同的稿子
    const buckets = [
      { label: "≥1.5%（高转化）", min: 1.5, max: Infinity },
      { label: "0.8–1.5%", min: 0.8, max: 1.5 },
      { label: "0.4–0.8%", min: 0.4, max: 0.8 },
      { label: "<0.4%（低转化）", min: 0, max: 0.4 },
    ].map((b) => ({
      label: b.label,
      count: withReads.filter((i) => i.upvoteRate >= b.min && i.upvoteRate < b.max).length,
    }));

    const sortedByRate = [...withReads].sort((a, b) => b.upvoteRate - a.upvoteRate);
    // 阅读量太小的样本赞阅比会虚高（如 54 阅读 10 赞 = 18.5%），排名前先设门槛
    const MIN_READS_FOR_RATE = 300;
    const rateRankable = sortedByRate.filter((i) => i.reads >= MIN_READS_FOR_RATE);

    return {
      items,
      summary: {
        answerCount: items.length,
        totalReads,
        totalUpvotes,
        totalFavorites,
        avgUpvoteRate: pct(totalUpvotes, totalReads),
        medianReads: median(withReads.map((i) => i.reads)),
        topByReads: items.slice(0, 5).map((i) => ({ title: i.title, reads: i.reads, upvoteRate: i.upvoteRate })),
        topByRate: rateRankable.slice(0, 5).map((i) => ({ title: i.title, reads: i.reads, upvoteRate: i.upvoteRate })),
        rateRankableCount: rateRankable.length,
        buckets,
        // 高阅读但转化差：最值得复盘的稿子
        lowEfficiency: withReads
          .filter((i) => i.reads >= median(withReads.map((x) => x.reads)) && i.upvoteRate < pct(totalUpvotes, totalReads))
          .sort((a, b) => b.reads - a.reads)
          .slice(0, 5)
          .map((i) => ({ title: i.title, reads: i.reads, upvoteRate: i.upvoteRate })),
      },
    };
  });
}

/** 单篇回答详情：全部快照 + 流量来源 */
export function getAnswerDetail(answerUrl) {
  return withDb((db) => {
    const meta = db.prepare("SELECT * FROM answers WHERE answer_url = ?").get(answerUrl);
    if (!meta) return null;
    const snaps = db
      .prepare(
        `SELECT snapshot_date, reads, upvotes, favorites, comments, likes, rank, total_answers, source_json
         FROM snapshots WHERE answer_url = ? ORDER BY snapshot_date`
      )
      .all(answerUrl)
      .map((s) => ({
        date: s.snapshot_date,
        reads: s.reads,
        upvotes: s.upvotes,
        favorites: s.favorites,
        comments: s.comments,
        likes: s.likes,
        rank: s.rank,
        totalAnswers: s.total_answers,
        source: s.source_json ? JSON.parse(s.source_json) : null,
      }));

    // 同题竞争：最近一期里回答数最接近的 5 篇，用来看「同样池子别人的赞数」
    const latest = snaps[snaps.length - 1];
    let peers = [];
    if (latest?.totalAnswers != null) {
      peers = db
        .prepare(
          `SELECT a.question_title AS title, s.upvotes, s.total_answers, s.rank
           FROM v_latest_snapshot s JOIN answers a USING (answer_url)
           WHERE s.total_answers IS NOT NULL AND s.answer_url <> ?
           ORDER BY ABS(s.total_answers - ?) LIMIT 5`
        )
        .all(answerUrl, latest.totalAnswers)
        .map((p) => ({ title: p.title, upvotes: p.upvotes, totalAnswers: p.total_answers, rank: p.rank }));
    }

    return {
      answerUrl,
      title: meta.question_title ?? "（无标题）",
      questionId: meta.question_id,
      publishedAt: meta.published_at,
      snapshots: snaps,
      peers,
    };
  });
}

/** 画面三：选题池 */
export function getPool() {
  return withDb((db) => {
    const statusRows = db
      .prepare("SELECT status, COUNT(*) AS c FROM questions GROUP BY status ORDER BY c DESC")
      .all();

    const sourceRows = db
      .prepare(
        `SELECT COALESCE(source, '未知') AS source, COUNT(*) AS c
         FROM questions GROUP BY source ORDER BY c DESC`
      )
      .all();

    const decisionRows = db
      .prepare(
        `SELECT decision, COUNT(*) AS c FROM question_decisions GROUP BY decision ORDER BY c DESC`
      )
      .all();

    // 拒绝原因去掉具体数字后归并，否则每个数字都是一行
    const rejectRows = db
      .prepare(
        `SELECT reason FROM question_decisions
         WHERE decision = 'rejected' AND reason IS NOT NULL`
      )
      .all()
      .map((r) => ({ key: normalizeReason(r.reason), sample: r.reason }));

    const rejectGrouped = rejectRows.reduce((acc, r) => {
      if (!acc[r.key]) acc[r.key] = { reason: r.key, count: 0, sample: r.sample };
      acc[r.key].count += 1;
      return acc;
    }, {});

    const rejectTop = Object.values(rejectGrouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 从没被任何一轮评过的候选：池子里最大的盲区
    const neverEvaluated = db
      .prepare(
        `SELECT COUNT(*) AS c FROM questions q
         WHERE q.status = 'candidate'
           AND NOT EXISTS (SELECT 1 FROM question_decisions d WHERE d.question_id = q.question_id)`
      )
      .get().c;

    const recentRuns = db
      .prepare(
        `SELECT run_date,
                SUM(decision = 'ranked') AS ranked,
                SUM(decision = 'rejected') AS rejected,
                SUM(decision = 'skipped') AS skipped,
                COUNT(*) AS total
         FROM question_decisions GROUP BY run_date ORDER BY run_date DESC LIMIT 10`
      )
      .all();

    // 入选但还没写的题：最该优先处理的清单
    const rankedNotWritten = db
      .prepare(
        `SELECT d.question_id, d.title, d.score, d.run_date, d.rank,
                q.status, q.source
         FROM question_decisions d
         LEFT JOIN questions q ON q.question_id = d.question_id
         WHERE d.decision = 'ranked'
           AND d.run_date = (SELECT MAX(run_date) FROM question_decisions)
           AND COALESCE(q.status, 'candidate') = 'candidate'
         ORDER BY d.rank`
      )
      .all();

    const draftStatus = db
      .prepare(
        `SELECT COALESCE(status, '未标注') AS status, COUNT(*) AS c
         FROM drafts GROUP BY status ORDER BY c DESC`
      )
      .all();

    return {
      statusRows,
      sourceRows,
      decisionRows,
      rejectTop,
      neverEvaluated,
      recentRuns,
      rankedNotWritten: rankedNotWritten.map((r) => ({
        questionId: r.question_id,
        title: cleanTitle(r.title) ?? "（无标题）",
        score: r.score,
        runDate: r.run_date,
        rank: r.rank,
        source: r.source,
      })),
      draftStatus,
      totals: {
        questions: statusRows.reduce((s, r) => s + r.c, 0),
        candidates: statusRows.find((r) => r.status === "candidate")?.c ?? 0,
      },
    };
  });
}

/** 把「回答数 516 > 70」「浏览÷回答 34 < 50」这类原因去掉数字，便于归类 */
function normalizeReason(reason) {
  return reason
    .replace(/\d+(\.\d+)?/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

/** scout 会在标题后拼「（本轮 90 分入选第2：D3×O5×M3」这类打分备注，画到看板上要先去掉 */
function cleanTitle(title) {
  if (!title) return title;
  return title.replace(/（本轮.*$/, "").trim() || title;
}

/** 画面四：互动关系 */
export function getSocial() {
  return withDb((db) => {
    const tierRows = db
      .prepare(
        `SELECT COALESCE(tier, '未分层') AS tier, COUNT(*) AS c
         FROM likers GROUP BY tier ORDER BY c DESC`
      )
      .all();

    const eventRows = db
      .prepare(
        `SELECT event_date, action, COUNT(*) AS c
         FROM liker_events GROUP BY event_date, action ORDER BY event_date DESC LIMIT 30`
      )
      .all();

    // 铁粉：赞过多次的人，按 like_count 排
    const topLikers = db
      .prepare(
        `SELECT token, name, tier, like_count, like_days_json, followers, voteups, answers, headline, last_seen
         FROM likers
         WHERE like_count IS NOT NULL AND like_count > 0
         ORDER BY like_count DESC, voteups DESC
         LIMIT 30`
      )
      .all()
      .map((l) => ({
        token: l.token,
        name: l.name ?? l.token,
        tier: l.tier,
        likeCount: l.like_count,
        likeDays: l.like_days_json ? safeJson(l.like_days_json) : null,
        followers: l.followers,
        voteups: l.voteups,
        answers: l.answers,
        headline: l.headline,
        lastSeen: l.last_seen,
      }));

    // 已回赞过的人，用于算「回赞覆盖率」
    const voted = new Set(
      db
        .prepare("SELECT DISTINCT token FROM liker_events WHERE action = 'voted'")
        .all()
        .map((r) => r.token)
    );
    const thanked = new Set(
      db
        .prepare("SELECT DISTINCT token FROM liker_events WHERE action = 'thanked'")
        .all()
        .map((r) => r.token)
    );

    const likeCounts = db
      .prepare("SELECT like_count FROM likers WHERE like_count > 0")
      .all()
      .map((r) => r.like_count);

    // 点赞次数分布：真正说明「关系深度」的不是分层标签，而是赞过几次
    const likeBuckets = [
      { label: "赞过 1 次", min: 1, max: 1 },
      { label: "赞过 2–3 次", min: 2, max: 3 },
      { label: "赞过 4–5 次", min: 4, max: 5 },
      { label: "赞过 6–10 次", min: 6, max: 10 },
      { label: "赞过 10 次以上", min: 11, max: Infinity },
    ].map((b) => ({
      label: b.label,
      count: likeCounts.filter((n) => n >= b.min && n <= b.max).length,
    }));

    // 赞过但还没回赞的人：待处理清单
    const pendingAll = db
      .prepare(
        `SELECT token, name, tier, like_count, voteups
         FROM likers
         WHERE like_count > 0
         ORDER BY like_count DESC`
      )
      .all()
      .filter((l) => !voted.has(l.token));

    const pendingVote = pendingAll.slice(0, 10).map((l) => ({
      token: l.token,
      name: l.name ?? l.token,
      likeCount: l.like_count,
      voteups: l.voteups,
    }));

    return {
      tierRows,
      eventRows,
      topLikers,
      pendingVote,
      pendingVoteTotal: pendingAll.length,
      likeBuckets,
      totals: {
        likers: tierRows.reduce((s, r) => s + r.c, 0),
        withLikes: likeCounts.length,
        voted: voted.size,
        thanked: thanked.size,
        totalLikeCount: likeCounts.reduce((s, n) => s + n, 0),
      },
    };
  });
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function median(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
