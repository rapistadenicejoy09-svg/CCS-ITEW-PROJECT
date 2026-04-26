import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { hasPermission, PERMISSIONS } from '../lib/security'
import { apiFacultyDirectory, apiGetSubjects, apiGetTeachingLoads } from '../lib/api'
import { useRef } from 'react'
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

function getFacultyName(f) {
  return (
    String(f.displayName || f.fullName || f.full_name || '').trim() ||
    String(f.personal_information?.fullName || f.personal_information?.full_name || '').trim() ||
    [f.personal_information?.first_name, f.personal_information?.last_name].filter(Boolean).join(' ') ||
    String(f.email || '').trim() ||
    'Unnamed Faculty'
  )
}

export default function SchedulingEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const canManage = hasPermission(PERMISSIONS.SCHEDULING_MANAGE)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [facultyLoading, setFacultyLoading] = useState(true)
  const [facultyError, setFacultyError] = useState('')
  const [faculty, setFaculty] = useState([])
  const [instructorSearch, setInstructorSearch] = useState('')
  const [form, setForm] = useState({
    subjectCode: '',
    subjectTitle: '',
    subjectId: '',
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

  const [instructorOpen, setInstructorOpen] = useState(false)
  const instructorWrapRef = useRef(null)
  const instructorQueryRef = useRef(null)

  useEffect(() => {
    async function loadResources() {
      setFacultyLoading(true)
      setFacultyError('')
      try {
        const token = localStorage.getItem('authToken')
        if (!token) throw new Error('Missing auth token.')
        
        const [fRes, sRes, lRes, existing] = await Promise.all([
          apiFacultyDirectory(token),
          apiGetSubjects(token),
          apiGetTeachingLoads(token),
          getScheduleById(id)
        ])

        const fList = Array.isArray(fRes?.faculty) ? fRes.faculty : []
        const sList = Array.isArray(sRes?.subjects) ? sRes.subjects : []
        setFaculty(fList)
        setSubjects(sList)
        setLoads(Array.isArray(lRes?.teachingLoads) ? lRes.teachingLoads : [])

        if (existing) {
          // Attempt to find subjectId from subjects if missing in existing
          const subj = sList.find(s => s.code === existing.subjectCode)
          setForm({
            subjectCode: existing.subjectCode || '',
            subjectTitle: existing.subjectTitle || '',
            subjectId: subj?.id || '',
            instructor: existing.instructor || '',
            instructorId: existing.instructorId || '',
            instructorEmail: existing.instructorEmail || '',
            course: existing.course || '',
            yearLevel: existing.yearLevel || '',
            section: existing.section || '',
            day: existing.day || 'Monday',
            startTime: existing.startTime || '08:00',
            endTime: existing.endTime || '09:00',
            room: existing.room || '',
          })
        } else {
          setError('Schedule not found.')
        }
      } catch (e) {
        setFaculty([])
        setFacultyError(e?.message || 'Failed to load resources.')
      } finally {
        setFacultyLoading(false)
        setLoading(false)
      }
    }
    loadResources()
  }, [id])

  const facultyOptions = useMemo(() => {
    const cleaned = (faculty || [])
      .filter((f) => f && (f.role === 'faculty' || f.role === 'dean' || f.role === 'department_chair' || f.role === 'secretary' || f.role === 'faculty_professor'))
      .map((f) => ({
        id: String(f.id ?? '').trim(),
        email: String(f.email ?? '').trim().toLowerCase(),
        name: getFacultyName(f),
        isActive: f.is_active !== false && f.is_active !== 0,
      }))
      .filter((f) => f.id || f.email)
    cleaned.sort((a, b) => a.name.localeCompare(b.name))
    return cleaned
  }, [faculty])

  const filteredFacultyOptions = useMemo(() => {
    const q = instructorSearch.trim().toLowerCase()
    if (!q) return facultyOptions
    return facultyOptions.filter((f) => {
      const hay = `${f.name} ${f.email}`.toLowerCase()
      return hay.includes(q)
    })
  }, [facultyOptions, instructorSearch])

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
    
    const fullSection = `${form.course} ${form.section}`
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
    const onDocMouseDown = (e) => {
      if (instructorWrapRef.current && !instructorWrapRef.current.contains(e.target)) setInstructorOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [instructorOpen])

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

        {(error || facultyError) ? (
          <div className="p-4 rounded-xl text-rose-400 bg-rose-500/10 border border-rose-500/20 text-sm font-semibold">
            {error || facultyError}
          </div>
        ) : null}

        <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <label className="flex flex-col gap-1.5 sm:col-span-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Subject (Master Subjects)</span>
              <div className="relative" ref={subjectWrapRef}>
                <button
                  type="button"
                  onClick={() => setSubjectOpen(!subjectOpen)}
                  className={`${inputCls} flex items-center justify-between gap-2 text-left`}
                >
                  <span className={`truncate ${subjectLabel ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                    {subjectLabel || 'Select subject...'}
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
                    <div className="max-h-56 overflow-auto py-1 text-xs">
                      {filteredSubjects.length > 0 ? (
                        filteredSubjects.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              patchForm({ subjectId: s.id, subjectCode: s.code, subjectTitle: s.name })
                              setSubjectOpen(false)
                              setSubjectQuery('')
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-[rgba(0,0,0,0.04)]"
                          >
                            <span className="block font-bold">{s.code}</span>
                            <span className="block opacity-70">{s.name}</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center opacity-60">No matching subjects.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Instructor (Faculty)</span>
              <div className="relative" ref={instructorWrapRef}>
                <button
                  type="button"
                  disabled={facultyLoading || facultyOptions.length === 0}
                  onClick={() => setInstructorOpen(!instructorOpen)}
                  className={`${inputCls} flex items-center justify-between gap-2 text-left ${facultyLoading || facultyOptions.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className={`truncate ${instructorSelectedLabel ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                    {facultyLoading ? 'Loading...' : (instructorSelectedLabel || 'Select faculty...')}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </button>

                {instructorOpen && (
                  <div className="absolute z-[60] mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-[var(--border-color)]">
                      <input
                        ref={instructorQueryRef}
                        className="search-input w-full !rounded-lg"
                        value={instructorSearch}
                        onChange={(e) => setInstructorSearch(e.target.value)}
                        placeholder="Search name or email..."
                      />
                    </div>
                    <div className="max-h-56 overflow-auto py-1 text-xs">
                      {filteredFacultyOptions.length > 0 ? (
                        filteredFacultyOptions.map(f => (
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
                              setInstructorSearch('')
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-[rgba(0,0,0,0.04)] ${!f.isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <span className="block font-bold">{f.name}</span>
                            <span className="block opacity-70">{f.email}</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center opacity-60">No faculty found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
