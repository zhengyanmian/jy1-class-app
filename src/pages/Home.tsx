// 首页（HomePanel）：问候 + 今日课程状态 + 今日作业 + 最新通知（对齐原站信息架构）
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BookOpen, ClipboardList, Megaphone } from "lucide-react"
import { api } from "../api"
import { Card, Empty, fmtTime, Page, useAuth } from "../ui"

interface Notice { id: number; title: string; content: string; by_name: string; created_at: string }
interface Birthday { id: number; name: string; birthday: string }
interface Course { id: number; day: number; period: number; name: string; teacher: string; room: string }
interface Homework { id: number; title: string; subject: string; due_date: string; done_count: number }

const DAY_CN = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

export default function Home() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [notices, setNotices] = useState<Notice[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [homework, setHomework] = useState<Homework[]>([])

  useEffect(() => {
    api.get("/api/notices").then(r => setNotices(r.notices)).catch(() => {})
    api.get("/api/birthdays").then(r => setBirthdays(r.birthdays)).catch(() => {})
    api.get("/api/courses").then(r => setCourses(r.courses)).catch(() => {})
    api.get("/api/homework").then(r => setHomework(r.homework)).catch(() => {})
  }, [])

  const now = new Date()
  const todayBd = birthdays.filter(b => b.birthday.slice(-5) ===
    `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`)

  // 今日课程（day: 1=周一 … 7=周日）
  const todayDay = ((now.getDay() + 6) % 7) + 1
  const todayCourses = courses.filter(c => c.day === todayDay).sort((a, b) => a.period - b.period)
  const h = now.getHours()
  const currentPeriod = h >= 8 && h < 12 ? h - 7 : h >= 14 && h < 18 ? h - 10 : 0
  const inClass = currentPeriod ? todayCourses.find(c => c.period === currentPeriod) : undefined
  const nextCourse = currentPeriod ? todayCourses.find(c => c.period > currentPeriod) : todayCourses[0]
  const courseState = todayCourses.length === 0
    ? { tag: "无课", text: "今天没有安排课程" }
    : inClass
      ? { tag: "上课中", text: `第 ${inClass.period} 节 · ${inClass.name}${inClass.room ? ` @ ${inClass.room}` : ""}` }
      : nextCourse
        ? { tag: "待上课", text: `下一节：第 ${nextCourse.period} 节 · ${nextCourse.name}` }
        : { tag: "已放学", text: "今天课程已结束" }

  return (
    <Page title="计应1班">
      {/* 问候横幅 */}
      <div className="hero">
        <div className="hero-title">{h < 12 ? "上午好" : h < 18 ? "下午好" : "晚上好"}，{user?.name || "同学"}</div>
        <div className="hero-sub">
          {todayBd.length > 0 && <>今天 {todayBd.map(b => b.name).join("、")} 过生日，祝生日快乐！</>}
          {todayBd.length === 0 && <>今天是{DAY_CN[now.getDay()]}，{courseState.text}</>}
        </div>
        <div className="hero-date">
          {now.getFullYear()} 年 {now.getMonth() + 1} 月 {now.getDate()} 日 · {DAY_CN[now.getDay()]}
        </div>
      </div>

      {/* 今日课程状态卡 */}
      <div className="today-card">
        <div className="today-head">
          <BookOpen size={16} />
          <span>今日课程 · {courseState.tag}</span>
          <span className="today-count">{todayCourses.length} 节</span>
        </div>
        {todayCourses.length === 0 ? (
          <div className="today-empty">今天没有安排课程</div>
        ) : (
          <div className="today-list">
            {todayCourses.map(c => (
              <div key={c.id} className={`today-item ${inClass === c ? "on" : ""}`}>
                <span className="today-period">第{c.period}节</span>
                <span className="today-name">{c.name}</span>
                <span className="today-room">{c.room || ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最新作业 */}
      <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <ClipboardList size={15} style={{ color: "var(--primary)" }} />最新作业
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-2)", fontWeight: 400, cursor: "pointer" }}
          onClick={() => nav("/homework")}>全部 ›</span>
      </div>
      {homework.length === 0 && <Empty text="暂无作业" />}
      {homework.slice(0, 2).map(h_ => (
        <Card key={h_.id} onClick={() => nav(`/homework/${h_.id}`)}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>{h_.title}</b>
            <small style={{ color: "var(--text-2)" }}>已交 {h_.done_count} 人</small>
          </div>
          {h_.due_date && <div style={{ color: "var(--text-2)", fontSize: 12, marginTop: 4 }}>截止 {h_.due_date}</div>}
        </Card>
      ))}

      {/* 最新通知 */}
      <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Megaphone size={15} style={{ color: "var(--primary)" }} />最新通知
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-2)", fontWeight: 400, cursor: "pointer" }}
          onClick={() => nav("/notice")}>全部 ›</span>
      </div>
      {notices.length === 0 && <Empty text="暂无通知" />}
      {notices.slice(0, 3).map(n => (
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
