"""核心模块：用户管理/课程表/作业/操行分/通知/值日/座位"""
import json
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash
from db import get_db
from auth import require_auth, require_teacher, public_user

api = Blueprint("main", __name__, url_prefix="/api")


def _uid():
    return g.user["id"]


def _is_teacher():
    return g.user["role"] == "teacher"


def _name_of(db, uid):
    r = db.execute("SELECT name FROM users WHERE id=?", (uid,)).fetchone()
    return r["name"] if r else "未知"


# ---------- 用户 ----------
@api.get("/users")
@require_auth
def list_users():
    db = get_db()
    rows = db.execute(
        "SELECT id, username, name, role, student_no, gender, birthday, "
        "avatar, dormitory, confirmed, score FROM users ORDER BY student_no, id"
    ).fetchall()
    return jsonify(users=[dict(r) for r in rows])


@api.post("/users")
@require_teacher
def create_user():
    """老师分配账号"""
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify(error="用户名不能为空"), 400
    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
        return jsonify(error="账号已存在"), 400
    cur = db.execute(
        "INSERT INTO users (username, password_hash, name, role, student_no, gender, birthday) "
        "VALUES (?,?,?,?,?,?,?)",
        (username, generate_password_hash(data.get("password") or "123456"),
         data.get("name") or username, data.get("role") or "student",
         data.get("studentNo") or "", data.get("gender") or "",
         data.get("birthday") or ""))
    db.commit()
    return jsonify(user_id=cur.lastrowid)


@api.put("/users/<int:uid>")
@require_teacher
def update_user(uid):
    data = request.get_json(force=True)
    db = get_db()
    fields = []
    vals = []
    m = {"name": "name", "role": "role", "studentNo": "student_no",
         "gender": "gender", "birthday": "birthday", "dormitory": "dormitory"}
    for k, col in m.items():
        if k in data:
            fields.append(f"{col}=?")
            vals.append(data[k])
    if data.get("password"):
        fields.append("password_hash=?")
        vals.append(generate_password_hash(data["password"]))
    if not fields:
        return jsonify(error="没有可更新字段"), 400
    vals.append(uid)
    db.execute(f"UPDATE users SET {', '.join(fields)} WHERE id=?", vals)
    db.commit()
    return jsonify(message="已更新")


@api.delete("/users/<int:uid>")
@require_teacher
def delete_user(uid):
    if uid == _uid():
        return jsonify(error="不能删除自己"), 400
    db = get_db()
    db.execute("DELETE FROM users WHERE id=?", (uid,))
    db.commit()
    return jsonify(message="已删除")


# ---------- 课程表 ----------
@api.get("/courses")
@require_auth
def get_courses():
    db = get_db()
    rows = db.execute("SELECT * FROM courses ORDER BY day, period").fetchall()
    return jsonify(courses=[dict(r) for r in rows])


@api.put("/courses")
@require_teacher
def set_course():
    """按 day+period 覆盖设置一节课；name 为空则删除"""
    data = request.get_json(force=True)
    db = get_db()
    row = db.execute("SELECT id FROM courses WHERE day=? AND period=?",
                     (data["day"], data["period"])).fetchone()
    if data.get("name"):
        if row:
            db.execute("UPDATE courses SET name=?,teacher=?,room=? WHERE id=?",
                       (data["name"], data.get("teacher", ""),
                        data.get("room", ""), row["id"]))
        else:
            db.execute("INSERT INTO courses (day,period,name,teacher,room) VALUES (?,?,?,?,?)",
                       (data["day"], data["period"], data["name"],
                        data.get("teacher", ""), data.get("room", "")))
    elif row:
        db.execute("DELETE FROM courses WHERE id=?", (row["id"],))
    db.commit()
    return jsonify(message="已保存")


# ---------- 作业 ----------
@api.get("/homework")
@require_auth
def list_homework():
    db = get_db()
    rows = db.execute(
        "SELECT h.*, (SELECT COUNT(*) FROM submissions s WHERE s.homework_id=h.id "
        " AND s.status='done') AS done_count FROM homework h "
        "ORDER BY h.created_at DESC").fetchall()
    return jsonify(homework=[dict(r) for r in rows])


@api.post("/homework")
@require_teacher
def create_homework():
    data = request.get_json(force=True)
    if not data.get("title"):
        return jsonify(error="标题不能为空"), 400
    db = get_db()
    cur = db.execute(
        "INSERT INTO homework (title,subject,content,due_date,created_by) VALUES (?,?,?,?,?)",
        (data["title"], data.get("subject", ""), data.get("content", ""),
         data.get("dueDate", ""), _uid()))
    db.commit()
    return jsonify(id=cur.lastrowid)


@api.delete("/homework/<int:hid>")
@require_teacher
def delete_homework(hid):
    db = get_db()
    db.execute("DELETE FROM submissions WHERE homework_id=?", (hid,))
    db.execute("DELETE FROM homework WHERE id=?", (hid,))
    db.commit()
    return jsonify(message="已删除")


@api.get("/homework/<int:hid>/status")
@require_auth
def homework_status(hid):
    """提交情况：全员列表 + 各自状态（缺交名单）"""
    db = get_db()
    subs = {r["user_id"]: dict(r) for r in db.execute(
        "SELECT * FROM submissions WHERE homework_id=?", (hid,)).fetchall()}
    users = db.execute(
        "SELECT id, name, student_no FROM users WHERE role='student' "
        "ORDER BY student_no").fetchall()
    out = []
    for u in users:
        s = subs.get(u["id"])
        out.append({"userId": u["id"], "name": u["name"],
                    "studentNo": u["student_no"],
                    "status": s["status"] if s else "missing",
                    "content": s["content"] if s else "",
                    "submittedAt": s["submitted_at"] if s else ""})
    return jsonify(items=out)


@api.post("/homework/<int:hid>/submit")
@require_auth
def submit_homework(hid):
    data = request.get_json(force=True)
    db = get_db()
    db.execute(
        "INSERT INTO submissions (homework_id,user_id,status,content,submitted_at) "
        "VALUES (?,?,?,?,datetime('now','localtime')) "
        "ON CONFLICT(homework_id,user_id) DO UPDATE SET status='done', content=?, "
        "submitted_at=datetime('now','localtime')",
        (hid, _uid(), "done", data.get("content", ""), data.get("content", "")))
    db.commit()
    return jsonify(message="提交成功")


# ---------- 操行分 ----------
@api.get("/conduct")
@require_auth
def conduct_list():
    """全部记录（老师）/ 自己的记录（学生）；支持 ?user_id=（查看他人，公示）"""
    db = get_db()
    uid = request.args.get("user_id", type=int) or _uid()
    rows = db.execute(
        "SELECT c.*, u.name AS user_name, b.name AS by_name FROM conduct c "
        "JOIN users u ON u.id=c.user_id JOIN users b ON b.id=c.by_user "
        "WHERE c.user_id=? ORDER BY c.created_at DESC", (uid,)).fetchall()
    return jsonify(records=[dict(r) for r in rows])


@api.get("/conduct/month")
@require_auth
def conduct_month():
    """月度汇总：每人分数排行"""
    db = get_db()
    month = request.args.get("month")  # YYYY-MM
    where, params = ("WHERE substr(created_at,1,7)=?", [month]) if month else ("", [])
    rows = db.execute(
        f"SELECT u.id, u.name, u.student_no, COALESCE(SUM(c.points),0) AS total, "
        f"u.score AS all_total FROM users u LEFT JOIN conduct c ON c.user_id=u.id {where} "
        f"AND u.role='student' GROUP BY u.id ORDER BY total DESC",
        params).fetchall() if month else db.execute(
        "SELECT u.id, u.name, u.student_no, "
        "COALESCE((SELECT SUM(points) FROM conduct c WHERE c.user_id=u.id "
        " AND substr(c.created_at,1,7)=strftime('%Y-%m','now')),0) AS total, "
        "u.score AS all_total FROM users u WHERE u.role='student' "
        "ORDER BY total DESC").fetchall()
    return jsonify(rank=[dict(r) for r in rows])


@api.get("/conduct/all")
@require_teacher
def conduct_all():
    """全员操行分记录（公示/审计）"""
    db = get_db()
    rows = db.execute(
        "SELECT c.*, u.name AS user_name, b.name AS by_name FROM conduct c "
        "JOIN users u ON u.id=c.user_id JOIN users b ON b.id=c.by_user "
        "ORDER BY c.created_at DESC LIMIT 500").fetchall()
    return jsonify(records=[dict(r) for r in rows])


@api.post("/conduct")
@require_teacher
def conduct_add():
    data = request.get_json(force=True)
    uid = data.get("user_id")
    pts = data.get("points")
    if uid is None or pts is None:
        return jsonify(error="参数不完整"), 400
    db = get_db()
    db.execute("INSERT INTO conduct (user_id,points,reason,by_user) VALUES (?,?,?,?)",
               (uid, pts, data.get("reason") or "", _uid()))
    db.execute("UPDATE users SET score = score + ? WHERE id=?", (pts, uid))
    db.commit()
    return jsonify(message="已记录")


@api.delete("/conduct/<int:cid>")
@require_teacher
def conduct_delete(cid):
    db = get_db()
    row = db.execute("SELECT * FROM conduct WHERE id=?", (cid,)).fetchone()
    if row:
        db.execute("UPDATE users SET score = score - ? WHERE id=?",
                   (row["points"], row["user_id"]))
        db.execute("DELETE FROM conduct WHERE id=?", (cid,))
    db.commit()
    return jsonify(message="已删除")


# ---------- 通知 ----------
@api.get("/notices")
@require_auth
def notice_list():
    db = get_db()
    rows = db.execute(
        "SELECT n.*, u.name AS by_name FROM notices n JOIN users u ON u.id=n.by_user "
        "ORDER BY n.created_at DESC LIMIT 100").fetchall()
    return jsonify(notices=[dict(r) for r in rows])


@api.post("/notices")
@require_teacher
def notice_create():
    data = request.get_json(force=True)
    if not data.get("title"):
        return jsonify(error="标题不能为空"), 400
    db = get_db()
    cur = db.execute("INSERT INTO notices (title,content,by_user) VALUES (?,?,?)",
                     (data["title"], data.get("content", ""), _uid()))
    db.commit()
    return jsonify(id=cur.lastrowid)


@api.delete("/notices/<int:nid>")
@require_teacher
def notice_delete(nid):
    db = get_db()
    db.execute("DELETE FROM notices WHERE id=?", (nid,))
    db.commit()
    return jsonify(message="已删除")


# ---------- 值日 ----------
@api.get("/duty")
@require_auth
def duty_get():
    db = get_db()
    rows = db.execute(
        "SELECT d.*, u.name AS user_name FROM duty d LEFT JOIN users u ON u.id=d.user_id "
        "ORDER BY d.day").fetchall()
    return jsonify(duty=[dict(r) for r in rows])


@api.put("/duty")
@require_teacher
def duty_set():
    data = request.get_json(force=True)
    db = get_db()
    db.execute("DELETE FROM duty WHERE day=?", (data["day"],))
    for item in data.get("items", []):
        db.execute("INSERT INTO duty (day,user_id,task) VALUES (?,?,?)",
                   (data["day"], item["userId"], item.get("task", "")))
    db.commit()
    return jsonify(message="已保存")


# ---------- 座位 ----------
@api.get("/seats")
@require_auth
def seats_get():
    db = get_db()
    rows = db.execute(
        "SELECT s.*, u.name AS user_name FROM seats s LEFT JOIN users u ON u.id=s.user_id "
        "ORDER BY s.row_no, s.col_no").fetchall()
    return jsonify(seats=[dict(r) for r in rows])


@api.put("/seats")
@require_teacher
def seats_set():
    """整表替换：rows=行数 cols=列数 cells=[{row,col,userId|null}]"""
    data = request.get_json(force=True)
    db = get_db()
    db.execute("DELETE FROM seats")
    for c in data.get("cells", []):
        db.execute("INSERT OR IGNORE INTO seats (row_no,col_no,user_id) VALUES (?,?,?)",
                   (c["row"], c["col"], c.get("userId")))
    db.commit()
    return jsonify(message="已保存")


# ---------- 生日 ----------
@api.get("/birthdays")
@require_auth
def birthdays():
    db = get_db()
    rows = db.execute(
        "SELECT id, name, gender, birthday, student_no FROM users "
        "WHERE birthday != '' ORDER BY substr(birthday, 6, 5) || "
        "CASE WHEN length(birthday)=10 THEN '' ELSE '9' END").fetchall()
    return jsonify(birthdays=[dict(r) for r in rows])
