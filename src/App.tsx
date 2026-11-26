import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom"
import { Home as HomeIcon, CalendarDays, ClipboardList, MessagesSquare, User } from "lucide-react"
import { getToken } from "./api"
import { AuthProvider, useAuth, ToastHost } from "./ui"
import Login, { Confirm } from "./pages/Login"
import Home from "./pages/Home"
import Course from "./pages/Course"
import Homework, { HomeworkDetail } from "./pages/Homework"
import Conduct from "./pages/Conduct"
import { Duty, Seat, Birthday, Notice, NoticeDetail } from "./pages/Daily"
import { Project, Group, Leave, Fund, Report } from "./pages/Activity"
import { Forum, ForumDetail, DMList, DMChat, Friends } from "./pages/Social"
import { Profile, UsersManage } from "./pages/Profile"
import { AdminShell } from "./admin/Admin"

function TeacherGuard({ children }: { children: React.ReactElement }) {
  const { user } = useAuth()
  if (!getToken()) return <Navigate to="/login" replace />
  if (!user) return null
  if (user.role !== "teacher") return <Navigate to="/" replace />
  return children
}

function Guard({ children }: { children: React.ReactElement }) {
  const { user } = useAuth()
  if (!getToken()) return <Navigate to="/login" replace />
  if (!user) return null // 等待 /me 返回
  return children
}

function TabBar() {
  const loc = useLocation()
  const tabs = [
    { to: "/", Icon: HomeIcon, name: "首页" },
    { to: "/course", Icon: CalendarDays, name: "课表" },
    { to: "/homework", Icon: ClipboardList, name: "作业" },
    { to: "/forum", Icon: MessagesSquare, name: "论坛" },
    { to: "/profile", Icon: User, name: "我的" },
  ]
  if (loc.pathname.startsWith("/dm") || loc.pathname.startsWith("/login") ||
      loc.pathname.startsWith("/confirm")) return null
  return (
    <nav className="tabbar">
      {tabs.map(({ to, Icon, name }) => (
        <NavLink key={to} to={to} end={to === "/"}
          className={to === "/" ? (loc.pathname === "/" ? "active" : "")
            : (loc.pathname.startsWith(to) ? "active" : "")}>
          <span className="tab-icon"><Icon size={20} strokeWidth={2} /></span>{name}
        </NavLink>
      ))}
    </nav>
  )
}

function HomeworkDetailWrapper() {
  const id = Number(window.location.pathname.split("/").pop())
  return <HomeworkDetail id={id} />
}

function Shell() {
  const { refresh } = useAuth()
  const loc = useLocation()
  useEffect(() => { if (getToken()) refresh() }, [])
  // 管理后台走独立的宽屏外壳
  if (loc.pathname.startsWith("/admin")) {
    return (
      <Routes>
        <Route path="/admin/*" element={<TeacherGuard><AdminShell /></TeacherGuard>} />
      </Routes>
    )
  }
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/confirm" element={<Guard><Confirm /></Guard>} />
        <Route path="/" element={<Guard><Home /></Guard>} />
        <Route path="/course" element={<Guard><Course /></Guard>} />
        <Route path="/homework" element={<Guard><Homework /></Guard>} />
        <Route path="/homework/:id" element={<Guard><HomeworkDetailWrapper /></Guard>} />
        <Route path="/conduct" element={<Guard><Conduct /></Guard>} />
        <Route path="/duty" element={<Guard><Duty /></Guard>} />
        <Route path="/seat" element={<Guard><Seat /></Guard>} />
        <Route path="/birthday" element={<Guard><Birthday /></Guard>} />
        <Route path="/notice" element={<Guard><Notice /></Guard>} />
        <Route path="/notice/:id" element={<Guard><NoticeDetail /></Guard>} />
        <Route path="/project" element={<Guard><Project /></Guard>} />
        <Route path="/group" element={<Guard><Group /></Guard>} />
        <Route path="/leave" element={<Guard><Leave /></Guard>} />
        <Route path="/fund" element={<Guard><Fund /></Guard>} />
        <Route path="/report" element={<Guard><Report /></Guard>} />
        <Route path="/forum" element={<Guard><Forum /></Guard>} />
        <Route path="/forum/:id" element={<Guard><ForumDetail /></Guard>} />
        <Route path="/dm" element={<Guard><DMList /></Guard>} />
        <Route path="/dm/:peerId" element={<Guard><DMChat /></Guard>} />
        <Route path="/friends" element={<Guard><Friends /></Guard>} />
        <Route path="/profile" element={<Guard><Profile /></Guard>} />
        <Route path="/users" element={<Guard><UsersManage /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TabBar />
    </div>
  )
}
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastHost />
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  )
}
