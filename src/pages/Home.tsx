// 首页：模块宫格 + 最新通知 + 生日提醒
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  CalendarDays, ClipboardList, Star, Megaphone, Paintbrush, Armchair, Cake,
  ClipboardCheck, Users, FileText, Coins, MoonStar, MessagesSquare, Mail,
  UserPlus, UserCog, LayoutDashboard,
} from "lucide-react"
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
    { Icon: CalendarDays, name: "课程表", to: "/course" },
    { Icon: ClipboardList, name: "作业", to: "/homework" },
    { Icon: Star, name: "操行分", to: "/conduct" },
    { Icon: Megaphone, name: "通知公告", to: "/notice" },
    { Icon: Paintbrush, name: "值日表", to: "/duty" },
    { Icon: Armchair, name: "座位表", to: "/seat" },
    { Icon: Cake, name: "生日", to: "/birthday" },
    { Icon: ClipboardCheck, name: "项目报名", to: "/project" },
    { Icon: Users, name: "小组", to: "/group" },
    { Icon: FileText, name: "请假", to: "/leave" },
    { Icon: Coins, name: "班费", to: "/fund" },
    { Icon: MoonStar, name: "晚自习报备", to: "/report" },
    { Icon: MessagesSquare, name: "论坛", to: "/forum" },
    { Icon: Mail, name: "私信", to: "/dm" },
    { Icon: UserPlus, name: "好友", to: "/friends" },
    ...(isTeacher(user) ? [
      { Icon: UserCog, name: "账号管理", to: "/users" },
      { Icon: LayoutDashboard, name: "管理后台", to: "/admin" },
    ] : []),
  ]

  return (
    <Page title="计应1班">
      {todayBd.length > 0 && (
        <Card>
          今天生日：<b>{todayBd.map(b => b.name).join("、")}</b>，祝生日快乐！
        </Card>
      )}

      <div className="section-title">应用入口</div>
      <div className="grid">
        {modules.map(({ Icon, name, to }) => (
          <div key={to} className="grid-item" onClick={() => nav(to)}>
            <span className="gi-icon"><Icon size={24} strokeWidth={1.8} /></span>
            <span className="gi-name">{name}</span>
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
