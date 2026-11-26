// 课程表：全员查看，老师编辑
import { useEffect, useState } from "react"
import { api } from "../api"
import { isTeacher, Modal, Page, toast, errToast, useAuth, Btn, Field } from "../ui"

interface Course { id: number; day: number; period: number; name: string; teacher: string; room: string }
const DAYS = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"]
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function Course() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [edit, setEdit] = useState<{ day: number; period: number; c?: Course } | null>(null)

  const load = () => api.get("/api/courses").then(r => setCourses(r.courses)).catch(errToast)
  useEffect(() => { load() }, [])

  const find = (day: number, period: number) =>
    courses.find(c => c.day === day && c.period === period)

  function cellClick(day: number, period: number) {
    if (!isTeacher(user)) return
    setEdit({ day, period, c: find(day, period) })
  }

  return (
    <Page title="课程表">
      <div style={{ overflowX: "auto" }}>
        <table className="timetable">
          <thead><tr><th>节次</th>{DAYS.slice(1, 8).map(d => <th key={d}>{d}</th>)}</tr></thead>
          <tbody>
            {PERIODS.map(p => (
              <tr key={p}>
                <th>{p}</th>
                {DAYS.slice(1, 8).map((_, i) => {
                  const c = find(i + 1, p)
                  return (
                    <td key={i} className={c ? "course" : ""}
                      onClick={() => cellClick(i + 1, p)}>
                      {c ? <>{c.name}{c.room && <><br /><small>{c.room}</small></>}</> : "—"}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isTeacher(user) && <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-2)" }}>提示：点击格子编辑课程，清空名称即删除</div>}

      {edit && (
        <Modal title={`${DAYS[edit.day]} 第 ${edit.period} 节`} onClose={() => setEdit(null)}>
          <CourseEdit init={edit.c} day={edit.day} period={edit.period}
            onDone={() => { setEdit(null); load(); toast("已保存") }} />
        </Modal>
      )}
    </Page>
  )
}

function CourseEdit({ init, day, period, onDone }: {
  init?: Course; day: number; period: number; onDone: () => void
}) {
  const [name, setName] = useState(init?.name || "")
  const [teacher, setTeacher] = useState(init?.teacher || "")
  const [room, setRoom] = useState(init?.room || "")
  async function save() {
    try {
      await api.put("/api/courses", { day, period, name, teacher, room })
      onDone()
    } catch (e) { errToast(e) }
  }
  return (
    <>
      <Field label="课程名称" value={name} onChange={e => setName(e.target.value)} />
      <Field label="任课老师" value={teacher} onChange={e => setTeacher(e.target.value)} />
      <Field label="教室" value={room} onChange={e => setRoom(e.target.value)} />
      <Btn onClick={save}>保存</Btn>
    </>
  )
}
