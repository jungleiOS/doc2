# -*- coding: utf-8 -*-
"""用8月打卡数据核算白班及加班：跨度取整0.5h，白班封顶12h，超出算加班。
双卡=正常；单卡/空卡=不规范，留白待人工处理。"""
import xlrd, math, re, json

BASE = "/Users/jiangjun/Documents/Kimi/Workspaces/zhihu/考勤核算"

def tomin(v):
    m = re.match(r"^(\s*)(\d{1,2}):(\d{2})(\s*)$", str(v))
    if not m:
        return None
    h, mi = int(m.group(2)), int(m.group(3))
    if h > 24 or mi > 59:
        return None
    return h * 60 + mi

def round05(hours):
    return math.floor(hours * 2 + 0.5) / 2.0

# 读取8月全部考勤卡
wb = xlrd.open_workbook(f"{BASE}/08汇总表.xls")
people = {}   # name -> {day: {punches:[...], span, rounded, bai, jia, status}}
for sn in wb.sheet_names():
    if sn in ("汇总表", "排班信息", "刷卡记录", "异常统计", "工时统计"):
        continue
    s = wb.sheet_by_name(sn)
    if str(s.cell_value(0, 0)).replace(" ", "") != "考勤卡表":
        continue
    for base in (0, 15, 30):
        name = str(s.cell_value(2, base + 9)).strip()
        if not name:
            continue
        days = {}
        for r in range(11, 42):
            dayno = r - 10  # 1..31
            times = []
            for c in range(base + 1, base + 14):
                t = tomin(s.cell_value(r, c))
                if t is not None:
                    times.append(t)
            times = sorted(set(times))
            if len(times) >= 2:
                span = (times[-1] - times[0]) / 60.0
                if span <= 0 or span > 18:
                    status = "异常"
                    rounded = bai = jia = None
                else:
                    status = "正常"
                    rounded = round05(span)
                    bai = min(rounded, 12.0)
                    jia = max(rounded - 12.0, 0.0)
            elif len(times) == 1:
                status, span, rounded, bai, jia = "单卡", None, None, None, None
            else:
                status, span, rounded, bai, jia = "空卡", None, None, None, None
            days[dayno] = {
                "times": ["%02d:%02d" % divmod(t, 60) for t in times],
                "span": span, "rounded": rounded,
                "bai": bai, "jia": jia, "status": status,
            }
        people[name] = days

# 汇总
summary = {}
for name, days in people.items():
    n = sum(1 for d in days.values() if d["status"] == "正常")
    bai = sum(d["bai"] for d in days.values() if d["bai"] is not None)
    jia = sum(d["jia"] for d in days.values() if d["jia"] is not None)
    summary[name] = {"days": n, "bai": round(bai, 1), "jia": round(jia, 1)}

# 顺序：7月统计表原顺序 + 8月新人
wb7 = xlrd.open_workbook(f"{BASE}/07汇总表.xls")
s7 = wb7.sheet_by_name("白班及加班统计")
order7 = []
for r in range(2, s7.nrows):
    for c in (0, 6):
        v = str(s7.cell_value(r, c)).strip()
        if v:
            order7.append(v)
names8 = list(people.keys())
newcomers = [n for n in names8 if n not in order7]
final_order = [n for n in order7 if n in names8] + newcomers

with open(f"{BASE}/august_result.json", "w", encoding="utf-8") as f:
    json.dump({"people": people, "summary": summary, "order": final_order},
              f, ensure_ascii=False, indent=1)

print("人数:", len(people), " 顺序人数:", len(final_order), " 新人:", newcomers)
tot_bad = {}
for name, days in people.items():
    c = {}
    for d in days.values():
        c[d["status"]] = c.get(d["status"], 0) + 1
    tot_bad[name] = c
nbad = sum(v.get("单卡", 0) + v.get("空卡", 0) + v.get("异常", 0) for v in tot_bad.values())
print("不规范天数合计:", nbad)
for name in final_order[:6]:
    sm = summary[name]
    print(f"  {name}: 天数={sm['days']} 白班={sm['bai']} 加班={sm['jia']} 合计={round(sm['bai']+sm['jia'],1)}")
