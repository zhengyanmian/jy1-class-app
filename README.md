# 计应1班 · 班级应用

自研班级管理应用（对标 jy.bj.puut.cn 的计应2班应用），移动端优先的 Web App，Flask + SQLite 后端自托管。

## 功能模块

- **账号体系**：老师分配账号登录、首次信息确认、老师重置密码
- **课程表**：全员查看，老师在线编辑
- **作业**：老师布置、学生提交、提交情况/缺交名单
- **操行分**：加分扣分记录、月度排行、全员公示
- **通知公告**：老师发布，全员查看
- **值日表 / 座位表 / 生日一览**
- **项目报名**：名额限制、报名名单
- **小组管理**：分组、组长指定
- **请假**：学生申请、老师审批
- **班费**：收支记账、余额统计、申请审批
- **晚自习报备**：按日报备（在校/住校/去向地址）、老师按日查看
- **班级论坛 / 私信 / 好友**

## 技术栈

- 前端：React 19 + TypeScript + Vite + React Router（移动端优先布局）
- 后端：Flask + SQLite + JWT（`server/`）

## 本地开发

```bash
# 后端（端口 5000，首次启动自动创建默认老师账号 admin/admin123）
cd server
pip install -r requirements.txt
python app.py

# 前端
npm install
npm run dev        # 开发模式（代理到 localhost:5000）
npm run build      # 构建产物输出到 dist/，由 Flask 静态托管
```

## 部署

```bash
npm run build
# 服务器上：
cd server && gunicorn -w 2 -b 0.0.0.0:5000 app:app
```

⚠️ 生产环境请立即修改默认管理员密码，并设置环境变量 `CLASSAPP_JWT`（JWT 密钥）与 `CLASSAPP_DB`（数据库路径）。

## 更新日志

- **v0.1**：全模块骨架 + 核心功能闭环，31 项 API 冒烟测试通过
