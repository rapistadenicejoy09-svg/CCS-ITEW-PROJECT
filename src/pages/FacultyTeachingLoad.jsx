import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGetTeachingLoads, apiGetSubjects, apiCreateTeachingLoad, apiDeleteTeachingLoad, apiFacultyDirectory } from '../lib/api'

export default function FacultyTeachingLoad() {
  const [loads, setLoads] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('authToken')

  // Form states
  const [selectedSubject, setSelectedSubject] = useState('')
  const [section, setSection] = useState('')
  const [semester, setSemester] = useState('2nd Semester 2024-2025')

  const [searchParams] = useSearchParams()
  const urlFacultyId = searchParams.get('facultyId')

  const [allFaculty, setAllFaculty] = useState([])
  const [selectedFacultyId, setSelectedFacultyId] = useState(urlFacultyId || '')
  const [isAdministrative, setIsAdministrative] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const authRaw = localStorage.getItem('authUser')
        const user = authRaw ? JSON.parse(authRaw) : null
        const isAdmin = ['admin', 'dean', 'department_chair', 'secretary'].includes(user?.role)
        setIsAdministrative(isAdmin)

        const [lRes, sRes, fRes] = await Promise.all([
          apiGetTeachingLoads(token),
          apiGetSubjects(token),
          isAdmin ? apiFacultyDirectory(token) : Promise.resolve({ faculty: [] })
        ])
        setLoads(lRes.teachingLoads)
        setSubjects(sRes.subjects || [])
        if (isAdmin) {
          setAllFaculty(fRes.faculty || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function handleAdd() {
    if (!selectedSubject || !section) return alert('Subject and Section are required')
    
    let targetFacultyId = selectedFacultyId
    if (!targetFacultyId && !isAdministrative) {
       // For faculty, backend might need their own ID or it might be inferred if we allow it,
       // but here we must ensure we have one if the user is admin.
       try {
         const user = JSON.parse(localStorage.getItem('authUser'))
         targetFacultyId = user.id
       } catch {}
    }

    if (!targetFacultyId) return alert('Faculty selection is required')

    try {
      const res = await apiCreateTeachingLoad(token, {
        facultyId: targetFacultyId,
        subjectId: selectedSubject,
        sectionId: section, // Backend expects sectionId
        semester
      })
      
      // Refresh to get the fully joined object
      const lRes = await apiGetTeachingLoads(token)
      setLoads(lRes.teachingLoads)
      
      setSelectedSubject('')
      setSection('')
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to remove this assignment?')) return
    try {
      await apiDeleteTeachingLoad(token, id)
      setLoads(loads.filter(l => l.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  const { groups: groupedLoads, totalUnits } = useMemo(() => {
    const groups = {}
    let units = 0
    loads.forEach(l => {
      const sem = l.semester || 'Unassigned Semester'
      if (!groups[sem]) groups[sem] = []
      groups[sem].push(l)
      units += Number(l.subject?.credits || 0)
    })
    return { groups, totalUnits: units }
  }, [loads])

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading Teaching Load...</div>

  return (
    <div className="module-page">
      <header className="module-header flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="main-title font-extrabold text-[var(--text)]">Teaching Load Management</h1>
          <p className="main-description text-[var(--text-muted)] mt-1">Oversee subject assignments and class sections.</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] px-6 py-3 rounded-xl shadow-sm flex items-center gap-4">
          <div>
            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Total Teaching Load</p>
            <p className="text-2xl font-extrabold text-[var(--accent)] leading-none">{totalUnits} <span className="text-sm text-[var(--text)]">Units</span></p>
          </div>
        </div>
      </header>

      <div className="content-panel">
        <div className="content-header">
          <div>
            <h3 className="content-title">Assign New Subject</h3>
            <p className="content-subtitle">Select a subject from the master list to assign to your load.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '12px' }}>
          {isAdministrative && (
            <div className="auth-field">
              <label className="auth-label">Faculty Member</label>
              <select className="search-input" style={{ borderRadius: 'var(--radius-md)', padding: '10px' }} value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)}>
                <option value="">Select Faculty</option>
                {allFaculty.map(f => (
                  <option key={f.id} value={f.id}>{f.full_name || f.displayName || f.identifier}</option>
                ))}
              </select>
            </div>
          )}
          <div className="auth-field">
            <label className="auth-label">Subject</label>
            <select className="search-input" style={{ borderRadius: 'var(--radius-md)', padding: '10px' }} value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>
          <div className="auth-field">
            <label className="auth-label">Section</label>
            <input type="text" className="search-input" style={{ borderRadius: 'var(--radius-md)', padding: '10px' }} placeholder="e.g. BSCS 3A" value={section} onChange={e => setSection(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="auth-label">Semester</label>
            <input type="text" className="search-input" style={{ borderRadius: 'var(--radius-md)', padding: '10px' }} value={semester} onChange={e => setSemester(e.target.value)} />
          </div>
          <div className="flex items-end justify-end">
            <button onClick={handleAdd} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>Assign Load</button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {Object.keys(groupedLoads).length === 0 ? (
          <div className="content-panel text-center p-12">
            <p className="text-[var(--text-muted)] text-sm">No teaching loads assigned yet.</p>
          </div>
        ) : (
          Object.entries(groupedLoads).map(([sem, items]) => {
             const semUnits = items.reduce((acc, i) => acc + Number(i.subject?.credits || 0), 0)
             return (
              <div key={sem} className="content-panel border-l-4 border-l-[var(--accent)]">
                <div className="content-header !border-b-0 !pb-2">
                  <div>
                    <h3 className="content-title text-lg flex items-center gap-2">
                       {sem} 
                       <span className="text-xs font-bold px-2 py-0.5 bg-[var(--background)] text-[var(--text-muted)] rounded-full border border-[var(--border-color)]">
                         {items.length} Subjects
                       </span>
                    </h3>
                  </div>
                  <span className="font-bold text-sm text-[var(--accent)]">{semUnits} Units</span>
                </div>
                <div className="table-wrapper mt-2">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Faculty</th>
                        <th>Code</th>
                        <th>Subject Name</th>
                        <th>Section</th>
                        <th>Units</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(l => {
                        const fac = allFaculty.find(f => f.id === l.faculty_id)
                        return (
                        <tr key={l.id} className="hover:bg-[rgba(0,0,0,0.01)] transition-colors">
                          <td className="text-xs font-semibold text-[var(--text-muted)]">
                            {fac ? (fac.full_name || fac.displayName) : `ID: ${l.faculty_id}`}
                          </td>
                          <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                            <span className="px-2 py-1 bg-[var(--accent-soft)] text-[var(--accent)] rounded border border-[var(--accent)]/10 text-xs">
                              {l.subject?.code}
                            </span>
                          </td>
                          <td className="font-medium">{l.subject?.name}</td>
                          <td>
                            <span className="px-2 py-0.5 bg-[var(--background)] border border-[var(--border-color)] rounded text-xs font-semibold">
                              {l.section_id || l.section}
                            </span>
                          </td>
                          <td className="text-[var(--text-muted)] font-mono">{l.subject?.credits || 0}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button onClick={() => handleDelete(l.id)} className="text-xs px-3 py-1.5 rounded bg-rose-50/50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition border border-rose-200">Remove</button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
             )
          })
        )}
      </div>
    </div>
  )
}
