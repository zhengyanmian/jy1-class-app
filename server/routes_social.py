"""社交与报备模块：论坛/私信/好友/晚自习报备"""
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth import require_auth

api = Blueprint("social", __name__, url_prefix="/api")


# ---------- 论坛 ----------
@api.get("/posts")
@require_auth
def post_list():
    db = get_db()
    rows = db.execute(
        "SELECT p.*, u.name AS author_name, "
        "(SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) AS comment_count "
        "FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 100"
    ).fetchall()
    return jsonify(posts=[dict(r) for r in rows])


@api.get("/posts/mine")
@require_auth
def my_posts():
    db = get_db()
    rows = db.execute(
        "SELECT p.*, u.name AS author_name, "
        "(SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) AS comment_count "
        "FROM posts p JOIN users u ON u.id=p.user_id WHERE p.user_id=? "
        "ORDER BY p.created_at DESC", (g.user["id"],)).fetchall()
    return jsonify(posts=[dict(r) for r in rows])


@api.post("/posts")
@require_auth
def post_create():
    data = request.get_json(force=True)
    if not data.get("title"):
        return jsonify(error="标题不能为空"), 400
    db = get_db()
    cur = db.execute("INSERT INTO posts (user_id,title,content) VALUES (?,?,?)",
                     (g.user["id"], data["title"], data.get("content", "")))
    db.commit()
    return jsonify(id=cur.lastrowid)


@api.delete("/posts/<int:pid>")
@require_auth
def post_delete(pid):
    db = get_db()
    p = db.execute("SELECT * FROM posts WHERE id=?", (pid,)).fetchone()
    if p is None:
        return jsonify(error="帖子不存在"), 404
    if p["user_id"] != g.user["id"] and g.user["role"] != "teacher":
        return jsonify(error="无权删除"), 403
    db.execute("DELETE FROM comments WHERE post_id=?", (pid,))
    db.execute("DELETE FROM posts WHERE id=?", (pid,))
    db.commit()
    return jsonify(message="已删除")


@api.get("/posts/<int:pid>")
@require_auth
def post_detail(pid):
    db = get_db()
    p = db.execute(
        "SELECT p.*, u.name AS author_name FROM posts p JOIN users u ON u.id=p.user_id "
        "WHERE p.id=?", (pid,)).fetchone()
    if p is None:
        return jsonify(error="帖子不存在"), 404
    comments = db.execute(
        "SELECT c.*, u.name AS author_name FROM comments c JOIN users u ON u.id=c.user_id "
        "WHERE c.post_id=? ORDER BY c.created_at", (pid,)).fetchall()
    return jsonify(post=dict(p), comments=[dict(r) for r in comments])


@api.post("/posts/<int:pid>/comments")
@require_auth
def comment_create(pid):
    data = request.get_json(force=True)
    if not data.get("content"):
        return jsonify(error="内容不能为空"), 400
    db = get_db()
    db.execute("INSERT INTO comments (post_id,user_id,content) VALUES (?,?,?)",
               (pid, g.user["id"], data["content"]))
    db.commit()
    return jsonify(message="已回复")


# ---------- 私信 ----------
@api.get("/dm/contacts")
@require_auth
def dm_contacts():
    """会话列表：最近联系人 + 未读数"""
    db = get_db()
    rows = db.execute(
        "SELECT u.id, u.name, m.content AS last_msg, m.created_at AS last_time, "
        "(SELECT COUNT(*) FROM messages x WHERE x.from_id=u.id AND x.to_id=? AND x.is_read=0) "
        "AS unread FROM messages m JOIN users u ON u.id=m.from_id WHERE m.to_id=? "
        "UNION SELECT u.id, u.name, m.content, m.created_at, 0 FROM messages m "
        "JOIN users u ON u.id=m.to_id WHERE m.from_id=? "
        "ORDER BY last_time DESC LIMIT 50", (g.user["id"], g.user["id"], g.user["id"])
    ).fetchall()
    seen, out = set(), []
    for r in rows:
        if r["id"] in seen:
            continue
        seen.add(r["id"])
        out.append(dict(r))
    return jsonify(contacts=out)


@api.get("/dm/<int:peer_id>")
@require_auth
def dm_history(peer_id):
    db = get_db()
    db.execute("UPDATE messages SET is_read=1 WHERE from_id=? AND to_id=?",
               (peer_id, g.user["id"]))
    db.commit()
    rows = db.execute(
        "SELECT * FROM messages WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?) "
        "ORDER BY created_at LIMIT 200",
        (g.user["id"], peer_id, peer_id, g.user["id"])).fetchall()
    return jsonify(messages=[dict(r) for r in rows])


@api.post("/dm/<int:peer_id>")
@require_auth
def dm_send(peer_id):
    data = request.get_json(force=True)
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify(error="内容不能为空"), 400
    db = get_db()
    db.execute("INSERT INTO messages (from_id,to_id,content) VALUES (?,?,?)",
               (g.user["id"], peer_id, content))
    db.commit()
    return jsonify(message="已发送")


# ---------- 好友 ----------
@api.get("/friends")
@require_auth
def friend_list():
    """已确认好友（双向）+ 收到的请求"""
    db = get_db()
    uid = g.user["id"]
    accepted = db.execute(
        "SELECT CASE WHEN from_id=? THEN to_id ELSE from_id END AS fid, status "
        "FROM friend_requests WHERE (from_id=? OR to_id=?) AND status='accepted'",
        (uid, uid, uid)).fetchall()
    ids = [r["fid"] for r in accepted]
    friends = []
    if ids:
        qmarks = ",".join("?" * len(ids))
        friends = [dict(r) for r in db.execute(
            f"SELECT id, name, gender, avatar FROM users WHERE id IN ({qmarks})",
            ids).fetchall()]
    requests = db.execute(
        "SELECT fr.*, u.name AS from_name FROM friend_requests fr JOIN users u ON u.id=fr.from_id "
        "WHERE fr.to_id=? AND fr.status='pending'", (uid,)).fetchall()
    return jsonify(friends=friends,
                   requests=[dict(r) for r in requests])


@api.post("/friends/<int:target_id>")
@require_auth
def friend_request(target_id):
    uid = g.user["id"]
    if target_id == uid:
        return jsonify(error="不能添加自己"), 400
    db = get_db()
    dup = db.execute(
        "SELECT * FROM friend_requests WHERE ((from_id=? AND to_id=?) OR "
        "(from_id=? AND to_id=?)) AND status='pending'", (uid, target_id, target_id, uid)
    ).fetchone()
    if dup:
        return jsonify(error="请求已存在"), 400
    ok = db.execute(
        "SELECT * FROM friend_requests WHERE from_id=? AND to_id=? AND status='pending'",
        (target_id, uid)).fetchone()
    if ok:  # 对方已向我发过请求，直接互认
        db.execute("UPDATE friend_requests SET status='accepted' WHERE id=?", (ok["id"],))
        db.commit()
        return jsonify(message="已互为好友")
    db.execute("INSERT INTO friend_requests (from_id,to_id) VALUES (?,?)", (uid, target_id))
    db.commit()
    return jsonify(message="请求已发送")


@api.put("/friend_requests/<int:rid>")
@require_auth
def friend_review(rid):
    data = request.get_json(force=True)
    status = data.get("status")
    if status not in ("accepted", "rejected"):
        return jsonify(error="无效状态"), 400
    db = get_db()
    db.execute("UPDATE friend_requests SET status=? WHERE id=? AND to_id=?",
               (status, rid, g.user["id"]))
    db.commit()
    return jsonify(message="已处理")


# ---------- 晚自习报备 ----------
@api.get("/reports")
@require_auth
def report_list():
    db = get_db()
    date = request.args.get("date")
    if g.user["role"] == "teacher":
        rows = db.execute(
            "SELECT r.*, u.name AS user_name, u.dormitory FROM reports r "
            "JOIN users u ON u.id=r.user_id WHERE (? IS NULL OR r.date=?) "
            "ORDER BY r.created_at DESC", (date, date)).fetchall()
    else:
        rows = db.execute(
            "SELECT r.*, u.name AS user_name FROM reports r JOIN users u ON u.id=r.user_id "
            "WHERE r.user_id=? ORDER BY r.date DESC LIMIT 60", (g.user["id"],)).fetchall()
    return jsonify(items=[dict(r) for r in rows])


@api.post("/reports")
@require_auth
def report_submit():
    data = request.get_json(force=True)
    db = get_db()
    db.execute(
        "INSERT INTO reports (user_id,date,kind,address) VALUES (?,?,?,?) "
        "ON CONFLICT(user_id,date) DO UPDATE SET kind=?, address=?, "
        "created_at=datetime('now','localtime')",
        (g.user["id"], data.get("date"), data.get("kind") or "normal",
         data.get("address") or "", data.get("kind") or "normal",
         data.get("address") or ""))
    db.commit()
    return jsonify(message="报备成功")
