"""管理后台接口：数据看板 / 学生批量导入 / 修改密码"""
import csv
import io
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db
from auth import require_teacher, require_auth

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/stats")
@require_teacher
def stats():
    db = get_db()
    today = db.execute("SELECT date('now','localtime') AS d").fetchone()["d"]

    total_students = db.execute(
        "SELECT COUNT(*) AS c FROM users WHERE role='student'").fetchone()["c"]
    unconfirmed = db.execute(
        "SELECT COUNT(*) AS c FROM users WHERE role='student' AND confirmed=0").fetchone()["c"]

    hw = db.execute(
        "SELECT h.id, h.title, h.due_date, h.created_at, "
        "(SELECT COUNT(*) FROM submissions s WHERE s.homework_id=h.id AND s.status='done') AS done "
        "FROM homework h ORDER BY h.created_at DESC LIMIT 10").fetchall()
    hw_total = db.execute("SELECT COUNT(*) AS c FROM homework").fetchone()["c"]

    conduct_today = db.execute(
        "SELECT COUNT(*) AS c FROM conduct WHERE substr(created_at,1,10)=?",
        (today,)).fetchone()["c"]
    conduct_total = db.execute("SELECT COUNT(*) AS c FROM conduct").fetchone()["c"]

    pending_leaves = db.execute(
        "SELECT COUNT(*) AS c FROM leaves WHERE status='pending'").fetchone()["c"]
    pending_fund = db.execute(
        "SELECT COUNT(*) AS c FROM fund_applications WHERE status='pending'").fetchone()["c"]
    fund_balance = db.execute(
        "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS b "
        "FROM fund_records").fetchone()["b"]
    reports_today = db.execute(
        "SELECT COUNT(*) AS c FROM reports WHERE date=?", (today,)).fetchone()["c"]

    return jsonify(
        students=total_students, unconfirmed=unconfirmed,
        homeworkTotal=hw_total,
        homework=[dict(r) for r in hw],
        conductToday=conduct_today, conductTotal=conduct_total,
        pendingLeaves=pending_leaves, pendingFund=pending_fund,
        fundBalance=fund_balance, reportsToday=reports_today)


@admin_bp.post("/users/import")
@require_teacher
def import_users():
    """批量导入学生。
    body: {text: "姓名,学号\n张三,01\n..."} 或 {users:[{name,studentNo,username?,password?}]}
    用户名缺省用学号，密码缺省 123456。
    """
    data = request.get_json(force=True)
    rows = []
    if data.get("users"):
        rows = data["users"]
    elif data.get("text"):
        reader = csv.reader(io.StringIO(data["text"]))
        for parts in reader:
            parts = [p.strip() for p in parts if p.strip()]
            if not parts:
                continue
            # 跳过表头
            if parts[0] in ("姓名", "name") and (len(parts) < 2 or parts[1] in ("学号", "账号")):
                continue
            rows.append({"name": parts[0],
                         "studentNo": parts[1] if len(parts) > 1 else "",
                         "username": parts[2] if len(parts) > 2 else "",
                         "password": parts[3] if len(parts) > 3 else ""})
    else:
        return jsonify(error="没有可导入的数据"), 400

    db = get_db()
    created, skipped = [], []
    for r in rows:
        name = (r.get("name") or "").strip()
        if not name:
            skipped.append({"row": r, "reason": "姓名为空"})
            continue
        username = (r.get("username") or r.get("studentNo") or "").strip()
        if not username:
            username = f"s{db.execute('SELECT COALESCE(MAX(id),0)+1 AS n FROM users').fetchone()['n']}"
        if db.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
            skipped.append({"row": r, "reason": f"账号 {username} 已存在"})
            continue
        cur = db.execute(
            "INSERT INTO users (username,password_hash,name,role,student_no) VALUES (?,?,?,?,?)",
            (username, generate_password_hash(r.get("password") or "123456"),
             name, "student", r.get("studentNo") or ""))
        created.append({"id": cur.lastrowid, "name": name,
                        "username": username,
                        "password": r.get("password") or "123456"})
    db.commit()
    return jsonify(created=created, skipped=skipped)


@admin_bp.post("/auth/change-password")
@require_auth
def change_password():
    data = request.get_json(force=True)
    old = data.get("old") or ""
    new = data.get("new") or ""
    if len(new) < 6:
        return jsonify(error="新密码至少 6 位"), 400
    if not check_password_hash(g.user["password_hash"], old):
        return jsonify(error="原密码错误"), 401
    db = get_db()
    db.execute("UPDATE users SET password_hash=? WHERE id=?",
               (generate_password_hash(new), g.user["id"]))
    db.commit()
    return jsonify(message="密码已修改")
