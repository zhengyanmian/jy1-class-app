"""演示数据种子脚本：向线上灌入一套可展示的班级数据。
用法：python deploy/seed.py [--base http://1.14.124.213:39500]
幂等性：默认检查到学号 01 的学生已存在则跳过学生创建，其余数据追加。
"""
import json
import sys
import urllib.request
from datetime import date

BASE = "http://1.14.124.213:39500"
ADMIN = {"username": "admin", "password": "admin123"}

TODAY = date.today().isoformat()

STUDENTS = [
    # (学号, 姓名, 性别, 生日, 住宿)
    ("01", "陈梓轩", "男", "2010-05-12", "住校"),
    ("02", "林雨桐", "女", "2009-08-21", "走读"),
    ("03", "王浩然", "男", "2010-11-27", "住校"),   # 今天生日
    ("04", "苏芷晴", "女", "2010-03-08", "住校"),
    ("05", "李承泽", "男", "2009-07-19", "走读"),
    ("06", "黄晓萌", "女", "2010-12-03", "住校"),
    ("07", "张一鸣", "男", "2009-09-30", "走读"),
    ("08", "刘欣妍", "女", "2010-02-14", "住校"),
    ("09", "赵子墨", "男", "2010-06-06", "住校"),
    ("10", "孙语汐", "女", "2009-10-25", "走读"),
    ("11", "周峻熙", "男", "2010-01-23", "住校"),
    ("12", "吴思涵", "女", "2010-04-17", "走读"),
]

COURSES = {  # (day 1-5, period 1-8): 课程名(教师/教室)
    (1,1):("语文","王老师","A301"), (1,2):("数学","李老师","A301"),
    (1,3):("英语","陈老师","A301"), (1,4):("物理","赵老师","实验室1"),
    (1,5):("体育","刘老师","操场"), (1,6):("自习","","A301"),
    (2,1):("数学","李老师","A301"), (2,2):("数学","李老师","A301"),
    (2,3):("化学","孙老师","实验室2"), (2,4):("语文","王老师","A301"),
    (2,5):("英语","陈老师","A301"), (2,6):("班会","班主任","A301"),
    (3,1):("英语","陈老师","A301"), (3,2):("物理","赵老师","实验室1"),
    (3,3):("语文","王老师","A301"), (3,4):("生物","周老师","实验室3"),
    (3,5):("数学","李老师","A301"), (3,6):("自习","","A301"),
    (4,1):("物理","赵老师","实验室1"), (4,2):("化学","孙老师","实验室2"),
    (4,3):("数学","李老师","A301"), (4,4):("英语","陈老师","A301"),
    (4,5):("语文","王老师","A301"), (4,6):("体育","刘老师","操场"),
    (5,1):("语文","王老师","A301"), (5,2):("英语","陈老师","A301"),
    (5,3):("生物","周老师","实验室3"), (5,4):("数学","李老师","A301"),
    (5,5):("化学","孙老师","实验室2"), (5,6):("自习","","A301"),
}

HOMEWORK = [
    ("数学练习册P42-P43", "数学", "完成练习册第42至43页全部习题，要求写出过程。", 2),
    ("英语 Unit 5 单词抄写", "英语", "Unit5 单词表每个单词抄写3遍并背诵，明天早读听写。", 1),
    ("《劝学》全文背诵", "语文", "背诵《劝学》全文，家长签字确认。", 3),
    ("物理实验报告：测量重力加速度", "物理", "按实验报告模板完成数据处理与误差分析，周五交。", 0),
]

CONDUCT = [
    ("01", 2, "拾金不昧，上交钱包"),
    ("03", 1, "课堂积极回答问题"),
    ("03", 2, "月考成绩年级进步50名"),
    ("05", -2, "早读迟到"),
    ("07", -1, "作业缺交"),
    ("08", 1, "主动帮忙布置板报"),
    ("02", 1, "值日认真负责"),
    ("10", 2, "运动会训练刻苦"),
    ("11", -1, "晚自习讲话"),
    ("04", 1, "帮助同学讲题"),
]

NOTICES = [
    ("校运动会报名开始", "本周五前在各项目组长处报名，项目：100米、800米、跳远、接力赛。每人限报两项。"),
    ("期中考试安排", "下周三至周四进行期中考试，考场安排见教室后墙公示，请带好学生证。"),
    ("晚自习时间调整", "自下周起晚自习提前至18:30开始，走读生离校时间为21:00。"),
]

PROJECTS = [
    ("运动会开幕式方阵", "参加校运动会开幕式方阵训练，每周二四放学后训练40分钟。", 10, "open"),
    ("班级文化墙设计", "负责后墙文化栏的排版设计与绘制，有美术特长的优先。", 4, "open"),
    ("研学旅行路线调研", "分组调研两条研学路线并做汇报，已截止。", 6, "closed"),
]

GROUPS = [
    ("第一组", ["01", "05", "09", "03"]),
    ("第二组", ["02", "04", "08", "06"]),
    ("第三组", ["07", "10", "11", "12"]),
]

FUND_RECORDS = [
    ("income", 600, "班费收缴", "每人50元"),
    ("expense", 260, "班服采购", "45套定制T恤"),
    ("expense", 45, "清洁用品", "拖把、垃圾袋等"),
]

FORUM = [
    ("数学第3题有人会吗？", "练习册P42第3题，第二种解法怎么列式子？", ["用辅助线画平行就行", "我用的向量法，也做出来了"]),
    ("运动会加油！", "周三100米预赛，来操场给我们加油", ["必到！", "带喇叭去"]),
    ("求语文背诵技巧", "《劝学》太长了背不下来，有什么方法吗", ["按段落理解意思再背", "睡前读三遍，早上再过一遍"]),
]

REPORTS_TODAY = [  # (学号, kind, address)
    ("01", "boarder", ""), ("03", "boarder", ""), ("04", "boarder", ""),
    ("06", "boarder", ""), ("08", "boarder", ""), ("09", "boarder", ""),
    ("02", "address", "幸福家园小区"), ("10", "address", "文化路12号"),
]


def req(method, path, body=None, token=None):
    r = urllib.request.Request(BASE + path, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(r, data) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return {"__error": json.loads(e.read()).get("error"), "__status": e.code}
        except Exception:
            return {"__error": f"HTTP {e.code}", "__status": e.code}


def ok(r, what):
    if r.get("__error"):
        print(f"  [跳过] {what}: {r['__error']}")
        return False
    return True


def main():
    admin = req("POST", "/api/auth/login", ADMIN)["token"]

    # ---- 学生账号 ----
    existing = {u["username"]: u for u in req("GET", "/api/users", token=admin)["users"]}
    new_import = "\n".join(f"{name},{no}" for no, name, *_ in STUDENTS
                           if no not in existing)
    created = {}
    if new_import:
        r = req("POST", "/api/admin/users/import", {"text": new_import}, admin)
        ok(r, "批量导入") and print(f"  导入学生 {len(r['created'])} 人")
    # 拉最新名单并补全信息
    users = {u["student_no"] or u["username"]: u
             for u in req("GET", "/api/users", token=admin)["users"]}
    stu_tokens = {}
    for no, name, gender, birthday, dorm in STUDENTS:
        u = users.get(no)
        if u is None:
            print(f"  [缺] 学号{no} {name} 未找到，跳过")
            continue
        t = req("POST", "/api/auth/login", {"username": u["username"], "password": "123456"})
        if t.get("__error"):
            print(f"  [跳过] {name} 登录失败: {t['__error']}")
            continue
        stu_tokens[no] = t["token"]
        req("POST", "/api/auth/confirm",
            {"name": name, "gender": gender, "birthday": birthday,
             "dormitory": dorm, "address": f"测试地址-{name}"}, stu_tokens[no])
    print(f"  学生信息确认完成：{len(stu_tokens)} 人")

    ids = {no: users[no]["id"] for no in stu_tokens}

    # ---- 课程表 ----
    n = 0
    for (d, p), (name, teacher, room) in COURSES.items():
        ok(req("PUT", "/api/courses",
               {"day": d, "period": p, "name": name, "teacher": teacher, "room": room}, admin), f"课程{d}-{p}")
        n += 1
    print(f"  课程表：{n} 节")

    # ---- 作业 + 提交 ----
    missing_map = {0: ["07", "11"], 1: ["05"], 2: [], 3: ["02", "07", "12"]}
    for idx, (title, subject, content, _) in enumerate(HOMEWORK):
        r = req("POST", "/api/homework",
                {"title": title, "subject": subject, "content": content,
                 "dueDate": f"{TODAY} 20:00"}, admin)
        if not ok(r, f"作业《{title}》"):
            continue
        hid = r["id"]
        for no in stu_tokens:
            if no in missing_map.get(idx, []):
                continue
            req("POST", f"/api/homework/{hid}/submit",
                {"content": "已完成，请老师查收。"}, stu_tokens[no])
    print(f"  作业：{len(HOMEWORK)} 次（含缺交名单）")

    # ---- 操行分 ----
    for no, pts, reason in CONDUCT:
        ok(req("POST", "/api/conduct", {"user_id": ids[no], "points": pts, "reason": reason}, admin),
           f"操行分 {no}")
    print(f"  操行分：{len(CONDUCT)} 条")

    # ---- 通知 ----
    for title, content in NOTICES:
        ok(req("POST", "/api/notices", {"title": title, "content": content}, admin), title)
    print(f"  通知：{len(NOTICES)} 条")

    # ---- 值日（周一~周五，每天2人）----
    duty_plan = {1: ["01", "05"], 2: ["03", "09"], 3: ["02", "08"],
                 4: ["04", "11"], 5: ["06", "12"], 6: ["07"], 7: ["10"]}
    for day, members in duty_plan.items():
        ok(req("PUT", "/api/duty",
               {"day": day, "items": [{"userId": ids[m], "task": ["扫地", "拖地", "倒垃圾"][i % 3]}
                                      for i, m in enumerate(members)]}, admin), f"值日周{day}")
    print("  值日表：7 天排班")

    # ---- 座位（4 行 3 列）----
    cells = []
    for i, no in enumerate([f"{x:02d}" for x in range(1, 13)]):
        if no in ids:
            cells.append({"row": i // 3 + 1, "col": i % 3 + 1, "userId": ids[no]})
    ok(req("PUT", "/api/seats", {"cells": cells}, admin), "座位")
    print("  座位表：4行3列")

    # ---- 项目 + 报名 ----
    for title, desc, quota, status in PROJECTS:
        r = req("POST", "/api/projects", {"title": title, "description": desc, "quota": quota}, admin)
        if ok(r, title):
            pid = r["id"]
            if status == "closed":
                req("PUT", f"/api/projects/{pid}/status", {"status": "closed"}, admin)
            for no in ["01", "02", "03", "05", "08", "10"][:5]:
                ok(req("POST", f"/api/projects/{pid}/signup", token=stu_tokens[no]), f"报名{title}")
    print(f"  项目：{len(PROJECTS)} 个")

    # ---- 小组 ----
    for name, members in GROUPS:
        r = req("POST", "/api/groups", {"name": name, "leaderId": ids[members[0]]}, admin)
        if ok(r, name):
            req("PUT", f"/api/groups/{r['id']}/members",
                {"userIds": [ids[m] for m in members], "leaderId": ids[members[0]]}, admin)
    print(f"  小组：{len(GROUPS)} 个")

    # ---- 班费 ----
    for t, amount, item, note in FUND_RECORDS:
        ok(req("POST", "/api/fund/record", {"type": t, "amount": amount, "item": item, "note": note}, admin), item)
    ok(req("POST", "/api/fund/apply", {"amount": 30, "reason": "教室绿植采购"}, stu_tokens["08"]), "班费申请")
    print("  班费：3 笔流水 + 1 个待审批申请")

    # ---- 请假 ----
    r = req("POST", "/api/leaves",
            {"startTime": f"{TODAY} 14:00", "endTime": f"{TODAY} 18:00", "reason": "牙齿复查"},
            stu_tokens.get("05"))
    ok(r, "请假申请(待审批)")
    r2 = req("POST", "/api/leaves",
             {"startTime": f"{TODAY} 08:00", "endTime": f"{TODAY} 12:00", "reason": "感冒发热"},
             stu_tokens.get("02"))
    if ok(r2, "请假2"):
        req("PUT", f"/api/leaves/{r2['id']}/review", {"status": "approved"}, admin)
    print("  请假：1 待审批 + 1 已批准")

    # ---- 论坛 ----
    for i, (title, content, replies) in enumerate(FORUM):
        poster = ["03", "10", "06"][i]
        r = req("POST", "/api/posts", {"title": title, "content": content}, stu_tokens.get(poster))
        if ok(r, title):
            for j, reply in enumerate(replies):
                req("POST", f"/api/posts/{r['id']}/comments", {"content": reply},
                    stu_tokens[["01", "09"][j % 2]])
    print(f"  论坛：{len(FORUM)} 帖 + 回复")

    # ---- 晚自习报备（今天）----
    for no, kind, address in REPORTS_TODAY:
        ok(req("POST", "/api/reports", {"date": TODAY, "kind": kind, "address": address},
               stu_tokens[no]), f"报备{no}")
    print(f"  晚自习报备：{len(REPORTS_TODAY)} 人（4 人未报备，可用于演示老师端视角）")

    # ---- stu01 与 01 好友 + 私信 ----
    if "stu01" in existing or True:
        t1 = req("POST", "/api/auth/login", {"username": "stu01", "password": "123456"}).get("token")
        if t1:
            ok(req("POST", f"/api/friends/{ids['01']}", token=t1), "好友请求")
            fr = req("GET", "/api/friends", token=admin)
            for rq_ in fr.get("requests", []):
                req("PUT", f"/api/friend_requests/{rq_['id']}", {"status": "accepted"}, admin)
            ok(req("POST", f"/api/dm/{ids['01']}", {"content": "同学你好，作业写完了吗？"}, t1), "私信")
    print("  好友 + 私信示例：stu01 <-> 陈梓轩")

    s = req("GET", "/api/admin/stats", token=admin)
    print("\n===== 完成后的看板数据 =====")
    print(json.dumps({k: v for k, v in s.items() if not isinstance(v, list)}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    for a in sys.argv[1:]:
        if a.startswith("--base"):
            BASE = a.split("=", 1)[1]
    main()
