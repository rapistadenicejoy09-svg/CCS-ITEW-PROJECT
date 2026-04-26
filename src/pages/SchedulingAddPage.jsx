import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hasPermission, PERMISSIONS } from '../lib/security'
import { apiFacultyDirectory, apiGetSubjects, apiGetTeachingLoads } from '../lib/api'
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

function getFacultyName(f) {
  return (
    String(f.displayName || f.fullName || f.full_name || '').trim() ||
    String(f.personal_information?.fullName || f.personal_information?.full_name || '').trim() ||
    [f.personal_information?.first_name, f.personal_information?.last_name].filter(Boolean).join(' ') ||
    String(f.email || '').trim() ||
    'Unnamed Faculty'
  )
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
  const [facultyLoading, setFacultyLoading] = useState(true)
  const [facultyError, setFacultyError] = useState('')
  const [faculty, setFaculty] = useState([])
  const [instructorOpen, setInstructorOpen] = useState(false)
  const [instructorQuery, setInstructorQuery] = useState('')
  const instructorWrapRef = useRef(null)
  const instructorQueryRef = useRef(null)
  const startTimeRef = useRef(null)
  const endTimeRef = useRef(null)
  const [form, setForm] = useState({
    subjectCode: '',
    subjectTitle: '',
    subjectId: '', // New field for linked subject
    instructor: '',
    instructorId: '',
    instructorEmail: '',
    course: '',
    yearLevel: '',
    section: '',
    day: 'Monday',
    startTime: '08:00',
    endTime: '09:00',
    room: '',
  })

  // Added states for connection
  const [subjects, setSubjects] = useState([])
  const [loads, setLoads] = useState([])
  const [subjectOpen, setSubjectOpen] = useState(false)
  const [subjectQuery, setSubjectQuery] = useState('')
  const subjectWrapRef = useRef(null)
  const subjectQueryRef = useRef(null)

  if (!canManage) {
    return <div className="p-8 text-center text-[var(--text-muted)]">You do not have access to add schedules.</div>
  }

  useEffect(() => {
    async function loadResources() {
      setFacultyLoading(true)
      setFacultyError('')
      try {
        const token = localStorage.getItem('authToken')
        if (!token) throw new Error('Missing auth token.')
        
        const [fRes, sRes, lRes] = await Promise.all([
          apiFacultyDirectory(token),
          apiGetSubjects(token),
          apiGetTeachingLoads(token)
        ])

        setFaculty(Array.isArray(fRes?.faculty) ? fRes.faculty : [])
        setSubjects(Array.isArray(sRes?.subjects) ? sRes.subjects : [])
        setLoads(Array.isArray(lRes?.teachingLoads) ? lRes.teachingLoads : [])
      } catch (e) {
        setFaculty([])
        setFacultyError(e?.message || 'Failed to load resources.')
      } finally {
        setFacultyLoading(false)
      }
    }
    loadResources()
  }, [])

  const facultyOptions = useMemo(() => {
    const cleaned = (faculty || [])
      .filter((f) => f && (f.role === 'faculty' || f.role === 'dean' || f.role === 'department_chair' || f.role === 'secretary' || f.role === 'faculty_professor'))
      .map((f) => ({
        id: String(f.id ?? '').trim(),
        email: String(f.email ?? '').trim().toLowerCase(),
        name: getFacultyName(f),
        isActive: f.is_active !== false && f.is_active !== 0,
        raw: f,
      }))
      .filter((f) => f.id || f.email)
    cleaned.sort((a, b) => a.name.localeCompare(b.name))
    return cleaned
  }, [faculty])

  const filteredFacultyOptions = useMemo(() => {
    const q = instructorQuery.trim().toLowerCase()
    if (!q) return facultyOptions
    return facultyOptions.filter((f) => {
      const hay = `${f.name} ${f.email}`.toLowerCase()
      return hay.includes(q)
    })
  }, [facultyOptions, instructorQuery])

  const patchForm = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const instructorSelectedLabel = useMemo(() => {
    if (form.instructor) return form.instructor
    if (form.instructorId) {
      const hit = facultyOptions.find((f) => String(f.id) === String(form.instructorId))
      if (hit) return hit.name
    }
    return ''
  }, [facultyOptions, form.instructor, form.instructorId])

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.toLowerCase()
    if (!q) return subjects
    return subjects.filter(s => 
      s.code.toLowerCase().includes(q) || 
      s.name.toLowerCase().includes(q)
    )
  }, [subjects, subjectQuery])

  const subjectLabel = useMemo(() => {
    if (form.subjectId) {
      const hit = subjects.find(s => String(s.id) === String(form.subjectId))
      if (hit) return `${hit.code} - ${hit.name}`
    }
    return form.subjectCode ? `${form.subjectCode} - ${form.subjectTitle}` : ''
  }, [subjects, form.subjectId, form.subjectCode, form.subjectTitle])

  // Logic to auto-suggest instructor based on Teaching Load
  useEffect(() => {
    if (!form.subjectId || !form.course || !form.section) return
    
    const fullSection = `${form.course} ${form.section}` // e.g. BSCS 3A
    const match = loads.find(l => 
      String(l.subject_id) === String(form.subjectId) && 
      (l.section === fullSection || l.section_id === fullSection)
    )

    if (match) {
      const f = facultyOptions.find(opt => String(opt.id) === String(match.faculty_id))
      if (f) {
        patchForm({
          instructorId: f.id,
          instructorEmail: f.email,
          instructor: f.name
        })
      }
    }
  }, [form.subjectId, form.course, form.section, loads, facultyOptions])

  useEffect(() => {
    if (!subjectOpen) return
    const t = setTimeout(() => subjectQueryRef.current?.focus(), 0)
    const onDocMouseDown = (e) => {
      if (subjectWrapRef.current && !subjectWrapRef.current.contains(e.target)) setSubjectOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [subjectOpen])

  useEffect(() => {
    if (!instructorOpen) return
    const t = setTimeout(() => instructorQueryRef.current?.focus(), 0)

    function onDocMouseDown(e) {
      const wrap = instructorWrapRef.current
      if (!wrap) return
      if (wrap.contains(e.target)) return
      setInstructorOpen(false)
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') setInstructorOpen(false)
    }

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [instructorOpen])

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
              Create a new class schedule entry and assign it to a faculty member.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/scheduling" className="btn btn-secondary">← Back</Link>
            <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </header>

        {(error || facultyError) ? (
          <div className="p-4 rounded-xl text-rose-400 bg-rose-500/10 border border-rose-500/20 text-sm font-semibold">
            {error || facultyError}
          </div>
        ) : null}

        <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-sm overflow-hidden">
          <div className="p-6 md:p-7 border-b border-[var(--border-color)] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)]">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--text)]">Schedule details</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">Fill in the fields below. Conflicts will be checked before saving.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-7 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <label className="flex flex-col gap-1.5 sm:col-span-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Subject (From Master List)</span>
              <div className="relative" ref={subjectWrapRef}>
                <button
                  type="button"
                  onClick={() => setSubjectOpen(!subjectOpen)}
                  className={`${inputCls} flex items-center justify-between gap-2 text-left`}
                >
                  <span className={`truncate ${subjectLabel ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                    {subjectLabel || 'Search and select subject...'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </button>

                {subjectOpen && (
                  <div className="absolute z-[60] mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-[var(--border-color)]">
                      <input
                        ref={subjectQueryRef}
                        className="search-input w-full !rounded-lg"
                        value={subjectQuery}
                        onChange={(e) => setSubjectQuery(e.target.value)}
                        placeholder="Search code or title..."
                      />
                    </div>
                    <div className="max-h-56 overflow-auto py-1">
                      {filteredSubjects.length > 0 ? (
                        filteredSubjects.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              patchForm({
                                subjectId: s.id,
                                subjectCode: s.code,
                                subjectTitle: s.name
                              })
                              setSubjectOpen(false)
                              setSubjectQuery('')
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-[rgba(0,0,0,0.04)] transition-colors"
                          >
                            <span className="block font-bold text-[var(--text)]">{s.code}</span>
                            <span className="block text-xs text-[var(--text-muted)]">{s.name}</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-[var(--text-muted)]">No subjects found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[var(--accent)] font-medium italic">
                Connects directly to Teaching Loads to suggest faculty.
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Instructor</span>
              <div className="relative" ref={instructorWrapRef}>
                <button
                  type="button"
                  disabled={facultyLoading || facultyOptions.length === 0}
                  onClick={() => setInstructorOpen((v) => !v)}
                  className={`${inputCls} flex items-center justify-between gap-2 !text-left ${facultyLoading || facultyOptions.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                  aria-haspopup="listbox"
                  aria-expanded={instructorOpen ? 'true' : 'false'}
                >
                  <span className={`truncate ${instructorSelectedLabel ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                    {facultyLoading
                      ? 'Loading faculty...'
                      : facultyOptions.length
                        ? (instructorSelectedLabel || 'Select faculty')
                        : 'No faculty records found'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {instructorOpen ? (
                  <div className="absolute z-50 mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-[var(--border-color)] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)]">
                      <input
                        ref={instructorQueryRef}
                        className="search-input w-full !rounded-lg"
                        value={instructorQuery}
                        onChange={(e) => setInstructorQuery(e.target.value)}
                        placeholder="Search faculty name or email..."
                      />
                    </div>
                    <div className="max-h-56 overflow-auto custom-scrollbar py-1" role="listbox">
                      {filteredFacultyOptions.length ? (
                        filteredFacultyOptions.map((f) => (
                          <button
                            key={f.id || f.email}
                            type="button"
                            disabled={!f.isActive}
                            onClick={() => {
                              patchForm({
                                instructorId: f.id || '',
                                instructorEmail: f.email || '',
                                instructor: f.name || '',
                              })
                              setInstructorOpen(false)
                              setInstructorQuery('')
                            }}
                            className={`w-full px-3 py-2 text-left text-sm flex items-start justify-between gap-3 hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors ${!f.isActive ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <span className="min-w-0">
                              <span className="block font-semibold text-[var(--text)] truncate">{f.name}</span>
                              <span className="block text-xs text-[var(--text-muted)] truncate">{f.email || '—'}</span>
                            </span>
                            {!f.isActive ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-0.5 shrink-0">Inactive</span>
                            ) : null}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
                          No matching faculty found.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                {form.instructor ? `Selected: ${form.instructor}` : 'Choose from the faculty list.'}
              </span>
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

          <div className="px-6 md:px-7 pb-6 md:pb-7 -mt-2">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-4">
              <div className="text-xs text-[var(--text-muted)]">
                <span className="font-bold text-[var(--text)]">Tip:</span> Use the instructor dropdown to ensure the schedule appears in that faculty member&apos;s “My Assigned Schedule”.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
