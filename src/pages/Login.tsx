// 登录页 + 首次信息确认
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { GraduationCap } from "lucide-react"
import { api, setToken } from "../api"
import type { User } from "../api"
import { Btn, Field, Page, toast, errToast, useAuth } from "../ui"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const { setUser } = useAuth()

  async function doLogin() {
    if (!username || !password) return toast("请输入账号和密码")
    setBusy(true)
    try {
      const r = await api.post("/api/auth/login", { username, password })
      setToken(r.token)
      setUser(r.user)
      if (!(r.user as User).confirmed) nav("/confirm")
      else nav("/")
    } catch (e) { errToast(e) } finally { setBusy(false) }
  }

  return (
    <div className="page">
      <div className="login-logo">
        <GraduationCap size={56} strokeWidth={1.6} style={{ color: "var(--primary)" }} />
        <div className="lg-title">计应1班</div>
        <div className="lg-sub">班级应用 · 请使用老师分配的账号登录</div>
      </div>
      <div style={{ padding: "0 24px" }}>
        <Field label="账号" value={username} onChange={e => setUsername(e.target.value)}
          placeholder="老师分配的账号" />
        <Field label="密码" type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="输入密码" onKeyUp={e => e.key === "Enter" && doLogin()} />
        <Btn disabled={busy} onClick={doLogin}>{busy ? "登录中…" : "登 录"}</Btn>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--text-2)" }}
          onClick={() => toast("忘记密码请联系老师重置")}>忘记密码？</div>
      </div>
    </div>
  )
}

export function Confirm() {
  const { user, refresh } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState(user?.name || "")
  const [gender, setGender] = useState(user?.gender || "")
  const [birthday, setBirthday] = useState(user?.birthday || "")
  const [dormitory, setDormitory] = useState(user?.dormitory || "")
  const [address, setAddress] = useState(user?.address || "")

  async function save() {
    try {
      await api.post("/api/auth/confirm",
        { name, gender, birthday, dormitory, address })
      await refresh()
      toast("信息已确认")
      nav("/")
    } catch (e) { errToast(e) }
  }

  return (
    <Page title="补全个人信息" onBack={() => nav(-1)}>
      <div className="card" style={{ color: "var(--text-2)", fontSize: 13 }}>
        首次登录请确认个人信息，信息将用于值日、生日提醒、晚自习报备等功能。
      </div>
      <div className="card">
        <Field label="姓名" value={name} onChange={e => setName(e.target.value)} />
        <Field label="性别" value={gender} placeholder="男 / 女"
          onChange={e => setGender(e.target.value)} />
        <Field label="生日" type="date" value={birthday.slice(0, 10)}
          onChange={e => setBirthday(e.target.value)} />
        <Field label="住宿情况" value={dormitory} placeholder="住校 / 走读 / 宿舍号"
          onChange={e => setDormitory(e.target.value)} />
        <Field label="联系地址（晚自习报备用）" value={address}
          onChange={e => setAddress(e.target.value)} />
        <Btn onClick={save}>确认提交</Btn>
      </div>
    </Page>
  )
}
