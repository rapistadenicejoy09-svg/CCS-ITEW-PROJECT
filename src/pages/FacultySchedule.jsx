import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSchedules, DAYS, parseMinutes, buildTimeSlots, calculateTimetableTracks, formatCohortLabel } from '../lib/schedulingStore'

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function sectionLetter(value) {
  return normalizeText(value).replace(/[^a-z]/g, '')
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconFilter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function FacultySchedule() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // list | timetable
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterDay, setFilterDay] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')

  function getFacultySession() {
    try {
      const raw = localStorage.getItem('authUser')
      if (!raw) return { id: '', email: '', name: '' }
      const user = JSON.parse(raw)
      const id = String(user?.id ?? user?._id ?? '').trim()
      const email = String(user?.email ?? user?.identifier ?? '').trim().toLowerCase()
      const first = String(user.personal_information?.first_name || user.first_name || '')
      const last = String(user.personal_information?.last_name || user.last_name || '')
      const name =
        (first || last ? `${first} ${last}`.trim() : '') ||
        String(user.full_name || user.fullName || '').trim()
      return { id, email, name }
    } catch {
      return { id: '', email: '', name: '' }
    }
  }

  const [me] = useState(() => getFacultySession())
  const instructorName = me?.name || ''

  useEffect(() => {
    async function load() {
      try {
        const data = await getSchedules()
        setSchedules(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const mySchedules = useMemo(() => {
    const myId = String(me?.id || '').trim()
    const myEmail = String(me?.email || '').trim().toLowerCase()

    const idMatched = (s) => myId && String(s.instructorId || '').trim() === myId
    const emailMatched = (s) => myEmail && String(s.instructorEmail || '').trim().toLowerCase() === myEmail

    const legacyNameMatched = (s) => {
      if (!instructorName) return false
      const q1 = instructorName.toLowerCase().replace(/[^a-z0-9]/g, '')
      // Split to check chunks like 'maria' or 'santos' against 'Prof. Maria Santos'
      const qChunks = instructorName.toLowerCase().split(' ').filter((c) => c.length > 2)
      const inst = String(s.instructor || '').toLowerCase()
      const cleanInst = inst.replace(/[^a-z0-9]/g, '')
      if (cleanInst.includes(q1) || q1.includes(cleanInst)) return true
      return qChunks.some((chunk) => inst.includes(chunk))
    }

    return schedules.filter(s => {
      if (idMatched(s) || emailMatched(s)) return true
      // Backward-compatibility for schedules created before instructorId existed.
      return legacyNameMatched(s)
    })
  }, [schedules, instructorName, me?.email, me?.id])

  const uniqueCourses = useMemo(
    () => [...new Set(mySchedules.map((item) => String(item.course || '').trim()).filter(Boolean))].sort(),
    [mySchedules],
  )
  const uniqueYears = useMemo(
    () => [...new Set(mySchedules.map((item) => String(item.yearLevel || '').trim()).filter(Boolean))].sort(),
    [mySchedules],
  )
  const uniqueSections = useMemo(() => {
    const set = new Set()
    for (const item of mySchedules) {
      const letter = sectionLetter(item.section)
      if (letter) set.add(letter.toUpperCase())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [mySchedules])

  const scopedSchedules = useMemo(() => {
    const c = normalizeText(courseFilter)
    const y = normalizeText(yearFilter)
    const s = sectionLetter(sectionFilter)
    return mySchedules.filter((item) => {
      let itemCourse = normalizeText(item.course)
      if (itemCourse.includes('computer science') || itemCourse === 'cs') itemCourse = 'bscs'
      if (itemCourse.includes('information tech') || itemCourse === 'it') itemCourse = 'bsit'

      if (c && itemCourse !== c) return false
      if (y && normalizeText(item.yearLevel) !== y) return false

      // Match section by letter only (A/B/C...), regardless of whether stored as 3A/1A/etc.
      const itemSectLetter = sectionLetter(item.section)
      if (s && s !== itemSectLetter) return false

      return true
    })
  }, [courseFilter, mySchedules, sectionFilter, yearFilter])

  const dayScoped = useMemo(() => {
    if (!filterDay) return scopedSchedules
    return scopedSchedules.filter((item) => item.day === filterDay)
  }, [filterDay, scopedSchedules])

  const visibleSchedules = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = dayScoped.filter((item) => {
      if (!q) return true
      const hay = [
        item.subjectCode,
        item.subjectTitle,
        item.instructor,
        item.room,
        item.day,
        item.course,
        item.yearLevel,
        item.section,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
    return filtered.sort((a, b) => {
      const dayCompare = DAYS.indexOf(a.day) - DAYS.indexOf(b.day)
      if (dayCompare !== 0) return dayCompare
      return parseMinutes(a.startTime) - parseMinutes(b.startTime)
    })
  }, [dayScoped, search])

  const hasActiveFilters = Boolean(search.trim() || courseFilter || yearFilter || sectionFilter || filterDay)

  const hourSlots = useMemo(() => buildTimeSlots(6, 22), [])
  const timetableData = useMemo(() => calculateTimetableTracks(visibleSchedules), [visibleSchedules])
  const dayTracks = useMemo(() => {
    const counts = {}
    DAYS.forEach((d) => (counts[d] = 1))
    timetableData.forEach((item) => {
      counts[item.day] = Math.max(counts[item.day], item.totalCols || 1)
    })
    return counts
  }, [timetableData])

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading Schedule...</div>

  return (
    <div className="module-page">
      <header className="module-header">
        <div>
          <h1 className="main-title font-extrabold text-[var(--text)]">My Assigned Schedule</h1>
          <p className="main-description text-[var(--text-muted)] mt-1">
             View your official weekly class schedule assigned by the administrator. 
             If you detect any issues, please contact the college administration.
          </p>
        </div>
      </header>

      <div className="content-panel shadow-sm mt-8">
        <div className="content-header !pb-2">
          <div>
            <h3 className="content-title">My schedules</h3>
            <p className="text-xs mt-1 text-[var(--text-muted)]">
              Showing schedules assigned to <strong>{instructorName || me?.email || 'Unknown Faculty'}</strong>.
            </p>
          </div>
        </div>

        <div className="pb-4">
          <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
              <div className="relative flex-1 w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <IconSearch />
                </div>
                <input
                  type="text"
                  placeholder="Search code, title, room…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input w-full !pl-10"
                />
              </div>

              <div className="flex items-center gap-1 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn btn-compact flex items-center justify-center gap-1.5 !px-3 !py-1.5 ${showFilters || hasActiveFilters ? 'btn-primary' : 'btn-secondary'}`}
                  title="Filters"
                >
                  <IconFilter />
                  <span className="text-xs font-semibold hidden md:inline">Filters</span>
                </button>
                <div className="w-[1px] h-6 bg-[rgba(255,255,255,0.1)] mx-1" />
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`btn btn-compact flex items-center justify-center !p-1.5 ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                  title="List view"
                >
                  <IconList />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('timetable')}
                  className={`btn btn-compact flex items-center justify-center !p-1.5 ${viewMode === 'timetable' ? 'btn-primary' : 'btn-secondary'}`}
                  title="Weekly grid"
                >
                  <IconCalendar />
                </button>
              </div>
            </div>

            {showFilters ? (
              <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="flex flex-col gap-1.5 w-full md:w-[200px]">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Program</span>
                  <select className="search-input w-full !rounded-md !py-2 appearance-none" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                    <option value="">All programs</option>
                    {uniqueCourses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 w-full md:w-[200px]">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Year level</span>
                  <select className="search-input w-full !rounded-md !py-2 appearance-none" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                    <option value="">All years</option>
                    {uniqueYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 w-full md:w-[200px]">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Section</span>
                  <select className="search-input w-full !rounded-md !py-2 appearance-none" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                    <option value="">All sections</option>
                    {uniqueSections.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 w-full md:w-[180px]">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Day</span>
                  <select className="search-input w-full !rounded-md !py-2 appearance-none" value={filterDay} onChange={(e) => setFilterDay(e.target.value)}>
                    <option value="">All days</option>
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>

                {hasActiveFilters ? (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('')
                        setCourseFilter('')
                        setYearFilter('')
                        setSectionFilter('')
                        setFilterDay('')
                      }}
                      className="px-5 py-2 rounded-full border border-[var(--border-color)] bg-transparent hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        {viewMode === 'list' ? (
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm transition-shadow duration-300 hover:shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4 w-[15%]">Day</th>
                    <th className="px-6 py-4 w-[20%]">Time</th>
                    <th className="px-6 py-4 w-[35%]">Subject</th>
                    <th className="px-6 py-4 w-[15%]">Section</th>
                    <th className="px-6 py-4 w-[15%]">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                {DAYS.map((d) => {
                  const daySchedules = visibleSchedules.filter((s) => s.day === d)
                  if (daySchedules.length === 0) return null
                  return daySchedules.map((s, idx) => (
                    <tr key={s.id} className="admin-student-list-row hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                      <td className="px-6 py-4 align-middle">
                        {idx === 0 ? (
                          <div className="font-extrabold text-[var(--accent)] bg-[rgba(var(--accent-rgb),0.05)] px-3 py-2 rounded-lg inline-flex flex-col border border-[var(--accent)]/10">
                            {d}
                            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">{daySchedules.length} Classes</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-[var(--text-muted)] whitespace-nowrap align-middle">
                        <span className="font-semibold text-[var(--text)]">{s.startTime}</span> - <span>{s.endTime}</span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text)] text-sm">{s.subjectCode}</span>
                          <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]" title={s.subjectTitle}>{s.subjectTitle}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--background)] border border-[var(--border-color)] text-[var(--text)]">
                            {formatCohortLabel(s.course, s.yearLevel, s.section)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50">
                          Room: {s.room}
                        </span>
                      </td>
                    </tr>
                  ))
                })}
                {visibleSchedules.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-[var(--text-muted)] text-sm">No classes assigned to you yet.</td></tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-sm overflow-hidden mt-4">
            <div
              className="overflow-x-auto custom-scrollbar active:cursor-grabbing cursor-grab select-none"
              onMouseDown={(e) => {
                const el = e.currentTarget
                el.dataset.isDragging = 'true'
                el.dataset.startX = e.pageX - el.offsetLeft
                el.dataset.scrollLeft = el.scrollLeft
              }}
              onMouseMove={(e) => {
                const el = e.currentTarget
                if (el.dataset.isDragging !== 'true') return
                e.preventDefault()
                const x = e.pageX - el.offsetLeft
                const walk = (x - Number(el.dataset.startX)) * 2
                el.scrollLeft = Number(el.dataset.scrollLeft) - walk
              }}
              onMouseUp={(e) => (e.currentTarget.dataset.isDragging = 'false')}
              onMouseLeave={(e) => (e.currentTarget.dataset.isDragging = 'false')}
            >
              <div
                className="relative grid"
                style={{
                  gridTemplateColumns: `80px ${DAYS.map((d) => `minmax(${dayTracks[d] * 66}px, 1fr)`).join(' ')}`,
                  gridTemplateRows: `40px repeat(${hourSlots.length}, 48px)`,
                  width: 'max-content',
                  minWidth: '100%',
                }}
              >
                <div className="sticky top-0 z-30 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex items-center justify-center font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-r">
                  Time
                </div>
                {DAYS.map((day) => (
                  <div key={day} className="sticky top-0 z-30 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex items-center justify-center font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-r border-[var(--border-color)]/30 last:border-r-0">
                    {day}
                  </div>
                ))}

                {hourSlots.map((slot, sIdx) => (
                  <div key={`row-${slot.key}`} className="contents">
                    <div
                      style={{ gridRow: sIdx + 2, gridColumn: 1 }}
                      className="sticky left-0 z-20 bg-[var(--card-bg)] border-r border-[var(--border-color)] flex items-center justify-center text-[9px] font-bold text-[var(--text-muted)] border-b border-[var(--border-color)]/30 px-1 whitespace-nowrap"
                    >
                      {slot.from}-{slot.to}
                    </div>
                    {DAYS.map((day, dIdx) => (
                      <div
                        key={`${day}-${slot.key}`}
                        style={{ gridRow: sIdx + 2, gridColumn: dIdx + 2 }}
                        className="border-b border-[var(--border-color)]/30 border-r border-[var(--border-color)]/30 last:border-r-0"
                      />
                    ))}
                  </div>
                ))}

                {timetableData.map((item) => {
                  const dayIdx = DAYS.indexOf(item.day)
                  if (dayIdx === -1) return null

                  const startMin = parseMinutes(item.startTime)
                  const endMin = parseMinutes(item.endTime)
                  const baseMin = 6 * 60
                  const gridStart = Math.floor((startMin - baseMin) / 30) + 2
                  const gridSpan = Math.max(1, Math.ceil((endMin - startMin) / 30))
                  const blockBg = item.day === 'Monday'
                    ? '#1e3a8a'
                    : (item.day === 'Tuesday'
                      ? '#5b21b6'
                      : (item.day === 'Wednesday'
                        ? '#065f46'
                        : (item.day === 'Thursday'
                          ? '#92400e'
                          : (item.day === 'Friday' ? '#9f1239' : '#155e75'))))

                  return (
                    <div
                      key={item.id}
                      style={{
                        gridColumn: dayIdx + 2,
                        gridRow: `${gridStart} / span ${gridSpan}`,
                        marginLeft: `${(item.colIdx / item.totalCols) * 100}%`,
                        width: `${(1 / item.totalCols) * 100}%`,
                        zIndex: 10,
                      }}
                      className="p-[1px] h-full"
                    >
                      <Link
                        to={`/scheduling/${item.id}`}
                        className="w-full h-full flex flex-col items-center justify-center p-2 text-center transition-all hover:brightness-110 active:scale-[0.98] border border-white/10 rounded-sm shadow-sm"
                        style={{ background: blockBg, color: 'white' }}
                      >
                        <p className="font-bold text-[12px] leading-tight mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-full">{item.subjectCode}</p>
                        <p className="text-[10px] font-bold opacity-90 mb-0.5">
                          {formatCohortLabel(item.course, item.yearLevel, item.section)}
                        </p>
                        <div className="flex flex-col opacity-90 scale-90 origin-top overflow-hidden">
                          <p className="text-[11px] font-bold mt-0.5 truncate">{item.room}</p>
                          <p className="text-[10px] truncate max-w-full opacity-80">{item.instructor}</p>
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
