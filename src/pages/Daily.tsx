// 值日表 / 座位表 / 生日 / 通知公告
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../api"
import { Badge, Btn, Card, Empty, Field, Modal, Page, dayName, isTeacher, toast, errToast, useAuth, fmtTime } from "../ui"

// ---------- 值日 ----------
interface Duty { id: number; day: number; user_id: number; user_name: string; task: string }
interface UserLite { id: number; name: string; role: string }

export function Duty() {
  const { user } = useAuth()
  const [duty, setDuty] = useState<Duty[]>([])
  const [users, setUsers] = useState<UserLite[]>([])
  const [edit, setEdit] = useState<number | null>(null)

  const load = () => api.get("/api/duty").then(r => setDuty(r.duty)).catch(errToast)
  useEffect(() => {
    load()
    api.get("/api/users").then(r => setUsers(r.users.filter((u: any) => u.role === "student"))).catch(() => {})
  }, [])

  const today = ((new Date().getDay() + 6) % 7) + 1
  const todayDuty = duty.filter(d => d.day === today)

  return (
    <Page title="值日表">
      {todayDuty.length > 0 && (
        <Card>🧹 今天值日：<b>{todayDuty.map(d => `${d.user_name}${d.task ? `(${d.task})` : ""}`).join("、")}</b></Card>
      )}
      <Card>
        {Array.from({ length: 7 }, (_, i) => i + 1).map(day => {
          const items = duty.filter(d => d.day === day)
          return (
            <div key={day} className="row-item"
              onClick={() => isTeacher(user) && setEdit(day)}>
              <b style={day === today ? { color: "var(--primary)" } : undefined}>{dayName(day)}</b>
              <span style={{ color: "var(--text-2)" }}>
                {items.map(d => d.user_name).join("、") || "—"}
              </span>
            </div>
          )
        })}
      </Card>
      {isTeacher(user) && <div style={{ fontSize: 12, color: "var(--text-2)" }}>点击某天可编辑值日安排</div>}

      {edit !== null && (
        <Modal title={`编辑 ${dayName(edit)} 值日`} onClose={() => setEdit(null)}>
          <DutyEdit day={edit} duty={duty} users={users}
            onDone={() => { setEdit(null); load(); toast("已保存") }} />
        </Modal>
      )}
    </Page>
  )
}

function DutyEdit({ day, duty, users, onDone }: { day: number; duty: Duty[]; users: UserLite[]; onDone: () => void }) {
  const cur = duty.filter(d => d.day === day)
  const [rows, setRows] = useState(cur.length ? cur.map(d => ({ userId: d.user_id, task: d.task })) : [{ userId: 0, task: "" }])
  async function save() {
    try {
      await api.put("/api/duty", { day, items: rows.filter(r => r.userId) })
      onDone()
    } catch (e) { errToast(e) }
  }
  return (
    <>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select className="field-input" value={r.userId}
            onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, userId: Number(e.target.value) } : x))}>
            <option value={0}>选择同学…</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input className="field-input" style={{ flex: 1 }} placeholder="任务(如扫地)"
            value={r.task} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, task: e.target.value } : x))} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn type="plain" onClick={() => setRows([...rows, { userId: 0, task: "" }])}>+ 加一人</Btn>
        <Btn onClick={save}>保存</Btn>
      </div>
    </>
  )
}

// ---------- 座位表 ----------
interface Seat { id: number; row_no: number; col_no: number; user_id: number | null; user_name: string }

export function Seat() {
  const { user } = useAuth()
  const [seats, setSeats] = useState<Seat[]>([])
  const [users, setUsers] = useState<UserLite[]>([])
  const [rows, setRows] = useState(6)
  const [cols, setCols] = useState(6)
  const [edit, setEdit] = useState(false)

  const load = () => api.get("/api/seats").then(r => setSeats(r.seats)).catch(errToast)
  useEffect(() => {
    load()
    api.get("/api/users").then(r => setUsers(r.users.filter((u: any) => u.role === "student"))).catch(() => {})
  }, [])

  const find = (r: number, c: number) => seats.find(s => s.row_no === r && s.col_no === c)

  function save(cells: { row: number; col: number; userId: number | null }[]) {
    api.put("/api/seats", { cells })
      .then(() => { load(); toast("已保存"); setEdit(false) })
      .catch(errToast)
  }

  function seatClick(r: number, c: number) {
    if (!isTeacher(user) || !edit) return
    const names = users.map(u => u.name)
    const input = prompt("输入姓名（空=清空）：", names[0] || "")
    if (input === null) return
    const u = users.find(x => x.name === input)
    save([{ row: r, col: c, userId: u ? u.id : null }])
  }

  return (
    <Page title="座位表" right={isTeacher(user) ? (
      <button className="btn btn-small" onClick={() => setEdit(!edit)}>{edit ? "退出编辑" : "编辑"}</button>
    ) : undefined}>
      <div className="card" style={{ maxWidth: 420, margin: "0 auto 12px" }}>
        <div style={{ textAlign: "center", color: "var(--text-2)", fontSize: 12, marginBottom: 8 }}>讲 台</div>
        <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: rows * cols }, (_, i) => {
            const r = Math.floor(i / cols) + 1, c = (i % cols) + 1
            const s = find(r, c)
            return (
              <div key={i} className={`seat ${s?.user_id ? "occupied" : ""}`}
                onClick={() => seatClick(r, c)}>
                {s?.user_name || "空"}
              </div>
            )
          })}
        </div>
      </div>
      {isTeacher(user) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          行 <input className="field-input" type="number" style={{ width: 60 }} value={rows}
            onChange={e => setRows(Math.max(1, Math.min(12, Number(e.target.value))))} />
          列 <input className="field-input" type="number" style={{ width: 60 }} value={cols}
            onChange={e => setCols(Math.max(1, Math.min(10, Number(e.target.value))))} />
        </div>
      )}
    </Page>
  )
}

// ---------- 生日 ----------
export function Birthday() {
  const [list, setList] = useState<any[]>([])
  useEffect(() => {
    api.get("/api/birthdays").then(r => setList(r.birthdays)).catch(errToast)
  }, [])
  const todayMD = `${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`
  return (
    <Page title="生日一览">
      <Card>
        {list.length === 0 && <Empty text="还没有人登记生日" />}
        {list.map(b => {
          const md = b.birthday.slice(-5)
          return (
            <div key={b.id} className="row-item">
              <div>
                <b>{b.name}</b> <small style={{ color: "var(--text-2)" }}>{b.student_no}</small>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {md === todayMD && <Badge type="warn">今天🎂</Badge>}
                <span>{b.birthday}</span>
              </div>
            </div>
          )
        })}
      </Card>
    </Page>
  )
}

// ---------- 通知 ----------
interface Notice { id: number; title: string; content: string; by_name: string; created_at: string }

export function Notice() {
  const { user } = useAuth()
  const [list, setList] = useState<Notice[]>([])
  const [addModal, setAddModal] = useState(false)
  const nav = useNavigate()
  const load = () => api.get("/api/notices").then(r => setList(r.notices)).catch(errToast)
  useEffect(() => { load() }, [])
  return (
    <Page title="通知公告" right={isTeacher(user) ? (
      <button className="btn btn-small btn-primary" onClick={() => setAddModal(true)}>发布</button>
    ) : undefined}>
      {list.length === 0 && <Empty text="暂无通知" />}
      {list.map(n => (
        <Card key={n.id} onClick={() => nav(`/notice/${n.id}`)}>
          <div style={{ fontWeight: 600 }}>{n.title}</div>
          <div style={{ color: "var(--text-2)", fontSize: 12, marginTop: 4 }}>
            {n.by_name} · {fmtTime(n.created_at)}
          </div>
        </Card>
      ))}
      {addModal && (
        <Modal title="发布通知" onClose={() => setAddModal(false)}>
          <NoticeForm onDone={() => { setAddModal(false); load(); toast("已发布") }} />
        </Modal>
      )}
    </Page>
  )
}

export function NoticeDetail() {
  const { id } = useParams()
  const [n, setN] = useState<Notice | null>(null)
  useEffect(() => {
    api.get("/api/notices").then(r => setN(r.notices.find((x: Notice) => x.id === Number(id)) || null)).catch(errToast)
  }, [id])
  const nav = useNavigate()
  return (
    <Page title="通知详情" onBack={() => nav(-1)}>
      {n ? (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{n.title}</div>
          <div style={{ color: "var(--text-2)", fontSize: 12, margin: "6px 0 12px" }}>
            {n.by_name} · {fmtTime(n.created_at)}
          </div>
          <div style={{ whiteSpace: "pre-wrap" }}>{n.content}</div>
        </Card>
      ) : <Empty />}
    </Page>
  )
}

function NoticeForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  async function save() {
    if (!title) return toast("请输入标题")
    try { await api.post("/api/notices", { title, content }); onDone() }
    catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="标题" value={title} onChange={e => setTitle(e.target.value)} />
      <Field label="内容" value={content} onChange={e => setContent(e.target.value)} />
      <Btn onClick={save}>发布</Btn>
    </>
  )
}
