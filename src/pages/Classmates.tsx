// 同学页：班级成员列表（原站"同学"tab）
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MessageCircle } from "lucide-react"
import { api } from "../api"
import { Card, Empty, Page, useAuth } from "../ui"

interface UserLite {
  id: number; name: string; username: string; role: string
  student_no: string; gender: string; score: number
}

export default function Classmates() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [users, setUsers] = useState<UserLite[]>([])

  useEffect(() => {
    api.get("/api/users").then(r => setUsers(r.users)).catch(() => {})
  }, [])

  const students = users.filter(u => u.role === "student")
  const teachers = users.filter(u => u.role === "teacher")

  return (
    <Page title="同学">
      {teachers.length > 0 && (
        <>
          <div className="section-title">老师</div>
          <Card>
            {teachers.map(t => (
              <div key={t.id} className="row-item">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="avatar" style={{ background: "var(--primary)" }}>{t.name.slice(0, 1)}</div>
                  <div>
                    <div><b>{t.name}</b> <small className="muted">班主任</small></div>
                  </div>
                </div>
                {t.id !== user?.id && (
                  <button className="btn btn-small btn-plain" onClick={() => nav(`/dm/${t.id}`)}>
                    <MessageCircle size={13} style={{ verticalAlign: -2 }} /> 私信
                  </button>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      <div className="section-title">同学（{students.length}）</div>
      {students.length === 0 && <Empty />}
      <Card>
        {students.map(s => (
          <div key={s.id} className="row-item">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="avatar" style={{ background: s.gender === "女" ? "var(--warn)" : "var(--ok)" }}>
                {s.name.slice(0, 1)}
              </div>
              <div>
                <div><b>{s.name}</b> <small className="muted">{s.student_no && `No.${s.student_no}`}</small></div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {s.gender || "—"} · 操行分 {s.score}
                </div>
              </div>
            </div>
            {s.id !== user?.id && (
              <button className="btn btn-small btn-plain" onClick={() => nav(`/dm/${s.id}`)}>
                <MessageCircle size={13} style={{ verticalAlign: -2 }} /> 私信
              </button>
            )}
          </div>
        ))}
      </Card>
    </Page>
  )
}
