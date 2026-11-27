"""事务模块：项目报名/小组/请假/班费"""
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth import require_auth, require_teacher

api = Blueprint("extra", __name__, url_prefix="/api")


# ---------- 项目报名 ----------
@api.get("/projects")
@require_auth
def project_list():
    db = get_db()
    rows = db.execute(
        "SELECT p.*, u.name AS by_name, "
        "(SELECT COUNT(*) FROM project_signups s WHERE s.project_id=p.id) AS signup_count, "
        "(SELECT COUNT(*) FROM project_signups s WHERE s.project_id=p.id AND s.user_id=?) AS signed "
        "FROM projects p JOIN users u ON u.id=p.created_by ORDER BY p.created_at DESC",
        (g.user["id"],)).fetchall()
    return jsonify(projects=[dict(r) for r in rows])


@api.post("/projects")
@require_teacher
def project_create():
    data = request.get_json(force=True)
    if not data.get("title"):
        return jsonify(error="标题不能为空"), 400
    db = get_db()
    cur = db.execute(
        "INSERT INTO projects (title,description,deadline,quota,created_by) VALUES (?,?,?,?,?)",
        (data["title"], data.get("description", ""), data.get("deadline", ""),
         data.get("quota") or 0, g.user["id"]))
    db.commit()
    return jsonify(id=cur.lastrowid)


@api.delete("/projects/<int:pid>")
@require_teacher
def project_delete(pid):
    db = get_db()
    db.execute("DELETE FROM project_signups WHERE project_id=?", (pid,))
    db.execute("DELETE FROM projects WHERE id=?", (pid,))
    db.commit()
    return jsonify(message="已删除")


@api.put("/projects/<int:pid>/status")
@require_teacher
def project_status(pid):
    db = get_db()
    db.execute("UPDATE projects SET status=? WHERE id=?",
               (request.get_json(force=True).get("status", "closed"), pid))
    db.commit()
    return jsonify(message="已更新")


@api.post("/projects/<int:pid>/signup")
@require_auth
def project_signup(pid):
    db = get_db()
    p = db.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    if p is None:
        return jsonify(error="项目不存在"), 404
    if p["status"] != "open":
        return jsonify(error="报名已截止"), 400
    if p["quota"] and db.execute(
            "SELECT COUNT(*) AS c FROM project_signups WHERE project_id=?",
            (pid,)).fetchone()["c"] >= p["quota"]:
        return jsonify(error="名额已满"), 400
    try:
        db.execute("INSERT INTO project_signups (project_id,user_id) VALUES (?,?)",
                   (pid, g.user["id"]))
        db.commit()
    except Exception:
        return jsonify(error="你已报名过"), 400
    return jsonify(message="报名成功")


@api.get("/projects/<int:pid>/signups")
@require_auth
def project_signups(pid):
    db = get_db()
    rows = db.execute(
        "SELECT s.user_id, u.name, u.student_no, s.created_at FROM project_signups s "
        "JOIN users u ON u.id=s.user_id WHERE s.project_id=? ORDER BY s.created_at",
        (pid,)).fetchall()
    return jsonify(items=[dict(r) for r in rows])


# ---------- 小组 ----------
@api.get("/groups")
@require_auth
def group_list():
    db = get_db()
    groups = db.execute(
        "SELECT g.*, u.name AS leader_name FROM groups g LEFT JOIN users u ON u.id=g.leader_id "
        "ORDER BY g.id").fetchall()
    members = db.execute(
        "SELECT m.group_id, m.user_id, u.name FROM group_members m "
        "JOIN users u ON u.id=m.user_id ORDER BY m.group_id").fetchall()
    out = []
    for g_ in groups:
        out.append({**dict(g_), "members": [
            {"id": m["user_id"], "name": m["name"]}
            for m in members if m["group_id"] == g_["id"]]})
    return jsonify(groups=out)


@api.post("/groups")
@require_teacher
def group_create():
    data = request.get_json(force=True)
    db = get_db()
    cur = db.execute("INSERT INTO groups (name,leader_id) VALUES (?,?)",
                     (data.get("name") or "新小组", data.get("leaderId")))
    db.commit()
    return jsonify(id=cur.lastrowid)


@api.delete("/groups/<int:gid>")
@require_teacher
def group_delete(gid):
    db = get_db()
    db.execute("DELETE FROM group_members WHERE group_id=?", (gid,))
    db.execute("DELETE FROM groups WHERE id=?", (gid,))
    db.commit()
    return jsonify(message="已删除")


@api.put("/groups/<int:gid>/members")
@require_teacher
def group_members(gid):
    data = request.get_json(force=True)
    db = get_db()
    db.execute("DELETE FROM group_members WHERE group_id=?", (gid,))
    for uid in data.get("userIds", []):
        db.execute("INSERT OR IGNORE INTO group_members (group_id,user_id) VALUES (?,?)",
                   (gid, uid))
    if data.get("leaderId"):
        db.execute("UPDATE groups SET leader_id=? WHERE id=?", (data["leaderId"], gid))
    db.commit()
    return jsonify(message="已保存")


# ---------- 请假 ----------
@api.get("/leaves")
@require_auth
def leave_list():
    db = get_db()
    if g.user["role"] == "teacher":
        rows = db.execute(
            "SELECT l.*, u.name AS user_name FROM leaves l JOIN users u ON u.id=l.user_id "
            "ORDER BY l.created_at DESC").fetchall()
    else:
        rows = db.execute(
            "SELECT l.*, u.name AS user_name FROM leaves l JOIN users u ON u.id=l.user_id "
            "WHERE l.user_id=? ORDER BY l.created_at DESC", (g.user["id"],)).fetchall()
    return jsonify(items=[dict(r) for r in rows])


@api.post("/leaves")
@require_auth
def leave_apply():
    data = request.get_json(force=True)
    leave_type = data.get("type")
    if leave_type not in ("病假", "事假", "离校"):
        leave_type = "事假"
    db = get_db()
    cur = db.execute(
        "INSERT INTO leaves (user_id,start_time,end_time,reason,type) VALUES (?,?,?,?,?)",
        (g.user["id"], data.get("startTime") or "", data.get("endTime") or "",
         data.get("reason") or "", leave_type))
    db.commit()
    return jsonify(id=cur.lastrowid)


@api.put("/leaves/<int:lid>/review")
@require_teacher
def leave_review(lid):
    data = request.get_json(force=True)
    status = data.get("status")
    if status not in ("approved", "rejected"):
        return jsonify(error="无效状态"), 400
    db = get_db()
    db.execute("UPDATE leaves SET status=?, reviewed_by=? WHERE id=?",
               (status, g.user["id"], lid))
    db.commit()
    return jsonify(message="已处理")


# ---------- 班费 ----------
@api.get("/fund")
@require_auth
def fund_overview():
    db = get_db()
    records = db.execute(
        "SELECT f.*, u.name AS by_name FROM fund_records f JOIN users u ON u.id=f.by_user "
        "ORDER BY f.created_at DESC LIMIT 200").fetchall()
    balance = db.execute(
        "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS b "
        "FROM fund_records").fetchone()["b"]
    apps = db.execute(
        "SELECT a.*, u.name AS user_name FROM fund_applications a JOIN users u ON u.id=a.user_id "
        "ORDER BY a.created_at DESC").fetchall()
    return jsonify(balance=balance,
                   records=[dict(r) for r in records],
                   applications=[dict(r) for r in apps])


@api.post("/fund/record")
@require_teacher
def fund_add():
    data = request.get_json(force=True)
    t = data.get("type")
    if t not in ("income", "expense") or not data.get("amount"):
        return jsonify(error="参数不完整"), 400
    db = get_db()
    db.execute("INSERT INTO fund_records (type,amount,item,note,by_user) VALUES (?,?,?,?,?)",
               (t, data["amount"], data.get("item", ""), data.get("note", ""), g.user["id"]))
    db.commit()
    return jsonify(message="已记账")


@api.post("/fund/apply")
@require_auth
def fund_apply():
    data = request.get_json(force=True)
    db = get_db()
    db.execute("INSERT INTO fund_applications (user_id,amount,reason) VALUES (?,?,?)",
               (g.user["id"], data.get("amount") or 0, data.get("reason") or ""))
    db.commit()
    return jsonify(message="申请已提交")


@api.put("/fund/apply/<int:aid>")
@require_teacher
def fund_review(aid):
    data = request.get_json(force=True)
    status = data.get("status")
    if status not in ("approved", "rejected"):
        return jsonify(error="无效状态"), 400
    db = get_db()
    db.execute("UPDATE fund_applications SET status=?, reviewed_by=? WHERE id=?",
               (status, g.user["id"], aid))
    db.commit()
    return jsonify(message="已处理")
