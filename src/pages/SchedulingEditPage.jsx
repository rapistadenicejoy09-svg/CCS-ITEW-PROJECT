import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { hasPermission, PERMISSIONS } from '../lib/security'
import {
  DAYS,
  getScheduleById,
  getSchedules,
  normalizeScheduleInput,
  updateSchedule,
  validateScheduleConflicts,
  validateScheduleRequiredFields,
  ROOM_OPTIONS,
} from '../lib/schedulingStore'

const inputCls = 'search-input w-full'
const COURSE_OPTIONS = ['BSIT', 'BSCS']
const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
const SECTION_BY_YEAR = {
  '1st Year': ['1A', '1B', '1C', '1D', '1E'],
  '2nd Year': ['2A', '2B', '2C', '2D', '2E'],
  '3rd Year': ['3A', '3B', '3C', '3D', '3E'],
  '4th Year': ['4A', '4B', '4C', '4D', '4E'],
}

export default function SchedulingEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const canManage = hasPermission(PERMISSIONS.SCHEDULING_MANAGE)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    subjectCode: '',
    subjectTitle: '',
    instructor: '',
    course: '',
    yearLevel: '',
    section: '',
    day: 'Monday',
    startTime: '08:00',
    endTime: '09:00',
    room: '',
  })

  useEffect(() => {
    async function load() {
      const existing = await getScheduleById(id)
      if (!existing) {
        setError('Schedule not found.')
        setLoading(false)
        return
      }
      setForm({
        subjectCode: existing.subjectCode || '',
        subjectTitle: existing.subjectTitle || '',
        instructor: existing.instructor || '',
        course: existing.course || '',
        yearLevel: existing.yearLevel || '',
        section: existing.section || '',
        day: existing.day || 'Monday',
        startTime: existing.startTime || '08:00',
        endTime: existing.endTime || '09:00',
        room: existing.room || '',
      })
      setLoading(false)
    }
    load()
  }, [id])

  if (!canManage) {
    return <div className="p-8 text-center text-[var(--text-muted)]">You do not have access to edit schedules.</div>
  }

  const patchForm = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const updated = normalizeScheduleInput({ ...form, id })
    const requiredError = validateScheduleRequiredFields(updated)
    if (requiredError) {
      setError(requiredError)
      return
    }

    setSaving(true)
    try {
      const all = await getSchedules()
      const conflictError = validateScheduleConflicts(updated, all, id)
      if (conflictError) {
        setError(conflictError)
        return
      }
      await updateSchedule(id, updated)
      navigate(`/scheduling/${id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 module-page">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-[var(--accent)]" />
      </div>
    )
  }

  return (
    <div className="module-page max-w-5xl mx-auto w-full">
      <div className="w-full space-y-6">
        <header className="module-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="main-title font-extrabold text-[var(--text)]">Edit Schedule</h1>
            <p className="main-description text-[var(--text-muted)] mt-1">
              Update class assignment details and keep the timetable conflict-free.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/scheduling/${id}`} className="btn btn-secondary">← Cancel</Link>
            <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        {error ? (
          <div className="p-4 rounded-xl text-rose-400 bg-rose-500/10 border border-rose-500/20 text-sm font-semibold">
            {error}
          </div>
        ) : null}

        <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Subject code</span>
              <input className={inputCls} value={form.subjectCode} onChange={(e) => patchForm({ subjectCode: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Subject title</span>
              <input className={inputCls} value={form.subjectTitle} onChange={(e) => patchForm({ subjectTitle: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Instructor</span>
              <input className={inputCls} value={form.instructor} onChange={(e) => patchForm({ instructor: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Course</span>
              <select className={inputCls} value={form.course} onChange={(e) => patchForm({ course: e.target.value })}>
                <option value="">Select course</option>
                {COURSE_OPTIONS.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Year level</span>
              <select
                className={inputCls}
                value={form.yearLevel}
                onChange={(e) => patchForm({ yearLevel: e.target.value, section: '' })}
              >
                <option value="">Select year level</option>
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Section</span>
              <select
                className={inputCls}
                value={form.section}
                disabled={!form.yearLevel}
                onChange={(e) => patchForm({ section: e.target.value })}
              >
                <option value="">{form.yearLevel ? 'Select section' : 'Select year level first'}</option>
                {(SECTION_BY_YEAR[form.yearLevel] || []).map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Room</span>
              <select className={inputCls} value={form.room} onChange={(e) => patchForm({ room: e.target.value })}>
                <option value="">Select room</option>
                {ROOM_OPTIONS.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Day</span>
              <select className={inputCls} value={form.day} onChange={(e) => patchForm({ day: e.target.value })}>
                {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Start time</span>
              <input type="time" className={inputCls} value={form.startTime} onChange={(e) => patchForm({ startTime: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">End time</span>
              <input type="time" className={inputCls} value={form.endTime} onChange={(e) => patchForm({ endTime: e.target.value })} />
            </label>
          </form>
        </section>
      </div>
    </div>
  )
}
