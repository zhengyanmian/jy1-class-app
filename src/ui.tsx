// 移动端 UI 组件库
import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { api, clearToken } from "./api"
import type { User } from "./api"

// ---------- 全局用户上下文 ----------
interface AuthCtx {
  user: User | null
  setUser: (u: User | null) => void
  logout: () => void
  refresh: () => Promise<void>
}
const Ctx = createContext<AuthCtx>(null as any)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const logout = useCallback(() => { clearToken(); setUser(null) }, [])
  const refresh = useCallback(async () => {
    try { setUser((await api.get("/api/auth/me")).user) }
    catch { setUser(null) }
  }, [])
  return <Ctx.Provider value={{ user, setUser, logout, refresh }}>{children}</Ctx.Provider>
}

// ---------- 页面外壳 ----------
export function Page({ title, onBack, right, children }: {
  title: string; onBack?: () => void; right?: ReactNode; children: ReactNode
}) {
  return (
    <div className="page">
      <div className="navbar">
        {onBack && <button className="nav-back" onClick={onBack}>‹</button>}
        <div className="nav-title">{title}</div>
        <div className="nav-right">{right}</div>
      </div>
      <div className="page-body">{children}</div>
    </div>
  )
}

export function Card({ children, className = "", onClick, style }: { children: ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties }) {
  return <div className={`card ${className}`} onClick={onClick} style={style}>{children}</div>
}

export function Btn({ children, onClick, type = "primary", disabled, className = "" }: {
  children: ReactNode; onClick?: () => void; type?: "primary" | "plain" | "danger" | "small"; disabled?: boolean; className?: string
}) {
  return <button disabled={disabled} onClick={onClick}
    className={`btn btn-${type} ${className} ${disabled ? "btn-disabled" : ""}`}>{children}</button>
}

export function Badge({ children, type = "info" }: { children: ReactNode; type?: "ok" | "warn" | "danger" | "info" }) {
  return <span className={`badge badge-${type}`}>{children}</span>
}

export function Empty({ text = "暂无数据" }: { text?: string }) {
  return <div className="empty">{text}</div>
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="field-input" {...props} />
    </label>
  )
}

export function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea className="field-input field-textarea" {...props} />
    </label>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  )
}

// ---------- 轻提示 ----------
let toastFn: (msg: string) => void = () => {}
export function ToastHost() {
  const [msg, setMsg] = useState("")
  useEffect(() => { toastFn = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2200) } }, [])
  if (!msg) return null
  return <div className="toast">{msg}</div>
}
export const toast = (msg: string) => toastFn(msg)

export const errToast = (e: unknown) => toast(e instanceof Error ? e.message : String(e))

export const fmtTime = (s?: string) =>
  s ? s.slice(5, 16).replace("T", " ") : ""

const DAY_CN = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"]
export const dayName = (d: number) => DAY_CN[d] || ""

export const isTeacher = (u: User | null) => u?.role === "teacher"
