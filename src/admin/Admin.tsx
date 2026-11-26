// 管理后台：桌面侧边栏布局 + 管理页
import { useEffect, useState } from "react"
import { NavLink, Route, Routes, useLocation, Navigate } from "react-router-dom"
import { api } from "../api"
import { Btn, Card, Empty, Field, Modal, TextArea, toast, errToast, fmtTime } from "../ui"
import Course from "../pages/Course"
import { Duty, Seat, Notice } from "../pages/Daily"
import { Leave, Fund, Project, Report } from "../pages/Activity"
import Conduct from "../pages/Conduct"

const NAV = [
  { to: "/admin", icon: "📊", name: "数据看板", end: true },
  { to: "/admin/users", icon: "👤", name: "账号管理" },
  { to: "/admin/homework", icon: "📝", name: "作业管理" },
  { to: "/admin/conduct", icon: "⭐", name: "操行分管理" },
  { to: "/admin/notice", icon: "📢", name: "通知管理" },
  { to: "/admin/course", icon: "📅", name: "课程表" },
  { to: "/admin/duty", icon: "🧹", name: "值日表" },
  { to: "/admin/seat", icon: "💺", name: "座位表" },
  { to: "/admin/leave", icon: "🧾", name: "请假审批" },
  { to: "/admin/fund", icon: "💰", name: "班费" },
  { to: "/admin/project", icon: "📦", name: "项目报名" },
  { to: "/admin/report", icon: "🌙", name: "报备查询" },
  { to: "/admin/settings", icon: "⚙️", name: "修改密码" },
]

export function AdminShell() {
  const loc = useLocation()
  return (
    <div className="admin-shell">
      <nav className="admin-side">
        <div className="as-logo">🎓 计应1班</div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={n.end ? (loc.pathname === n.to ? "active" : "")
              : loc.pathname.startsWith(n.to) ? "active" : ""}>
            <span>{n.icon}</span><span className="txt">{n.name}</span>
          </NavLink>
        ))}
        <NavLink to="/" className="as-quit"><span>📱</span><span className="txt">返回手机版</span></NavLink>
      </nav>
      <div className="admin-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/homework" element={<HomeworkPage />} />
          <Route path="/conduct" element={<Conduct />} />
          <Route path="/notice" element={<Notice />} />
          <Route path="/course" element={<Course />} />
          <Route path="/duty" element={<Duty />} />
          <Route path="/seat" element={<Seat />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/fund" element={<Fund />} />
          <Route path="/project" element={<Project />} />
          <Route path="/report" element={<Report />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function AdminHead({ title, actions, children }: { title: string; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <>
      <div className="admin-topbar">
        <span className="at-title">{title}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>{actions}</div>
      </div>
      <div className="admin-content">{children}</div>
    </>
  )
}

// ---------- 数据看板 ----------
function Dashboard() {
  const [s, setS] = useState<any>(null)
  useEffect(() => { api.get("/api/admin/stats").then(setS).catch(errToast) }, [])
  if (!s) return <AdminHead title="数据看板"><Empty text="加载中…" /></AdminHead>

  return (
    <AdminHead title="数据看板">
      <div className="dash-grid">
        <DashCard num={s.students} label="学生总数" />
        <DashCard num={s.unconfirmed} label="未确认信息" warn={s.unconfirmed > 0} />
        <DashCard num={s.homeworkTotal} label="累计作业数" />
        <DashCard num={s.conductToday} label="今日操行分记录" />
        <DashCard num={s.pendingLeaves} label="待审批请假" warn={s.pendingLeaves > 0} />
        <DashCard num={s.pendingFund} label="待审批班费申请" warn={s.pendingFund > 0} />
        <DashCard num={s.reportsToday} label="今日报备人数" />
        <DashCard num={`¥${s.fundBalance}`} label="班费余额" />
      </div>

      <h3 style={{ margin: "20px 0 10px" }}>最近作业提交情况</h3>
      {s.homework.length === 0 ? <Empty text="还没有布置过作业" /> : (
        <table className="table">
          <thead><tr><th>作业</th><th>截止</th><th>已交人数</th></tr></thead>
          <tbody>
            {s.homework.map((h: any) => (
              <tr key={h.id}>
                <td>{h.title}</td>
                <td>{h.due_date || "不限"}</td>
                <td>{h.done} / {s.students}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminHead>
  )
}

function DashCard({ num, label, warn }: { num: any; label: string; warn?: boolean }) {
  return (
    <div className="dash-card">
      <div className="dc-num" style={warn ? { color: "var(--warn)" } : undefined}>{num}</div>
      <div className="dc-label">{label}</div>
    </div>
  )
}

// ---------- 账号管理 ----------
function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [importModal, setImportModal] = useState(false)
  const [resetUser, setResetUser] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [q, setQ] = useState("")
  const load = () => api.get("/api/users").then(r => setUsers(r.users)).catch(errToast)
  useEffect(() => { load() }, [])

  async function remove(u: any) {
    if (!confirm(`确认删除账号「${u.name}」？不可恢复`)) return
    try { await api.del(`/api/users/${u.id}`); load(); toast("已删除") } catch (e) { errToast(e) }
  }

  const shown = users.filter(u =>
    !q || u.name.includes(q) || (u.username || "").includes(q) || (u.student_no || "").includes(q))

  return (
    <AdminHead title="账号管理" actions={<Btn onClick={() => { setImportModal(true); setResult(null) }}>批量导入</Btn>}>
      <div style={{ marginBottom: 12 }}>
        <input className="field-input" style={{ maxWidth: 300 }} placeholder="搜索姓名/账号/学号"
          value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <table className="table">
        <thead><tr><th>姓名</th><th>账号</th><th>学号</th><th>角色</th><th>操行分</th><th>状态</th><th></th></tr></thead>
        <tbody>
          {shown.map(u => (
            <tr key={u.id}>
              <td><b>{u.name}</b></td>
              <td>{u.username}</td>
              <td>{u.student_no || "—"}</td>
              <td>{u.role === "teacher" ? "老师" : "学生"}</td>
              <td>{u.score}</td>
              <td>{u.role === "student" && !u.confirmed
                ? <span className="badge badge-warn">未确认</span>
                : <span className="badge badge-ok">正常</span>}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="btn btn-small btn-plain" onClick={() => setResetUser(u)}>重置密码</button>{" "}
                <button className="btn btn-small btn-danger" onClick={() => remove(u)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {importModal && (
        <Modal title="批量导入学生" onClose={() => setImportModal(false)}>
          {result ? (
            <>
              <Card>✅ 成功导入 <b>{result.created.length}</b> 人{result.skipped.length > 0 && <>，跳过 <b>{result.skipped.length}</b> 条</>}</Card>
              {result.created.length > 0 && (
                <Card>
                  <div className="section-title">分配结果（请转发给同学）</div>
                  <table className="table">
                    <thead><tr><th>姓名</th><th>账号</th><th>初始密码</th></tr></thead>
                    <tbody>
                      {result.created.map((c: any) => (
                        <tr key={c.id}><td>{c.name}</td><td>{c.username}</td><td>{c.password}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <Btn onClick={() => {
                    const csv = result.created.map((c: any) => `${c.name},${c.username},${c.password}`).join("\n")
                    navigator.clipboard.writeText(csv).then(() => toast("已复制到剪贴板"))
                  }}>复制分配表</Btn>
                </Card>
              )}
              <Btn onClick={() => { setImportModal(false); load() }}>完成</Btn>
            </>
          ) : (
            <>
              <TextArea label="每行一个：姓名,学号（可加列：账号,初始密码）"
                placeholder={"张三,01\n李四,02\n王五,03,siwang,654321"} rows={8} id="import-text" />
              <ImportBtn onDone={setResult} />
            </>
          )}
        </Modal>
      )}
      {resetUser && (
        <Modal title={`重置 ${resetUser.name} 的密码`} onClose={() => setResetUser(null)}>
          <ResetPwd uid={resetUser.id} onDone={() => { setResetUser(null); toast("已重置") }} />
        </Modal>
      )}
    </AdminHead>
  )
}

function ImportBtn({ onDone }: { onDone: (r: any) => void }) {
  const [busy, setBusy] = useState(false)
  async function go() {
    const text = (document.getElementById("import-text") as HTMLTextAreaElement)?.value || ""
    if (!text.trim()) return toast("请粘贴名单")
    setBusy(true)
    try {
      const r = await api.post("/api/admin/users/import", { text })
      onDone(r)
    } catch (e) { errToast(e) } finally { setBusy(false) }
  }
  return <Btn disabled={busy} onClick={go}>{busy ? "导入中…" : "开始导入"}</Btn>
}

function ResetPwd({ uid, onDone }: { uid: number; onDone: () => void }) {
  const [pwd, setPwd] = useState("123456")
  async function save() {
    try {
      await api.post("/api/auth/reset", { user_id: uid, password: pwd })
      onDone()
    } catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="新密码" value={pwd} onChange={e => setPwd(e.target.value)} />
      <Btn onClick={save}>重置</Btn>
    </>
  )
}

// ---------- 作业管理 ----------
function HomeworkPage() {
  const [list, setList] = useState<any[]>([])
  const [addModal, setAddModal] = useState(false)
  const [statusFor, setStatusFor] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const load = () => api.get("/api/homework").then(r => setList(r.homework)).catch(errToast)
  useEffect(() => { load() }, [])

  async function remove(h: any) {
    if (!confirm(`确认删除作业「${h.title}」？提交记录一并删除`)) return
    try { await api.del(`/api/homework/${h.id}`); load(); toast("已删除") } catch (e) { errToast(e) }
  }
  async function showStatus(h: any) {
    const r = await api.get(`/api/homework/${h.id}/status`)
    setItems(r.items); setStatusFor(h)
  }

  return (
    <AdminHead title="作业管理" actions={<Btn onClick={() => setAddModal(true)}>布置作业</Btn>}>
      <table className="table">
        <thead><tr><th>标题</th><th>科目</th><th>截止</th><th>已交</th><th>布置时间</th><th></th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={6}><Empty text="暂无作业" /></td></tr>}
          {list.map(h => (
            <tr key={h.id}>
              <td><b>{h.title}</b></td>
              <td>{h.subject || "—"}</td>
              <td>{h.due_date || "不限"}</td>
              <td>{h.done_count} 人</td>
              <td>{fmtTime(h.created_at)}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="btn btn-small btn-plain" onClick={() => showStatus(h)}>情况</button>{" "}
                <button className="btn btn-small btn-danger" onClick={() => remove(h)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {addModal && <Modal title="布置作业" onClose={() => setAddModal(false)}>
        <HwForm onDone={() => { setAddModal(false); load(); toast("已布置") }} />
      </Modal>}
      {statusFor && <Modal title={`「${statusFor.title}」提交情况`} onClose={() => setStatusFor(null)}>
        <table className="table">
          <thead><tr><th>姓名</th><th>学号</th><th>状态</th><th>提交时间</th></tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.userId}>
                <td>{i.name}</td><td>{i.studentNo}</td>
                <td>{i.status === "done"
                  ? <span className="badge badge-ok">已交</span>
                  : <span className="badge badge-danger">缺交</span>}</td>
                <td>{i.submittedAt ? fmtTime(i.submittedAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>}
    </AdminHead>
  )
}

function HwForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [dueDate, setDueDate] = useState("")
  async function save() {
    if (!title) return toast("请输入标题")
    try { await api.post("/api/homework", { title, subject, content, dueDate }); onDone() }
    catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="标题" value={title} onChange={e => setTitle(e.target.value)} />
      <Field label="科目" value={subject} onChange={e => setSubject(e.target.value)} />
      <Field label="截止时间" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      <TextArea label="作业内容" value={content} onChange={e => setContent(e.target.value)} />
      <Btn onClick={save}>发布</Btn>
    </>
  )
}

// ---------- 通知管理（桌面表格化复用即可，直接用移动版） ----------
// Course/Duty/Seat/Leave/Fund/Project/Report/Conduct/Notice 直接复用移动端组件

// ---------- 修改密码 ----------
function SettingsPage() {
  const [old, setOld] = useState("")
  const [nw, setNw] = useState("")
  const [nw2, setNw2] = useState("")
  async function save() {
    if (nw !== nw2) return toast("两次新密码不一致")
    try {
      await api.post("/api/admin/auth/change-password", { old, new: nw })
      toast("密码已修改")
      setOld(""); setNw(""); setNw2("")
    } catch (e) { errToast(e) }
  }
  return (
    <AdminHead title="修改密码">
      <div className="card" style={{ maxWidth: 420 }}>
        <Field label="原密码" type="password" value={old} onChange={e => setOld(e.target.value)} />
        <Field label="新密码（至少6位）" type="password" value={nw} onChange={e => setNw(e.target.value)} />
        <Field label="确认新密码" type="password" value={nw2} onChange={e => setNw2(e.target.value)} />
        <Btn onClick={save}>修改</Btn>
      </div>
    </AdminHead>
  )
}
