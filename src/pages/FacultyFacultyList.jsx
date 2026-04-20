import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFacultyDirectory } from '../lib/api'

function getFacultyName(f) {
  return (
    String(f.displayName || f.fullName || f.full_name || '').trim() ||
    String(f.personal_information?.fullName || f.personal_information?.full_name || '').trim() ||
    [f.personal_information?.first_name, f.personal_information?.last_name].filter(Boolean).join(' ') ||
    'Unnamed Faculty'
  )
}

function getFacultyDept(f) {
  return (f.summary?.department || f.department || 'General').trim()
}

function getFacultySpec(f) {
  return (f.summary?.specialization || f.specialization || '').trim()
}

function formatFacultyRole(role) {
  if (role === 'dean') return 'College Dean'
  if (role === 'department_chair') return 'Department Chair'
  if (role === 'secretary') return 'College Secretary'
  if (role === 'faculty_professor') return 'Professor'
  if (role === 'faculty') return 'Faculty (Basic)'
  return 'Faculty'
}

function getRole() {
  try {
    const raw = localStorage.getItem('authUser')
    const user = raw ? JSON.parse(raw) : null
    return user?.role || null
  } catch {
    return null
  }
}

function IconFilter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  )
}

function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  )
}

export default function FacultyFacultyList() {
  const role = getRole()
  const isFacultyRole = ['faculty', 'dean', 'department_chair', 'secretary', 'faculty_professor', 'admin'].includes(role)

  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('grid')

  const loadFaculty = useCallback(async () => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setError('Missing auth token.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await apiFacultyDirectory(token)
      setFaculty(Array.isArray(res?.faculty) ? res.faculty : [])
    } catch (e) {
      setError(e?.message || 'Failed to load faculty list.')
      setFaculty([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isFacultyRole) {
      setLoading(false)
      return
    }
    loadFaculty()
  }, [isFacultyRole, loadFaculty])

  const deptOptions = useMemo(() => {
    const set = new Set()
    for (const f of faculty) {
      const d = (f.summary?.department || f.department || '').trim()
      if (d) set.add(d)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [faculty])

  const filteredFaculty = useMemo(() => {
    const q = search.trim().toLowerCase()
    return faculty.filter((f) => {
      if (q) {
        const mail = String(f.email || '').toLowerCase()
        const fullName = getFacultyName(f).toLowerCase()
        if (!mail.includes(q) && !fullName.includes(q)) return false
      }
      if (filterRole && f.role !== filterRole) return false
      if (filterDept && getFacultyDept(f) !== filterDept) return false
      return true
    })
  }, [faculty, search, filterRole, filterDept])

  const hasActiveFilters = Boolean(search.trim() || filterRole || filterDept)

  if (!isFacultyRole) {
    return <div className="p-8 text-center text-[var(--text-muted)]">Not available for your role.</div>
  }

  return (
    <div className="module-page">
      <div className="w-full space-y-6">
        <header className="module-header flex flex-col md:flex-row justify-between items-start md:items-center admin-student-list-header-enter">
          <div>
            <h1 className="main-title font-extrabold text-[var(--text)]">Faculty List</h1>
            <p className="main-description text-[var(--text-muted)] mt-1">
              View-only directory for collaboration across professors and academic staff.
            </p>
          </div>
        </header>

        {error && (
          <div
            className="p-4 rounded-xl text-rose-600 bg-rose-50 border border-rose-200 admin-animate-reveal"
            style={{ animationDelay: '0.06s' }}
          >
            {error}
          </div>
        )}

        <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 md:p-6 shadow-sm admin-student-list-toolbar-enter">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input w-full"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`btn flex items-center gap-2 ${showFilters || hasActiveFilters ? 'btn-primary' : 'btn-secondary'}`}
              >
                <IconFilter /> Filters
                {hasActiveFilters && (
                  <span className={`w-1.5 h-1.5 rounded-full ${showFilters || hasActiveFilters ? 'bg-[#1a0d05]' : 'bg-[var(--accent)]'}`} />
                )}
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`btn btn-compact flex items-center justify-center !p-1.5 ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                  title="List View"
                >
                  <IconList />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`btn btn-compact flex items-center justify-center !p-1.5 ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                  title="Grid View"
                >
                  <IconGrid />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-5 pt-5 border-t border-[var(--border-color)] animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold ml-1">System Role</label>
                  <select
                    className="search-input appearance-none w-full"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="dean">Dean</option>
                    <option value="department_chair">Department Chair</option>
                    <option value="secretary">Secretary</option>
                    <option value="faculty_professor">Professor</option>
                    <option value="faculty">Faculty (Basic)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold ml-1">Department</label>
                  <select
                    className="search-input appearance-none w-full"
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {deptOptions.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setFilterRole(''); setFilterDept(''); }}
                    className="px-5 py-2 rounded-full border border-[var(--border-color)] bg-transparent hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-4 admin-student-list-section-enter">
          <h2 className="text-xl font-bold px-1 flex items-center gap-2 text-[var(--text)]">
            <span className="w-6 h-[2px] bg-[var(--accent)]"></span>
            Faculty Members
            {filteredFaculty.length > 0 && (
              <span className="px-2 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] rounded-full text-xs ml-2">
                {filteredFaculty.length}
              </span>
            )}
          </h2>

          {loading ? (
            <div className="flex justify-center p-12 text-[var(--accent)]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
            </div>
          ) : filteredFaculty.length === 0 ? (
            <div className="text-center p-12 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)]">
              <p className="text-[var(--text-muted)] text-sm">No faculty members found.</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' && (
                <div className="admin-student-card-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredFaculty.map((f, idx) => (
                    <div
                      key={f.id}
                      className="admin-student-card group flex flex-col bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-[var(--accent)] rounded-[var(--radius-md)] overflow-hidden admin-student-card-animate"
                      style={{ animationDelay: `${Math.min(idx, 14) * 0.055}s` }}
                    >
                      <div className="p-5 pb-3 border-b border-[var(--border-color)] flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-bold text-[var(--text)] mb-0.5 leading-tight">{getFacultyName(f)}</h3>
                          <p className="text-[var(--accent)] font-mono text-xs">{f.email || '—'}</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Active
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col gap-4 text-sm">
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold mb-1 tracking-wider">Academic Role</p>
                            <p className="text-[var(--text)] text-sm font-bold">{formatFacultyRole(f.role)}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold mb-1 tracking-wider">Department &amp; Specialization</p>
                          <p className="text-[var(--text)] text-sm font-semibold">{getFacultyDept(f)}</p>
                          {getFacultySpec(f) ? (
                            <p className="text-[var(--accent)] text-[11px] mt-0.5 italic">{getFacultySpec(f)}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-3 bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)] flex justify-end gap-2 border-t border-[var(--border-color)]">
                        <span className="text-[11px] text-[var(--text-muted)] font-semibold px-2">
                          View only
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm transition-shadow duration-300 hover:shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold">
                        <tr>
                          <th className="px-6 py-4">Name &amp; Email</th>
                          <th className="px-6 py-4">System Role</th>
                          <th className="px-6 py-4">Department</th>
                          <th className="px-6 py-4">Specialization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {filteredFaculty.map((f, idx) => (
                          <tr
                            key={f.id}
                            className="admin-student-list-row admin-student-table-row-enter hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-[rgba(255,255,255,0.01)]"
                            style={{ '--row-enter-delay': `${Math.min(idx, 16) * 0.035}s` }}
                          >
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--text)]">{getFacultyName(f)}</span>
                                <span className="text-xs text-[var(--accent)] font-mono">{f.email || '—'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[var(--text)] font-semibold">{formatFacultyRole(f.role)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[var(--text)]">{getFacultyDept(f)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[var(--text-muted)]">{getFacultySpec(f) || '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

