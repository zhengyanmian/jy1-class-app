// 作业：列表 / 提交 / 缺交名单 / 老师布置管理
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api"
import { Badge, Btn, Card, Empty, Field, isTeacher, Modal, Page, TextArea, toast, errToast, useAuth, fmtTime } from "../ui"

interface Homework {
  id: number; title: string; subject: string; content: string
  due_date: string; created_by: number; created_at: string; done_count: number
}

export default function Homework() {
  const [list, setList] = useState<Homework[]>([])
  const nav = useNavigate()
  const load = () => api.get("/api/homework").then(r => setList(r.homework)).catch(errToast)
  useEffect(() => { load() }, [])
  return (
    <Page title="作业">
      {list.length === 0 && <Empty text="暂无作业" />}
      {list.map(h => (
        <Card key={h.id} onClick={() => nav(`/homework/${h.id}`)}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>{h.title}</b>
            <Badge type="info">{h.subject || "其他"}</Badge>
          </div>
          <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 6 }}>
            {h.content.slice(0, 60)}
          </div>
          <div style={{ color: "var(--text-2)", fontSize: 11, marginTop: 6 }}>
            {h.due_date && <>截止 {h.due_date} · </>}已交 {h.done_count} 人 · {fmtTime(h.created_at)}
          </div>
        </Card>
      ))}
    </Page>
  )
}

export function HomeworkDetail({ id }: { id: number }) {
  const { user } = useAuth()
  const nav = useNavigate()
  const [h, setH] = useState<Homework | null>(null)
  const [myStatus, setMyStatus] = useState<{ status: string; content: string } | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [showStatus, setShowStatus] = useState(false)
  const [content, setContent] = useState("")
  const [addModal, setAddModal] = useState(false)

  const load = async () => {
    try {
      const r = await api.get("/api/homework")
      const hh = r.homework.find((x: Homework) => x.id === id)
      setH(hh || null)
      const s = await api.get(`/api/homework/${id}/status`)
      setItems(s.items)
      setMyStatus(s.items.find((x: any) => x.userId === user?.id) || null)
      if (myStatus) setContent(myStatus.content || "")
    } catch (e) { errToast(e) }
  }
  useEffect(() => { load() }, [id])

  async function submit() {
    try {
      await api.post(`/api/homework/${id}/submit`, { content })
      toast("提交成功")
      load()
    } catch (e) { errToast(e) }
  }

  if (!h) return <Page title="作业" onBack={() => nav(-1)}><Empty /></Page>

  const missing = items.filter(i => i.status !== "done")
  const done = items.filter(i => i.status === "done")

  return (
    <Page title="作业详情" onBack={() => nav(-1)}
      right={isTeacher(user)
        ? <button className="btn btn-small btn-primary" onClick={() => setShowStatus(true)}>情况</button>
        : undefined}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 17 }}>{h.title}</div>
        <div style={{ color: "var(--text-2)", fontSize: 12, marginTop: 4 }}>
          {h.subject} · 截止 {h.due_date || "不限"}
        </div>
        <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{h.content}</div>
      </Card>

      {!isTeacher(user) && (
        <Card>
          <div className="section-title">我的提交</div>
          <TextArea label="提交内容" value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="填写作业完成情况或作业内容…" />
          <Btn onClick={submit}>{myStatus?.status === "done" ? "更新提交" : "提交作业"}</Btn>
        </Card>
      )}

      {isTeacher(user) && (
        <Card>
          <Btn onClick={() => setAddModal(true)}>布置新作业</Btn>
        </Card>
      )}

      {showStatus && (
        <Modal title={`提交情况（已交 ${done.length} / 缺交 ${missing.length}）`}
          onClose={() => setShowStatus(false)}>
          <StatusList title="缺交名单" items={missing} />
          <StatusList title="已交名单" items={done} />
        </Modal>
      )}

      {addModal && (
        <Modal title="布置作业" onClose={() => setAddModal(false)}>
          <HomeworkForm onDone={() => { setAddModal(false); nav("/homework"); load() }} />
        </Modal>
      )}
    </Page>
  )
}

function StatusList({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null
  return (
    <>
      <div className="section-title">{title}</div>
      <Card>
        {items.map((i: any) => (
          <div key={i.userId} className="row-item">
            <span>{i.name}</span>
            <span style={{ color: "var(--text-2)", fontSize: 12 }}>{i.submittedAt ? fmtTime(i.submittedAt) : "未提交"}</span>
          </div>
        ))}
      </Card>
    </>
  )
}

function HomeworkForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [dueDate, setDueDate] = useState("")
  async function save() {
    if (!title) return toast("请输入标题")
    try {
      await api.post("/api/homework", { title, subject, content, dueDate })
      toast("已布置")
      onDone()
    } catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="标题" value={title} onChange={e => setTitle(e.target.value)} />
      <Field label="科目" value={subject} onChange={e => setSubject(e.target.value)} />
      <Field label="截止时间" type="datetime-local" value={dueDate}
        onChange={e => setDueDate(e.target.value)} />
      <TextArea label="作业内容" value={content} onChange={e => setContent(e.target.value)} />
      <Btn onClick={save}>发布</Btn>
    </>
  )
}
