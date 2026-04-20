import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { hasPermission, PERMISSIONS } from '../lib/security'
import { DAYS, getScheduleById, parseMinutes, deleteSchedule, buildTimeSlots, calculateTimetableTracks } from '../lib/schedulingStore'

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)] last:border-0">
      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--text)]">{value || '-'}</span>
    </div>
  )
}

export default function SchedulingViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const canManage = hasPermission(PERMISSIONS.SCHEDULING_MANAGE)
  const canView = hasPermission(PERMISSIONS.SCHEDULING_VIEW)

  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState(null)
  const [cohortSchedules, setCohortSchedules] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const item = await getScheduleById(id)
        if (!item) {
          setLoading(false)
          return
        }
        setSchedule(item)

        setCohortSchedules([item])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const hourSlots = buildTimeSlots(6, 22)
  const timetableData = calculateTimetableTracks(cohortSchedules)

  const dayTracks = (() => {
    const counts = {}
    DAYS.forEach((d) => (counts[d] = 1))
    timetableData.forEach((item) => {
      counts[item.day] = Math.max(counts[item.day], item.totalCols || 1)
    })
    return counts
  })()

  if (!canView) {
    return <div className="p-8 text-center text-[var(--text-muted)]">You do not have access to this schedule.</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 module-page">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-[var(--accent)]" />
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="module-page max-w-xl mx-auto mt-10">
        <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
          <h2 className="text-rose-400 font-bold mb-2">Not found</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">Schedule entry does not exist or was removed.</p>
          <Link to="/scheduling" className="btn btn-secondary">← Back to Scheduling</Link>
        </div>
      </div>
    )
  }

  async function handleDelete() {
    if (!canManage) return
    if (!window.confirm('Remove this schedule from the timetable?')) return
    try {
      await deleteSchedule(id)
      navigate('/scheduling')
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="module-page max-w-5xl mx-auto w-full">
      <div className="w-full space-y-6">
        <header className="module-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="main-title font-extrabold text-[var(--text)]">{schedule.subjectCode}</h1>
            <p className="main-description text-[var(--text-muted)] mt-1">{schedule.subjectTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/scheduling" className="btn btn-secondary">← Back</Link>
            {canManage ? (
              <>
                <Link to={`/scheduling/${id}/edit`} className="btn btn-primary">Edit</Link>
                <button
                  onClick={handleDelete}
                  className="btn btn-secondary !border-rose-500/30 !text-rose-500 hover:!bg-rose-500/10"
                >
                  Delete
                </button>
              </>
            ) : null}
          </div>
        </header>

        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-6 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text)] mb-4 flex items-center gap-2">
            <span className="w-1 h-3 bg-[var(--accent)] rounded-full"></span>
            Schedule Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
            <Field label="Subject code" value={schedule.subjectCode} />
            <Field label="Subject title" value={schedule.subjectTitle} />
            <Field label="Instructor" value={schedule.instructor} />
            <Field label="Room" value={schedule.room} />
            <Field label="Day" value={schedule.day} />
            <Field label="Time" value={`${schedule.startTime} - ${schedule.endTime}`} />
            <Field label="Course" value={schedule.course} />
            <Field label="Year level" value={schedule.yearLevel} />
            <Field label="Section" value={schedule.section} />
          </div>
        </div>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--card-bg)] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-[var(--text-muted)]">Timetable</p>
              <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text)] mt-1">
                {schedule.subjectCode} | {schedule.subjectTitle} | {schedule.room}
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-bold bg-[var(--accent-soft)] text-[var(--accent)] border border-[rgba(229,118,47,0.15)] w-fit">
              Focus: {schedule.subjectCode}
            </span>
          </div>
          <div
            id="timetable-view-container"
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
                gridTemplateColumns: `80px ${DAYS.map((d) => `minmax(${dayTracks[d] * 150}px, 1fr)`).join(' ')}`,
                gridTemplateRows: `40px repeat(${hourSlots.length}, 48px)`,
                width: 'max-content',
                minWidth: '100%',
              }}
            >
              {/* Header */}
              <div className="sticky top-0 z-30 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex items-center justify-center font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-r">
                Time
              </div>
              {DAYS.map((day) => (
                <div key={day} className="sticky top-0 z-30 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex items-center justify-center font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-r border-[var(--border-color)]/30 last:border-r-0">
                  {day}
                </div>
              ))}

              {/* Grid Background */}
              {hourSlots.map((slot, sIdx) => (
                <div key={`row-${slot.key}`} className="contents">
                  <div 
                    style={{ gridRow: sIdx + 2, gridColumn: 1 }}
                    className="sticky left-0 z-20 bg-[var(--card-bg)] border-r border-[var(--border-color)] flex items-center justify-center text-[9px] font-bold text-[var(--text-muted)] border-b border(--border-color)/30 px-1 whitespace-nowrap"
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

              {/* Class Blocks */}
              {timetableData.map((item) => {
                const dayIdx = DAYS.indexOf(item.day)
                if (dayIdx === -1) return null

                const startMin = parseMinutes(item.startTime)
                const endMin = parseMinutes(item.endTime)
                const baseMin = 6 * 60 // 360
                
                const gridStart = Math.floor((startMin - baseMin) / 30) + 2
                const gridSpan = Math.max(1, Math.ceil((endMin - startMin) / 30))

                const isFocus = String(item.id) === String(schedule.id)
                const blockBg = item.day === 'Monday' ? '#1e3a8a' : (item.day === 'Tuesday' ? '#5b21b6' : (item.day === 'Wednesday' ? '#065f46' : (item.day === 'Thursday' ? '#92400e' : (item.day === 'Friday' ? '#9f1239' : '#155e75'))))

                return (
                  <div
                    key={item.id}
                    style={{
                      gridColumn: dayIdx + 2,
                      gridRow: `${gridStart} / span ${gridSpan}`,
                      marginLeft: `${(item.colIdx / item.totalCols) * 100}%`,
                      width: `${(1 / item.totalCols) * 100}%`,
                      zIndex: isFocus ? 11 : 10,
                    }}
                    className="p-[1px] h-full"
                  >
                    <div
                      className={`w-full h-full flex flex-col items-center justify-center p-2 text-center transition-all border border-white/10 rounded-sm shadow-sm ${isFocus ? 'ring-2 ring-white ring-inset' : 'opacity-90'}`}
                      style={{ background: blockBg, color: 'white' }}
                    >
                      <p className="font-bold text-[12px] leading-tight mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-full">{item.subjectCode}</p>
                      <p className="text-[10px] font-bold opacity-90 mb-0.5">
                        {item.yearLevel?.charAt(0)}{item.course?.replace('BS', '')}-{item.section}
                      </p>
                      <div className="flex flex-col opacity-90 scale-90 origin-top overflow-hidden">
                        <p className="text-[11px] font-bold mt-0.5 truncate">{item.room}</p>
                        <p className="text-[10px] truncate max-w-full opacity-80">{item.instructor}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
