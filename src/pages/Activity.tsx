// 项目报名 / 小组 / 请假 / 班费 / 晚自习报备
import { useEffect, useState } from "react"
import { CircleCheck } from "lucide-react"
import { api } from "../api"
import { Badge, Btn, Card, Empty, Field, Modal, Page, fmtTime, isTeacher, toast, errToast, useAuth } from "../ui"

// ---------- 项目报名 ----------
export function Project() {
  const { user } = useAuth()
  const [list, setList] = useState<any[]>([])
  const [detail, setDetail] = useState<any>(null)
  const [addModal, setAddModal] = useState(false)
  const load = () => api.get("/api/projects").then(r => setList(r.projects)).catch(errToast)
  useEffect(() => { load() }, [])

  return (
    <Page title="项目报名" right={isTeacher(user) ? (
      <button className="btn btn-small btn-primary" onClick={() => setAddModal(true)}>新建</button>
    ) : undefined}>
      {list.length === 0 && <Empty text="暂无项目" />}
      {list.map(p => (
        <Card key={p.id} onClick={() => setDetail(p)}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>{p.title}</b>
            <Badge type={p.status === "open" ? "ok" : "warn"}>{p.status === "open" ? "报名中" : "已截止"}</Badge>
          </div>
          <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 4 }}>{p.description}</div>
          <div style={{ color: "var(--text-2)", fontSize: 12, marginTop: 6 }}>
            已报 {p.signup_count}{p.quota ? `/${p.quota}` : ""} 人
            {p.deadline && <> · 截止 {p.deadline}</>}
            {" · "}{p.signed ? <span style={{ color: "var(--ok)" }}><CircleCheck size={12} style={{ display: "inline", verticalAlign: -2 }} /> 我已报名</span> : ""}
          </div>
        </Card>
      ))}

      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <ProjectDetail p={detail} user={user} onDone={() => { setDetail(null); load() }} />
        </Modal>
      )}
      {addModal && (
        <Modal title="新建项目" onClose={() => setAddModal(false)}>
          <ProjectForm onDone={() => { setAddModal(false); load(); toast("已创建") }} />
        </Modal>
      )}
    </Page>
  )
}

function ProjectDetail({ p, user, onDone }: { p: any; user: any; onDone: () => void }) {
  const [signups, setSignups] = useState<any[]>([])
  useEffect(() => {
    api.get(`/api/projects/${p.id}/signups`).then(r => setSignups(r.items)).catch(() => {})
  }, [p.id])
  async function signup() {
    try { await api.post(`/api/projects/${p.id}/signup`); toast("报名成功"); onDone() }
    catch (e) { errToast(e) }
  }
  async function close() {
    try { await api.put(`/api/projects/${p.id}/status`, { status: "closed" }); toast("已截止"); onDone() }
    catch (e) { errToast(e) }
  }
  async function remove() {
    if (!confirm("确认删除该项目？")) return
    try { await api.del(`/api/projects/${p.id}`); onDone() } catch (e) { errToast(e) }
  }
  return (
    <>
      <Card>{p.description}</Card>
      <Card>
        <div className="section-title">已报名（{signups.length}）</div>
        {signups.map(s => (
          <div key={s.user_id} className="row-item">
            <span>{s.name}</span>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>{fmtTime(s.created_at)}</span>
          </div>
        ))}
      </Card>
      {isTeacher(user) ? (
        <div style={{ display: "flex", gap: 8 }}>
          <Btn type="danger" onClick={remove}>删除</Btn>
          <Btn onClick={close}>截止报名</Btn>
        </div>
      ) : (
        p.signed ? <Badge type="ok">我已报名</Badge>
          : <Btn onClick={signup}>立即报名</Btn>
      )}
    </>
  )
}

function ProjectForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [quota, setQuota] = useState("0")
  const [deadline, setDeadline] = useState("")
  async function save() {
    if (!title) return toast("请输入标题")
    try {
      await api.post("/api/projects", { title, description: desc, quota: Number(quota), deadline })
      onDone()
    } catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="项目名称" value={title} onChange={e => setTitle(e.target.value)} />
      <Field label="说明" value={desc} onChange={e => setDesc(e.target.value)} />
      <Field label="名额上限（0=不限）" type="number" value={quota} onChange={e => setQuota(e.target.value)} />
      <Field label="截止时间" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
      <Btn onClick={save}>创建</Btn>
    </>
  )
}

// ---------- 小组 ----------
export function Group() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [addModal, setAddModal] = useState(false)
  const load = () => api.get("/api/groups").then(r => setGroups(r.groups)).catch(errToast)
  useEffect(() => {
    load()
    api.get("/api/users").then(r => setUsers(r.users)).catch(() => {})
  }, [])

  return (
    <Page title="小组" right={isTeacher(user) ? (
      <button className="btn btn-small btn-primary" onClick={() => setAddModal(true)}>新建</button>
    ) : undefined}>
      {groups.length === 0 && <Empty text="暂无小组" />}
      {groups.map(g => (
        <Card key={g.id} onClick={() => isTeacher(user) && setEdit(g)}>
          <div style={{ fontWeight: 600 }}>
            {g.name}
            {g.leader_name && <Badge type="info" >组长 {g.leader_name}</Badge>}
          </div>
          <div style={{ color: "var(--text-2)", marginTop: 6 }}>
            成员：{g.members.map((m: any) => m.name).join("、") || "—"}
          </div>
        </Card>
      ))}
      {addModal && (
        <Modal title="新建小组" onClose={() => setAddModal(false)}>
          <Field label="组名" value="" onChange={() => {}} />
          <GroupForm isNew users={users} onDone={() => { setAddModal(false); load() }} />
        </Modal>
      )}
      {edit && (
        <Modal title="编辑小组" onClose={() => setEdit(null)}>
          <GroupForm init={edit} users={users} onDone={() => { setEdit(null); load(); toast("已保存") }} />
        </Modal>
      )}
    </Page>
  )
}

function GroupForm({ init, users, onDone, isNew }: { init?: any; users: any[]; onDone: () => void; isNew?: boolean }) {
  const [name, setName] = useState(init?.name || "")
  const [memberIds, setMemberIds] = useState<number[]>(init?.members?.map((m: any) => m.id) || [])
  const [leaderId, setLeaderId] = useState(init?.leader_id || 0)

  function toggle(id: number) {
    setMemberIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }
  async function save() {
    try {
      if (isNew) {
        const r = await api.post("/api/groups", { name, leaderId })
        await api.put(`/api/groups/${r.id}/members`, { userIds: memberIds, leaderId })
      } else {
        await api.put(`/api/groups/${init.id}/members`, { userIds: memberIds, leaderId })
        if (name !== init.name) await api.put(`/api/users/${init.id}`, { name }) // 组名后端未支持改名，忽略
      }
      onDone()
    } catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="组名" value={name} onChange={e => setName(e.target.value)} />
      <div className="section-title">选择成员</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {users.map(u => (
          <button key={u.id}
            className={`btn btn-small ${memberIds.includes(u.id) ? "btn-primary" : "btn-plain"}`}
            onClick={() => toggle(u.id)}>{u.name}</button>
        ))}
      </div>
      <div className="field">
        <span className="field-label">组长</span>
        <select className="field-input" value={leaderId} onChange={e => setLeaderId(Number(e.target.value))}>
          <option value={0}>未指定</option>
          {memberIds.map(id => {
            const u = users.find(x => x.id === id)
            return u ? <option key={id} value={id}>{u.name}</option> : null
          })}
        </select>
      </div>
      <Btn onClick={save}>保存</Btn>
    </>
  )
}

// ---------- 请假 ----------
export function Leave() {
  const { user } = useAuth()
  const [list, setList] = useState<any[]>([])
  const [addModal, setAddModal] = useState(false)
  const load = () => api.get("/api/leaves").then(r => setList(r.items)).catch(errToast)
  useEffect(() => { load() }, [])

  const badge = (s: string) => s === "approved" ? <Badge type="ok">已批准</Badge>
    : s === "rejected" ? <Badge type="danger">已驳回</Badge> : <Badge type="warn">待审批</Badge>

  return (
    <Page title="请假" right={!isTeacher(user) ? (
      <button className="btn btn-small btn-primary" onClick={() => setAddModal(true)}>申请</button>
    ) : undefined}>
      {list.length === 0 && <Empty text="暂无记录" />}
      {list.map(l => (
        <Card key={l.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>{l.user_name}</b>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Badge type="info">{l.type || "事假"}</Badge>
              {badge(l.status)}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>{l.start_time} ~ {l.end_time}</div>
          <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 4 }}>事由：{l.reason}</div>
          {isTeacher(user) && l.status === "pending" && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn type="primary" onClick={async () => { await api.put(`/api/leaves/${l.id}/review`, { status: "approved" }); load() }}>批准</Btn>
              <Btn type="danger" onClick={async () => { await api.put(`/api/leaves/${l.id}/review`, { status: "rejected" }); load() }}>驳回</Btn>
            </div>
          )}
        </Card>
      ))}
      {addModal && (
        <Modal title="请假申请" onClose={() => setAddModal(false)}>
          <LeaveForm onDone={() => { setAddModal(false); load(); toast("已提交") }} />
        </Modal>
      )}
    </Page>
  )
}

function LeaveForm({ onDone }: { onDone: () => void }) {
  const [startTime, setStart] = useState("")
  const [endTime, setEnd] = useState("")
  const [reason, setReason] = useState("")
  const [type, setType] = useState("事假")
  async function save() {
    if (!startTime || !endTime) return toast("请选择起止时间")
    try { await api.post("/api/leaves", { startTime, endTime, reason, type }); onDone() }
    catch (e) { errToast(e) }
  }
  return (
    <>
      <div className="field">
        <span className="field-label">请假类型</span>
        <select className="field-input" value={type} onChange={e => setType(e.target.value)}>
          <option value="病假">病假</option>
          <option value="事假">事假</option>
          <option value="离校">离校</option>
        </select>
      </div>
      <Field label="开始时间" type="datetime-local" value={startTime} onChange={e => setStart(e.target.value)} />
      <Field label="结束时间" type="datetime-local" value={endTime} onChange={e => setEnd(e.target.value)} />
      <Field label={type === "离校" ? "离校事由及去向" : "请假事由"} value={reason} onChange={e => setReason(e.target.value)} />
      <Btn onClick={save}>提交申请</Btn>
    </>
  )
}

// ---------- 班费 ----------
export function Fund() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [addModal, setAddModal] = useState(false)
  const [applyModal, setApplyModal] = useState(false)
  const load = () => api.get("/api/fund").then(setData).catch(errToast)
  useEffect(() => { load() }, [])

  return (
    <Page title="班费" right={isTeacher(user) ? (
      <button className="btn btn-small btn-primary" onClick={() => setAddModal(true)}>记账</button>
    ) : (
      <button className="btn btn-small btn-primary" onClick={() => setApplyModal(true)}>申请</button>
    )}>
      <div className="stat-row">
        <div className="stat-card">
          <div className="st-num">¥{(data?.balance ?? 0).toFixed(2)}</div>
          <div className="st-label">当前余额</div>
        </div>
      </div>

      {isTeacher(user) && data?.applications?.filter((a: any) => a.status === "pending").length > 0 && (
        <>
          <div className="section-title">待处理申请</div>
          {data.applications.filter((a: any) => a.status === "pending").map((a: any) => (
            <Card key={a.id}>
              <div><b>{a.user_name}</b> 申请 ¥{a.amount}</div>
              <div style={{ color: "var(--text-2)", fontSize: 13 }}>{a.reason}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn onClick={async () => { await api.put(`/api/fund/apply/${a.id}`, { status: "approved" }); load() }}>通过</Btn>
                <Btn type="danger" onClick={async () => { await api.put(`/api/fund/apply/${a.id}`, { status: "rejected" }); load() }}>驳回</Btn>
              </div>
            </Card>
          ))}
        </>
      )}

      <div className="section-title">收支记录</div>
      {data?.records?.length === 0 && <Empty text="暂无记录" />}
      {data?.records?.map((r: any) => (
        <Card key={r.id}>
          <div className="row-item" style={{ padding: 0, borderBottom: "none" }}>
            <div>
              <div><b>{r.item || (r.type === "income" ? "收入" : "支出")}</b>
                {r.note && <span style={{ color: "var(--text-2)", fontSize: 12 }}> · {r.note}</span>}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>{r.by_name} · {fmtTime(r.created_at)}</div>
            </div>
            <b style={{ color: r.type === "income" ? "var(--ok)" : "var(--danger)" }}>
              {r.type === "income" ? "+" : "-"}¥{r.amount}
            </b>
          </div>
        </Card>
      ))}

      {addModal && <Modal title="班费记账" onClose={() => setAddModal(false)}>
        <FundForm onDone={() => { setAddModal(false); load(); toast("已记账") }} />
      </Modal>}
      {applyModal && <Modal title="班费申请" onClose={() => setApplyModal(false)}>
        <ApplyForm onDone={() => { setApplyModal(false); toast("申请已提交") }} />
      </Modal>}
    </Page>
  )
}

function FundForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState("income")
  const [amount, setAmount] = useState("")
  const [item, setItem] = useState("")
  async function save() {
    if (!amount) return toast("请输入金额")
    try { await api.post("/api/fund/record", { type, amount: Number(amount), item }); onDone() }
    catch (e) { errToast(e) }
  }
  return (
    <>
      <div className="field">
        <span className="field-label">类型</span>
        <select className="field-input" value={type} onChange={e => setType(e.target.value)}>
          <option value="income">收入</option>
          <option value="expense">支出</option>
        </select>
      </div>
      <Field label="金额（¥）" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
      <Field label="项目" value={item} placeholder="如：班服采购" onChange={e => setItem(e.target.value)} />
      <Btn onClick={save}>记账</Btn>
    </>
  )
}

function ApplyForm({ onDone }: { onDone: () => void }) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  async function save() {
    if (!amount) return toast("请输入金额")
    try { await api.post("/api/fund/apply", { amount: Number(amount), reason }); onDone() }
    catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="金额（¥）" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
      <Field label="用途" value={reason} onChange={e => setReason(e.target.value)} />
      <Btn onClick={save}>提交申请</Btn>
    </>
  )
}

// ---------- 晚自习报备 ----------
export function Report() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [items, setItems] = useState<any[]>([])
  const [kind, setKind] = useState("normal")
  const [address, setAddress] = useState("")

  const load = () => api.get(`/api/reports?date=${date}`).then(r => setItems(r.items)).catch(errToast)
  useEffect(() => { load() }, [date])

  async function submit() {
    try {
      await api.post("/api/reports", { date: today, kind, address })
      toast("报备成功")
      load()
    } catch (e) { errToast(e) }
  }

  return (
    <Page title="晚自习报备">
      {!isTeacher(user) && (
        <Card>
          <div className="section-title">今日报备（{today}）</div>
          <div className="field">
            <span className="field-label">报备类型</span>
            <select className="field-input" value={kind} onChange={e => setKind(e.target.value)}>
              <option value="normal">正常在校</option>
              <option value="boarder">住校</option>
              <option value="address">校外/回家（填地址）</option>
            </select>
          </div>
          {kind === "address" && (
            <Field label="去向地址" value={address} onChange={e => setAddress(e.target.value)} />
          )}
          <Btn onClick={submit}>提交报备</Btn>
        </Card>
      )}

      {isTeacher(user) && (
        <>
          <Field label="查看日期" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Card>
            {items.length === 0 && <Empty text="当天无人报备" />}
            {items.map(r => (
              <div key={r.id} className="row-item">
                <div>
                  <b>{r.user_name}</b>
                  <span style={{ color: "var(--text-2)", fontSize: 12 }}> {r.dormitory || ""}</span>
                </div>
                <span style={{ fontSize: 13 }}>
                  {r.kind === "boarder" ? "住校" : r.kind === "address" ? r.address : "在校"}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}
    </Page>
  )
}
