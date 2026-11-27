// 功能页：全部模块宫格（原站"功能"tab）
import { useNavigate } from "react-router-dom"
import {
  CalendarDays, ClipboardList, Star, Megaphone, Paintbrush, Armchair, Cake,
  ClipboardCheck, Users, FileText, Coins, MoonStar, UserCog, LayoutDashboard,
} from "lucide-react"
import { Page, useAuth } from "../ui"

export default function Apps() {
  const { user } = useAuth()
  const nav = useNavigate()

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
    ...(user?.role === "teacher" ? [
      { Icon: UserCog, name: "账号管理", to: "/users" },
      { Icon: LayoutDashboard, name: "管理后台", to: "/admin" },
    ] : []),
  ]

  return (
    <Page title="功能">
      <div className="grid">
        {modules.map(({ Icon, name, to }) => (
          <div key={to} className="grid-item" onClick={() => nav(to)}>
            <span className="gi-icon"><Icon size={24} strokeWidth={1.8} /></span>
            <span className="gi-name">{name}</span>
          </div>
        ))}
      </div>
    </Page>
  )
}
