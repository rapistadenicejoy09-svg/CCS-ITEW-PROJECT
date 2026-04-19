import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hasPermission, PERMISSIONS } from '../lib/security'
import {
  DAYS,
  getSchedules,
  normalizeScheduleInput,
  createSchedule,
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

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export default function SchedulingAddPage() {
  const navigate = useNavigate()
  const canManage = hasPermission(PERMISSIONS.SCHEDULING_MANAGE)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const startTimeRef = useRef(null)
  const endTimeRef = useRef(null)
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

  if (!canManage) {
    return <div className="p-8 text-center text-[var(--text-muted)]">You do not have access to add schedules.</div>
  }

  const patchForm = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  function openTimePicker(ref) {
    const input = ref?.current
    if (!input) return
    input.focus()
    if (typeof input.showPicker === 'function') input.showPicker()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const next = normalizeScheduleInput(form)
    const requiredError = validateScheduleRequiredFields(next)
    if (requiredError) {
      setError(requiredError)
      return
    }

    setSaving(true)
    try {
      const all = await getSchedules()
      const conflictError = validateScheduleConflicts(next, all)
      if (conflictError) {
        setError(conflictError)
        return
      }
      await createSchedule(next)
      navigate('/scheduling')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="module-page max-w-5xl mx-auto w-full">
      <div className="w-full space-y-6">
        <header className="module-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="main-title font-extrabold text-[var(--text)]">Add Schedule</h1>
            <p className="main-description text-[var(--text-muted)] mt-1">
              Create a new class schedule entry.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/scheduling" className="btn btn-secondary">← Back</Link>
            <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Schedule'}
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
              <input className={inputCls} value={form.subjectCode} onChange={(e) => patchForm({ subjectCode: e.target.value })} placeholder="e.g. CCS101" />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Subject title</span>
              <input className={inputCls} value={form.subjectTitle} onChange={(e) => patchForm({ subjectTitle: e.target.value })} placeholder="Introduction to Computing" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Instructor</span>
              <input className={inputCls} value={form.instructor} onChange={(e) => patchForm({ instructor: e.target.value })} placeholder="Prof. Maria Santos" />
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
              <div className="relative">
                <input
                  ref={startTimeRef}
                  type="time"
                  className={`${inputCls} pr-10`}
                  value={form.startTime}
                  onChange={(e) => patchForm({ startTime: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => openTimePicker(startTimeRef)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1"
                  aria-label="Open start time picker"
                >
                  <IconClock />
                </button>
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">End time</span>
              <div className="relative">
                <input
                  ref={endTimeRef}
                  type="time"
                  className={`${inputCls} pr-10`}
                  value={form.endTime}
                  onChange={(e) => patchForm({ endTime: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => openTimePicker(endTimeRef)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1"
                  aria-label="Open end time picker"
                >
                  <IconClock />
                </button>
              </div>
            </label>
          </form>
        </section>
      </div>
    </div>
  )
}
