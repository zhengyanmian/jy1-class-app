// 个人中心 + 老师的账号管理
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { SquarePen, Cake, Info } from "lucide-react"
import { api } from "../api"
import type { User } from "../api"
import { Btn, Card, Field, Modal, Page, toast, errToast, useAuth } from "../ui"

export function Profile() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [editModal, setEditModal] = useState(false)

  if (!user) return null
  return (
    <Page title="我的">
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--primary)",
            color: "#fff", fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {user.name.slice(0, 1)}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
            <div style={{ color: "var(--text-2)", fontSize: 13 }}>
              {user.role === "teacher" ? "老师" : `学生 ${user.studentNo || ""}`}
              {user.gender && ` · ${user.gender}`}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="row-item" onClick={() => setEditModal(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SquarePen size={16} style={{ color: "var(--primary)" }} />补全/修改个人信息
          </span><span>›</span>
        </div>
        <div className="row-item" onClick={() => nav("/birthday")}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Cake size={16} style={{ color: "var(--primary)" }} />生日一览
          </span><span>›</span>
        </div>
        <div className="row-item" onClick={() => toast("版本 v0.2 · 计应1班班级应用")}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Info size={16} style={{ color: "var(--primary)" }} />关于
          </span><span>›</span>
        </div>
      </Card>

      <Card>
        <Btn type="danger" onClick={() => { logout(); nav("/login") }}>退出登录</Btn>
      </Card>

      {editModal && <EditProfileModal user={user} onClose={() => setEditModal(false)} />}
    </Page>
  )
}

function EditProfileModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { refresh } = useAuth()
  const [name, setName] = useState(user.name)
  const [gender, setGender] = useState(user.gender)
  const [birthday, setBirthday] = useState(user.birthday?.slice(0, 10) || "")
  const [dormitory, setDormitory] = useState(user.dormitory)
  const [address, setAddress] = useState(user.address)
  async function save() {
    try {
      await api.post("/api/auth/confirm", { name, gender, birthday, dormitory, address })
      await refresh()
      toast("已保存")
      onClose()
    } catch (e) { errToast(e) }
  }
  return (
    <Modal title="修改个人信息" onClose={onClose}>
      <Field label="姓名" value={name} onChange={e => setName(e.target.value)} />
      <Field label="性别" value={gender} onChange={e => setGender(e.target.value)} />
      <Field label="生日" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
      <Field label="住宿情况" value={dormitory} onChange={e => setDormitory(e.target.value)} />
      <Field label="联系地址" value={address} onChange={e => setAddress(e.target.value)} />
      <Btn onClick={save}>保存</Btn>
    </Modal>
  )
}

// ---------- 账号管理（老师） ----------
export function UsersManage() {
  const [users, setUsers] = useState<User[]>([])
  const [addModal, setAddModal] = useState(false)
  const [resetModal, setResetModal] = useState<User | null>(null)
  const load = () => api.get("/api/users").then(r => setUsers(r.users)).catch(errToast)
  useEffect(() => { load() }, [])

  async function remove(u: User) {
    if (!confirm(`确认删除账号「${u.name}」？不可恢复`)) return
    try { await api.del(`/api/users/${u.id}`); toast("已删除"); load() } catch (e) { errToast(e) }
  }

  return (
    <Page title="账号管理" right={
      <button className="btn btn-small btn-primary" onClick={() => setAddModal(true)}>新增</button>
    }>
      <Card>
        {users.map(u => (
          <div key={u.id} className="row-item">
            <div>
              <div><b>{u.name}</b>
                <small style={{ color: "var(--text-2)" }}>
                  {" "}@{u.username} {u.role === "teacher" ? " · 老师" : u.studentNo ? ` · ${u.studentNo}` : ""}
                </small>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                操行分 {u.score}{u.confirmed ? "" : " · 未确认信息"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-small btn-plain" onClick={() => setResetModal(u)}>重置密码</button>
              <button className="btn btn-small btn-danger" onClick={() => remove(u)}>删除</button>
            </div>
          </div>
        ))}
      </Card>

      {addModal && <Modal title="新增账号" onClose={() => setAddModal(false)}>
        <AddUserForm onDone={() => { setAddModal(false); load(); toast("已创建") }} />
      </Modal>}
      {resetModal && <Modal title={`重置 ${resetModal.name} 的密码`} onClose={() => setResetModal(null)}>
        <ResetPwdForm user={resetModal} onDone={() => { setResetModal(null); toast("已重置") }} />
      </Modal>}
    </Page>
  )
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("123456")
  const [name, setName] = useState("")
  const [studentNo, setStudentNo] = useState("")
  const [role, setRole] = useState("student")
  async function save() {
    if (!username || !name) return toast("账号和姓名必填")
    try {
      await api.post("/api/users", { username, password, name, studentNo, role })
      onDone()
    } catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="登录账号" value={username} onChange={e => setUsername(e.target.value)} />
      <Field label="初始密码" value={password} onChange={e => setPassword(e.target.value)} />
      <Field label="姓名" value={name} onChange={e => setName(e.target.value)} />
      <Field label="学号" value={studentNo} onChange={e => setStudentNo(e.target.value)} />
      <div className="field">
        <span className="field-label">角色</span>
        <select className="field-input" value={role} onChange={e => setRole(e.target.value)}>
          <option value="student">学生</option>
          <option value="teacher">老师</option>
        </select>
      </div>
      <Btn onClick={save}>创建</Btn>
    </>
  )
}

function ResetPwdForm({ user, onDone }: { user: User; onDone: () => void }) {
  const [pwd, setPwd] = useState("123456")
  async function save() {
    try {
      await api.post("/api/auth/reset", { user_id: user.id, password: pwd })
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
