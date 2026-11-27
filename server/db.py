"""数据库层：SQLite 连接与表结构初始化"""
import sqlite3
import os
from pathlib import Path

DB_PATH = Path(os.environ.get("CLASSAPP_DB", Path(__file__).parent / "class.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',       -- teacher / student
  student_no TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  birthday TEXT DEFAULT '',                   -- MM-DD 或 YYYY-MM-DD
  avatar TEXT DEFAULT '',
  dormitory TEXT DEFAULT '',                  -- 住宿信息
  address TEXT DEFAULT '',                    -- 报备联系地址
  confirmed INTEGER DEFAULT 0,                -- 信息是否已确认
  score REAL DEFAULT 0,                       -- 当前操行分（冗余汇总）
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day INTEGER NOT NULL,                       -- 1-7 周一到周日
  period INTEGER NOT NULL,                    -- 节次
  name TEXT NOT NULL,
  teacher TEXT DEFAULT '',
  room TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS homework (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT DEFAULT '',
  content TEXT DEFAULT '',
  due_date TEXT DEFAULT '',                   -- 截止时间 YYYY-MM-DD HH:MM
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homework_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'done',                 -- done / missing
  content TEXT DEFAULT '',
  submitted_at TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(homework_id, user_id)
);
CREATE TABLE IF NOT EXISTS conduct (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  points REAL NOT NULL,                       -- 正加分负扣分
  reason TEXT NOT NULL,
  by_user INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  by_user INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS duty (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day INTEGER NOT NULL,                       -- 1-7
  user_id INTEGER NOT NULL,
  task TEXT DEFAULT ''                        -- 扫地/拖地/倒垃圾...
);
CREATE TABLE IF NOT EXISTS seats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row_no INTEGER NOT NULL,
  col_no INTEGER NOT NULL,
  user_id INTEGER,
  UNIQUE(row_no, col_no)
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  quota INTEGER DEFAULT 0,                    -- 人数上限 0=不限
  status TEXT DEFAULT 'open',                 -- open / closed
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS project_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(project_id, user_id)
);
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  leader_id INTEGER
);
CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  UNIQUE(group_id, user_id)
);
CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT DEFAULT '',
  type TEXT DEFAULT '事假',                   -- 病假 / 事假 / 离校
  status TEXT DEFAULT 'pending',              -- pending / approved / rejected
  reviewed_by INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS fund_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                         -- income / expense
  amount REAL NOT NULL,
  item TEXT DEFAULT '',
  note TEXT DEFAULT '',
  by_user INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS fund_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  reviewed_by INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id INTEGER NOT NULL,
  to_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS friend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id INTEGER NOT NULL,
  to_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',              -- pending / accepted / rejected
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS reports (          -- 晚自习报备
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,                         -- YYYY-MM-DD
  kind TEXT DEFAULT 'normal',                 -- normal / boarder(住校) / address
  address TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(user_id, date)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);
"""


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _migrate(conn: sqlite3.Connection):
    """存量库升级：leaves 增加 type 列（病假/事假/离校）"""
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(leaves)").fetchall()}
    if "type" not in cols:
        conn.execute("ALTER TABLE leaves ADD COLUMN type TEXT DEFAULT '事假'")


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA)
    _migrate(conn)
    conn.commit()
    conn.close()
