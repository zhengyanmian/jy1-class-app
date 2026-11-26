// API 封装：自动携带 token，统一错误处理
const BASE = import.meta.env.PROD ? "" : "http://localhost:5000"
const TOKEN_KEY = "class_token"

export function getToken() { return localStorage.getItem(TOKEN_KEY) || "" }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }

export class ApiError extends Error {
  status: number
  constructor(msg: string, status: number) { super(msg); this.status = status }
}

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const t = getToken()
  if (t) headers["Authorization"] = `Bearer ${t}`
  let res: Response
  try {
    res = await fetch(BASE + path, { ...opts, headers })
  } catch {
    throw new ApiError("网络连接失败，请检查网络", 0)
  }
  if (res.status === 401) { clearToken(); throw new ApiError("未登录或登录已过期", 401) }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `请求失败(${res.status})`, res.status)
  return data as T
}

export const api = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body?: any) => request<T>(p, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T = any>(p: string, body?: any) => request<T>(p, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: <T = any>(p: string) => request<T>(p, { method: "DELETE" }),
}

export interface User {
  id: number; username: string; name: string; role: "teacher" | "student"
  studentNo: string; gender: string; birthday: string; avatar: string
  dormitory: string; address: string; confirmed: boolean; score: number
}
