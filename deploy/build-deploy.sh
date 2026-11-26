#!/usr/bin/env bash
# 计应1班班级应用 · 一键部署到 club-server (1.14.124.213:39500)
# 用法：在仓库根目录执行  bash deploy/build-deploy.sh
set -euo pipefail

HOST="club-server"          # ~/.ssh/config 中的主机别名
REMOTE_DIR="/opt/class-app"
PORT=39500

cd "$(dirname "$0")/.."     # 仓库根目录

echo "==> [1/5] 构建前端"
npm run build

echo "==> [2/5] 打包上传"
tar czf /tmp/classapp.tar.gz -C . server/app.py server/db.py server/auth.py \
    server/routes_main.py server/routes_extra.py server/routes_social.py \
    server/requirements.txt dist
scp -q /tmp/classapp.tar.gz "$HOST:/tmp/"

echo "==> [3/5] 服务器安装依赖"
ssh "$HOST" "mkdir -p $REMOTE_DIR/data && tar xzf /tmp/classapp.tar.gz -C $REMOTE_DIR &&
  cd $REMOTE_DIR && python3 -m venv venv 2>/dev/null || true &&
  ./venv/bin/pip install -q -r server/requirements.txt"

echo "==> [4/5] 生成/更新 systemd 服务"
JWT_SECRET=$(ssh "$HOST" "test -f $REMOTE_DIR/.env && grep CLASSAPP_JWT $REMOTE_DIR/.env | cut -d= -f2 || openssl rand -hex 32")
ssh "$HOST" "echo CLASSAPP_JWT=$JWT_SECRET > $REMOTE_DIR/.env &&
  chmod 600 $REMOTE_DIR/.env && cat > /etc/systemd/system/classapp.service <<UNIT
[Unit]
Description=JY1 Class App (Flask)
After=network.target

[Service]
WorkingDirectory=$REMOTE_DIR/server
EnvironmentFile=$REMOTE_DIR/.env
Environment=CLASSAPP_DB=$REMOTE_DIR/data/class.db
ExecStart=$REMOTE_DIR/venv/bin/gunicorn -w 2 -b 0.0.0.0:$PORT app:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload && systemctl enable --now classapp && systemctl restart classapp"

echo "==> [5/5] 健康检查"
sleep 2
ssh "$HOST" "curl -sf http://127.0.0.1:$PORT/ -o /dev/null && echo '服务已在服务器内启动' &&
  curl -sf -X POST http://127.0.0.1:$PORT/api/auth/login -H 'Content-Type: application/json' \
    -d '{\"username\":\"admin\",\"password\":\"admin123\"}' -o /dev/null && echo '登录接口正常'"

echo "==> 完成：http://1.14.124.213:$PORT  （手机浏览器/APK 直接访问）"
