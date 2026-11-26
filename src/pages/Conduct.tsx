// 操行分：我的记录 / 月度排行 / 公示 / 老师加减分
import { useEffect, useState } from "react"
import { api } from "../api"
import { Btn, Card, Empty, Field, fmtTime, isTeacher, Modal, Page, toast, errToast, useAuth } from "../ui"

interface Record { id: number; user_id: number; user_name: string; by_name: string; points: number; reason: string; created_at: string }
interface Rank { id: number; name: string; student_no: string; total: number; all_total: number }
interface UserLite { id: number; name: string; student_no: string; role: string }

export default function Conduct() {
  const { user } = useAuth()
  const [tab, setTab] = useState<"mine" | "rank" | "all">("mine")
  const [records, setRecords] = useState<Record[]>([])
  const [rank, setRank] = useState<Rank[]>([])
  const [addModal, setAddModal] = useState(false)
  const teacher = isTeacher(user)

  const load = () => {
    if (tab === "mine") api.get("/api/conduct").then(r => setRecords(r.records)).catch(errToast)
    if (tab === "rank" || tab === "all")
      api.get("/api/conduct/month").then(r => setRank(r.rank)).catch(errToast)
    if (tab === "all") api.get("/api/conduct/all").then(r => setRecords(r.records)).catch(() => {})
  }
  useEffect(() => { load() }, [tab])

  return (
    <Page title="操行分" right={teacher
      ? <button className="btn btn-small btn-primary" onClick={() => setAddModal(true)}>加分/扣分</button>
      : undefined}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {([["mine", "我的记录"], ["rank", "月度排行"], ["all", "全员公示"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`btn btn-small ${tab === k ? "btn-primary" : "btn-plain"}`}>{label}</button>
        ))}
      </div>

      {tab === "mine" && (
        records.length === 0 ? <Empty text="暂无记录，继续保持" /> :
        <Card>
          {records.map(r => (
            <div key={r.id} className="row-item">
              <div>
                <div>{r.reason || "—"}</div>
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>{r.by_name} · {fmtTime(r.created_at)}</div>
              </div>
              <b style={{ color: r.points >= 0 ? "var(--ok)" : "var(--danger)" }}>
                {r.points >= 0 ? `+${r.points}` : r.points}
              </b>
            </div>
          ))}
        </Card>
      )}

      {tab === "rank" && (
        <Card>
          {rank.map((r, i) => (
            <div key={r.id} className="row-item">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 24, fontWeight: 700, color: i < 3 ? "var(--warn)" : "var(--text-2)" }}>
                  {i + 1}
                </span>
                <span>{r.name}{r.student_no && <small style={{ color: "var(--text-2)" }}> ({r.student_no})</small>}</span>
              </div>
              <b style={{ color: r.total >= 0 ? "var(--ok)" : "var(--danger)" }}>
                本月 {r.total >= 0 ? `+${r.total}` : r.total} · 总 {r.all_total}
              </b>
            </div>
          ))}
        </Card>
      )}

      {tab === "all" && (
        records.length === 0 ? <Empty /> :
        <Card>
          {records.map(r => (
            <div key={r.id} className="row-item">
              <div>
                <div><b>{r.user_name}</b> · {r.reason || "—"}</div>
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>{r.by_name} · {fmtTime(r.created_at)}</div>
              </div>
              <b style={{ color: r.points >= 0 ? "var(--ok)" : "var(--danger)" }}>
                {r.points >= 0 ? `+${r.points}` : r.points}
              </b>
            </div>
          ))}
        </Card>
      )}

      {addModal && (
        <Modal title="操行分加减" onClose={() => setAddModal(false)}>
          <ConductForm onDone={() => { setAddModal(false); load(); toast("已记录") }} />
        </Modal>
      )}
    </Page>
  )
}

function ConductForm({ onDone }: { onDone: () => void }) {
  const [users, setUsers] = useState<UserLite[]>([])
  const [uid, setUid] = useState(0)
  const [points, setPoints] = useState("1")
  const [reason, setReason] = useState("")
  useEffect(() => {
    api.get("/api/users").then(r => setUsers(r.users.filter((u: any) => u.role === "student"))).catch(errToast)
  }, [])
  async function save() {
    if (!uid) return toast("请选择学生")
    try {
      await api.post("/api/conduct", { user_id: uid, points: Number(points), reason })
      onDone()
    } catch (e) { errToast(e) }
  }
  return (
    <>
      <div className="field">
        <span className="field-label">选择学生</span>
        <select className="field-input" value={uid} onChange={e => setUid(Number(e.target.value))}>
          <option value={0}>选择学生…</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <Field label="分值（正加分负扣分）" type="number" value={points}
        onChange={e => setPoints(e.target.value)} />
      <Field label="原因" value={reason} onChange={e => setReason(e.target.value)} />
      <Btn onClick={save}>确认记录</Btn>
    </>
  )
}
