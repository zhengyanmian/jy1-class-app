// 论坛 / 私信 / 好友
import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../api"
import { Btn, Card, Empty, Field, Modal, Page, TextArea, fmtTime, toast, errToast, useAuth } from "../ui"

// ---------- 论坛 ----------
export function Forum() {
  const [posts, setPosts] = useState<any[]>([])
  const [addModal, setAddModal] = useState(false)
  const nav = useNavigate()
  const load = () => api.get("/api/posts").then(r => setPosts(r.posts)).catch(errToast)
  useEffect(() => { load() }, [])
  return (
    <Page title="班级论坛" right={
      <button className="btn btn-small btn-primary" onClick={() => setAddModal(true)}>发帖</button>
    }>
      {posts.length === 0 && <Empty text="还没有帖子，来发第一帖" />}
      {posts.map(p => (
        <Card key={p.id} onClick={() => nav(`/forum/${p.id}`)}>
          <div style={{ fontWeight: 600 }}>{p.title}</div>
          <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 4 }}>
            {p.content.slice(0, 50)}
          </div>
          <div style={{ color: "var(--text-2)", fontSize: 11, marginTop: 6 }}>
            {p.author_name} · {fmtTime(p.created_at)} · 💬 {p.comment_count}
          </div>
        </Card>
      ))}
      {addModal && (
        <Modal title="发帖" onClose={() => setAddModal(false)}>
          <PostForm onDone={() => { setAddModal(false); load(); toast("已发布") }} />
        </Modal>
      )}
    </Page>
  )
}

function PostForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  async function save() {
    if (!title) return toast("请输入标题")
    try { await api.post("/api/posts", { title, content }); onDone() } catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="标题" value={title} onChange={e => setTitle(e.target.value)} />
      <TextArea label="内容" value={content} onChange={e => setContent(e.target.value)} />
      <Btn onClick={save}>发布</Btn>
    </>
  )
}

export function ForumDetail() {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [content, setContent] = useState("")
  const nav = useNavigate()
  const { user } = useAuth()
  const load = () => api.get(`/api/posts/${id}`).then(r => { setPost(r.post); setComments(r.comments) }).catch(errToast)
  useEffect(() => { load() }, [id])

  async function reply() {
    if (!content.trim()) return
    try {
      await api.post(`/api/posts/${id}/comments`, { content })
      setContent("")
      load()
    } catch (e) { errToast(e) }
  }
  async function remove() {
    if (!confirm("确认删除该帖？")) return
    try { await api.del(`/api/posts/${id}`); toast("已删除"); nav("/forum") } catch (e) { errToast(e) }
  }

  if (!post) return <Page title="帖子" onBack={() => nav(-1)}><Empty /></Page>
  const canDel = post.user_id === user?.id || user?.role === "teacher"

  return (
    <Page title="帖子详情" onBack={() => nav(-1)} right={canDel
      ? <button className="btn btn-small btn-danger" onClick={remove}>删除</button> : undefined}>
      <Card>
        <div style={{ fontWeight: 700 }}>{post.title}</div>
        <div style={{ color: "var(--text-2)", fontSize: 12, margin: "6px 0" }}>
          {post.author_name} · {fmtTime(post.created_at)}
        </div>
        <div style={{ whiteSpace: "pre-wrap" }}>{post.content}</div>
      </Card>
      <div className="section-title">回复（{comments.length}）</div>
      <Card>
        {comments.length === 0 && <Empty text="暂无回复" />}
        {comments.map(c => (
          <div key={c.id} className="row-item">
            <div>
              <div style={{ fontWeight: 500 }}>{c.author_name}</div>
              <div style={{ marginTop: 2 }}>{c.content}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>{fmtTime(c.created_at)}</div>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <TextArea label="回复内容" value={content} onChange={e => setContent(e.target.value)} />
        <Btn onClick={reply}>回复</Btn>
      </Card>
    </Page>
  )
}

// ---------- 私信 ----------
export function DMList() {
  const [contacts, setContacts] = useState<any[]>([])
  const nav = useNavigate()
  useEffect(() => {
    api.get("/api/dm/contacts").then(r => setContacts(r.contacts)).catch(errToast)
  }, [])
  return (
    <Page title="私信">
      {contacts.length === 0 && <Empty text="暂无会话" />}
      <Card>
        {contacts.map(c => (
          <div key={c.id} className="row-item" onClick={() => nav(`/dm/${c.id}`)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--primary)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {c.name.slice(0, 1)}
              </div>
              <div>
                <div>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>{c.last_msg?.slice(0, 20)}</div>
              </div>
            </div>
            {c.unread > 0 && <span className="badge badge-danger">{c.unread}</span>}
          </div>
        ))}
      </Card>
      <div style={{ fontSize: 12, color: "var(--text-2)", textAlign: "center" }}>
        提示：可先在「好友」页添加联系人
      </div>
    </Page>
  )
}

export function DMChat() {
  const { peerId } = useParams()
  const [peerName, setPeerName] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [content, setContent] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()

  const load = async () => {
    const r = await api.get(`/api/dm/${peerId}`)
    setMessages(r.messages)
    setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
  }
  useEffect(() => {
    api.get("/api/users").then(r =>
      setPeerName(r.users.find((u: any) => u.id === Number(peerId))?.name || "")).catch(() => {})
    load()
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [peerId])

  async function send() {
    if (!content.trim()) return
    try {
      await api.post(`/api/dm/${peerId}`, { content })
      setContent("")
      load()
    } catch (e) { errToast(e) }
  }

  return (
    <Page title={peerName || "私信"} onBack={() => nav(-1)}>
      <div className="chat-wrap" style={{ paddingBottom: 70 }}>
        {messages.map(m => (
          <div key={m.id} className={`bubble ${m.from_id === Number(peerId) ? "bubble-peer" : "bubble-me"}`}>
            {m.content}
            <div style={{ fontSize: 10, opacity: .7, marginTop: 2 }}>{fmtTime(m.created_at)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 456, display: "flex", gap: 8, padding: "0 12px" }}>
        <input className="field-input" value={content} placeholder="输入消息…"
          onChange={e => setContent(e.target.value)} onKeyUp={e => e.key === "Enter" && send()} />
        <button className="btn btn-primary" style={{ width: 70 }} onClick={send}>发送</button>
      </div>
    </Page>
  )
}

// ---------- 好友 ----------
export function Friends() {
  const [friends, setFriends] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [pickModal, setPickModal] = useState(false)
  const load = () => api.get("/api/friends").then(r => { setFriends(r.friends); setRequests(r.requests) }).catch(errToast)
  useEffect(() => { load(); api.get("/api/users").then(r => setUsers(r.users)).catch(() => {}) }, [])

  async function add(uid: number) {
    try { await api.post(`/api/friends/${uid}`); toast("请求已发送"); setPickModal(false) } catch (e) { errToast(e) }
  }
  async function review(rid: number, status: string) {
    try { await api.put(`/api/friend_requests/${rid}`, { status }); load() } catch (e) { errToast(e) }
  }

  return (
    <Page title="好友" right={
      <button className="btn btn-small btn-primary" onClick={() => setPickModal(true)}>添加</button>
    }>
      {requests.length > 0 && (
        <>
          <div className="section-title">好友请求</div>
          <Card>
            {requests.map(r => (
              <div key={r.id} className="row-item">
                <span>{r.from_name}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-small btn-primary" onClick={() => review(r.id, "accepted")}>同意</button>
                  <button className="btn btn-small btn-plain" onClick={() => review(r.id, "rejected")}>拒绝</button>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
      <div className="section-title">我的好友</div>
      {friends.length === 0 && <Empty text="还没有好友，点击右上角添加" />}
      <Card>
        {friends.map(f => (
          <div key={f.id} className="row-item">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--ok)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {f.name.slice(0, 1)}
              </div>
              <div>
                <div>{f.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>{f.gender}</div>
              </div>
            </div>
          </div>
        ))}
      </Card>

      {pickModal && (
        <Modal title="添加好友" onClose={() => setPickModal(false)}>
          <Card>
            {users.filter(u => u.id !== friends.find(f => f.id === u.id)?.id).map(u => (
              <div key={u.id} className="row-item">
                <span>{u.name}</span>
                <button className="btn btn-small btn-plain" onClick={() => add(u.id)}>加好友</button>
              </div>
            ))}
          </Card>
        </Modal>
      )}
    </Page>
  )
}
