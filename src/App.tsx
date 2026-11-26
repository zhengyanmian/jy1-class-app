import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom"
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

function Guard({ children }: { children: React.ReactElement }) {
  const { user } = useAuth()
  if (!getToken()) return <Navigate to="/login" replace />
  if (!user) return null // 等待 /me 返回
  return children
}

function TabBar() {
  const loc = useLocation()
  const tabs = [
    { to: "/", icon: "🏠", name: "首页" },
    { to: "/course", icon: "📅", name: "课表" },
    { to: "/homework", icon: "📝", name: "作业" },
    { to: "/forum", icon: "💬", name: "论坛" },
    { to: "/profile", icon: "👤", name: "我的" },
  ]
  if (loc.pathname.startsWith("/dm") || loc.pathname.startsWith("/login") ||
      loc.pathname.startsWith("/confirm")) return null
  return (
    <nav className="tabbar">
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === "/"}
          className={t.to === "/" ? (loc.pathname === "/" ? "active" : "")
            : (loc.pathname.startsWith(t.to) ? "active" : "")}>
          <span className="tab-icon">{t.icon}</span>{t.name}
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
  useEffect(() => { if (getToken()) refresh() }, [])
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
