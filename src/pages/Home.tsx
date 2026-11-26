// 首页：模块宫格 + 最新通知 + 生日提醒
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api"
import { Card, Empty, fmtTime, isTeacher, Page, useAuth } from "../ui"

interface Notice { id: number; title: string; content: string; by_name: string; created_at: string }
interface Birthday { id: number; name: string; birthday: string }

const TODAY = new Date()
const MD = `${String(TODAY.getMonth() + 1).padStart(2, "0")}-${String(TODAY.getDate()).padStart(2, "0")}`

export default function Home() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [notices, setNotices] = useState<Notice[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])

  useEffect(() => {
    api.get("/api/notices").then(r => setNotices(r.notices)).catch(() => {})
    api.get("/api/birthdays").then(r => setBirthdays(r.birthdays)).catch(() => {})
  }, [])

  const todayBd = birthdays.filter(b => b.birthday.slice(-5) === MD)

  const modules = [
    { icon: "📅", name: "课程表", to: "/course" },
    { icon: "📝", name: "作业", to: "/homework" },
    { icon: "⭐", name: "操行分", to: "/conduct" },
    { icon: "📢", name: "通知公告", to: "/notice" },
    { icon: "🧹", name: "值日表", to: "/duty" },
    { icon: "💺", name: "座位表", to: "/seat" },
    { icon: "🎂", name: "生日", to: "/birthday" },
    { icon: "📦", name: "项目报名", to: "/project" },
    { icon: "👥", name: "小组", to: "/group" },
    { icon: "🧾", name: "请假", to: "/leave" },
    { icon: "💰", name: "班费", to: "/fund" },
    { icon: "🌙", name: "晚自习报备", to: "/report" },
    { icon: "💬", name: "论坛", to: "/forum" },
    { icon: "✉️", name: "私信", to: "/dm" },
    { icon: "🤝", name: "好友", to: "/friends" },
    ...(isTeacher(user) ? [{ icon: "👤", name: "账号管理", to: "/users" }] : []),
  ]

  return (
    <Page title="计应1班">
      {todayBd.length > 0 && (
        <Card className="bd-card" >
          🎉 今天生日：<b>{todayBd.map(b => b.name).join("、")}</b>，祝生日快乐！
        </Card>
      )}

      <div className="section-title">应用入口</div>
      <div className="grid">
        {modules.map(m => (
          <div key={m.to} className="grid-item" onClick={() => nav(m.to)}>
            <span className="gi-icon">{m.icon}</span>
            <span className="gi-name">{m.name}</span>
          </div>
        ))}
      </div>

      <div className="section-title" style={{ marginTop: 16 }}>最新通知</div>
      {notices.length === 0 && <Empty text="暂无通知" />}
      {notices.slice(0, 5).map(n => (
        <Card key={n.id} onClick={() => nav(`/notice/${n.id}`)}>
          <div style={{ fontWeight: 600 }}>{n.title}</div>
          <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {n.content}
          </div>
          <div style={{ color: "var(--text-2)", fontSize: 11, marginTop: 6 }}>
            {n.by_name} · {fmtTime(n.created_at)}
          </div>
        </Card>
      ))}
    </Page>
  )
}
