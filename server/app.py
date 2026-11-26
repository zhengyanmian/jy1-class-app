"""计应1班班级应用 · Flask 后端入口"""
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from db import init_db, get_db
from auth import auth_bp
from routes_main import api as api_main
from routes_extra import api as api_extra
from routes_social import api as api_social
from routes_admin import admin_bp

app = Flask(__name__, static_folder="../dist", static_url_path="")
CORS(app, supports_credentials=True)

app.register_blueprint(auth_bp)
app.register_blueprint(api_main)
app.register_blueprint(api_extra)
app.register_blueprint(api_social)
app.register_blueprint(admin_bp)


@app.errorhandler(404)
def not_found(_):
    # SPA 兜底：非 /api 路径返回前端入口
    return send_from_directory("../dist", "index.html")


@app.errorhandler(Exception)
def on_error(e):
    return jsonify(error=str(e)), 500


init_db()


def ensure_default_teacher():
    """首次启动：创建默认老师账号 admin/admin123（生产环境请立即改密码）"""
    db = get_db()
    if not db.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        from werkzeug.security import generate_password_hash
        db.execute(
            "INSERT INTO users (username, password_hash, name, role, confirmed) "
            "VALUES ('admin', ?, '班主任', 'teacher', 1)",
            (generate_password_hash("admin123"),))
        db.commit()


ensure_default_teacher()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
