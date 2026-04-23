import { useEffect, useState, useMemo } from 'react'
import { apiGetTeachingLoads, apiGetSubjects, apiCreateTeachingLoad, apiDeleteTeachingLoad } from '../lib/api'

export default function FacultyTeachingLoad() {
  const [loads, setLoads] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('authToken')

  // Form states
  const [selectedSubject, setSelectedSubject] = useState('')
  const [section, setSection] = useState('')
  const [semester, setSemester] = useState('2nd Semester 2024-2025')

  useEffect(() => {
    async function load() {
      try {
        const [lRes, sRes] = await Promise.all([
          apiGetTeachingLoads(token),
          apiGetSubjects(token)
        ])
        setLoads(lRes.teachingLoads)
        setSubjects(sRes.subjects || [])
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
    try {
      const res = await apiCreateTeachingLoad(token, {
        subjectId: selectedSubject,
        section,
        semester
      })
      setLoads([...loads, res.teachingLoad])
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px' }}>
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
          <div className="flex items-end jsutify-end">
            <button onClick={handleAdd} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>Add to Load</button>
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
                        <th>Code</th>
                        <th>Subject Name</th>
                        <th>Section</th>
                        <th>Units</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(l => (
                        <tr key={l.id} className="hover:bg-[rgba(0,0,0,0.01)] transition-colors">
                          <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                            <span className="px-2 py-1 bg-[var(--accent-soft)] text-[var(--accent)] rounded border border-[var(--accent)]/10 text-xs">
                              {l.subject?.code}
                            </span>
                          </td>
                          <td className="font-medium">{l.subject?.name}</td>
                          <td>
                            <span className="px-2 py-0.5 bg-[var(--background)] border border-[var(--border-color)] rounded text-xs font-semibold">
                              {l.section}
                            </span>
                          </td>
                          <td className="text-[var(--text-muted)] font-mono">{l.subject?.credits || 0}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button onClick={() => handleDelete(l.id)} className="text-xs px-3 py-1.5 rounded bg-rose-50/50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition border border-rose-200">Remove</button>
                          </td>
                        </tr>
                      ))}
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
