"""认证：账号密码登录 + JWT"""
import os
import time
import jwt
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db

JWT_SECRET = os.environ.get("CLASSAPP_JWT", "jy1-class-secret-change-me")
JWT_TTL = 60 * 60 * 24 * 14  # 14 天

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def make_token(user) -> str:
    payload = {"uid": user["id"], "role": user["role"],
               "exp": int(time.time()) + JWT_TTL}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def current_user():
    """从请求头解析当前用户，未登录返回 None"""
    token = (request.headers.get("Authorization") or "").removeprefix("Bearer ")
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    db = get_db()
    return db.execute("SELECT * FROM users WHERE id=?", (payload["uid"],)).fetchone()


def require_auth(fn):
    def wrapper(*a, **kw):
        user = current_user()
        if user is None:
            return jsonify(error="未登录或登录已过期"), 401
        g.user = user
        return fn(*a, **kw)
    wrapper.__name__ = fn.__name__
    return wrapper


def require_teacher(fn):
    def wrapper(*a, **kw):
        user = current_user()
        if user is None:
            return jsonify(error="未登录或登录已过期"), 401
        if user["role"] != "teacher":
            return jsonify(error="需要老师权限"), 403
        g.user = user
        return fn(*a, **kw)
    wrapper.__name__ = fn.__name__
    return wrapper


@auth_bp.post("/login")
def login():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify(error="账号或密码错误"), 401
    return jsonify(token=make_token(user),
                   user=public_user(user))


@auth_bp.post("/forgot")
def forgot():
    """忘记密码：提交账号，生成重置申请（老师端处理）。简化版：返回提示。"""
    data = request.get_json(force=True)
    db = get_db()
    user = db.execute("SELECT id FROM users WHERE username=?",
                      ((data.get("username") or "").strip(),)).fetchone()
    if user is None:
        return jsonify(error="账号不存在"), 404
    return jsonify(message="请找老师重置密码，或使用老师分配的初始密码登录"), 200


@auth_bp.post("/reset")
@require_teacher
def reset_password():
    data = request.get_json(force=True)
    uid = data.get("user_id")
    new_pwd = data.get("password") or "123456"
    db = get_db()
    db.execute("UPDATE users SET password_hash=? WHERE id=?",
               (generate_password_hash(new_pwd), uid))
    db.commit()
    return jsonify(message="密码已重置")


@auth_bp.get("/me")
@require_auth
def me():
    return jsonify(user=public_user(g.user))


@auth_bp.post("/confirm")
@require_auth
def confirm_info():
    """首次登录补全个人信息"""
    data = request.get_json(force=True)
    fields = {k: data.get(k, "") for k in
              ("name", "gender", "birthday", "dormitory", "address")}
    db = get_db()
    sets = ", ".join(f"{k}=?" for k in fields)
    db.execute(f"UPDATE users SET {sets}, confirmed=1 WHERE id=?",
               (*fields.values(), g.user["id"]))
    db.commit()
    return jsonify(message="信息已确认")


def public_user(u):
    return {"id": u["id"], "username": u["username"], "name": u["name"],
            "role": u["role"], "studentNo": u["student_no"],
            "gender": u["gender"], "birthday": u["birthday"],
            "avatar": u["avatar"], "dormitory": u["dormitory"],
            "address": u["address"], "confirmed": bool(u["confirmed"]),
            "score": u["score"]}
