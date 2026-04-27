import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGetTeachingLoads, apiGetSubjects, apiCreateTeachingLoad, apiDeleteTeachingLoad, apiFacultyDirectory } from '../lib/api'
import { COURSE_OPTIONS, YEAR_OPTIONS, getExpectedCodes } from '../lib/curriculum'

export default function FacultyTeachingLoad() {
  const [loads, setLoads] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingFacultyId, setViewingFacultyId] = useState(null)

  const token = localStorage.getItem('authToken')

  // Form states
  const [selectedSubject, setSelectedSubject] = useState('')
  const [sectionCourse, setSectionCourse] = useState('BSIT')
  const [sectionYear, setSectionYear] = useState('1st Year')
  const [sectionLetter, setSectionLetter] = useState('')
  const [semester, setSemester] = useState('2nd Semester 2024-2025')

  const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E']
  const SEMESTER_OPTIONS = [
    '1st Semester 2024-2025',
    '2nd Semester 2024-2025',
    '1st Semester 2025-2026',
    '2nd Semester 2025-2026',
    '1st Semester 2026-2027',
    '2nd Semester 2026-2027',
  ]

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
    if (!selectedSubject || !sectionCourse || !sectionYear || !sectionLetter) {
      return alert('Subject and all section details (Course, Year, Letter) are required')
    }
    
    // Construct full section string, e.g. "BSCS 3A"
    const yearDigit = sectionYear.charAt(0)
    const fullSection = `${sectionCourse} ${yearDigit}${sectionLetter}`

    let targetFacultyId = selectedFacultyId
    if (!targetFacultyId && !isAdministrative) {
       try {
         const user = JSON.parse(localStorage.getItem('authUser'))
         targetFacultyId = user.id
       } catch {}
    }

    if (!targetFacultyId) return alert('Faculty selection is required')

    // Enforce 18-unit limit
    const currentSemLoads = loads.filter(l => 
        String(l.faculty_id) === String(targetFacultyId) && 
        (l.semester || 'Unassigned Semester') === semester
    )
    const assignedUnits = currentSemLoads.reduce((acc, l) => acc + Number(l.subject?.credits || 0), 0)
    
    const subjectToAdd = subjects.find(s => String(s.id) === String(selectedSubject))
    const newUnits = Number(subjectToAdd?.credits || 0)

    if (assignedUnits + newUnits > 18) {
       return alert(`Assignment blocked: Overload.\n\nA professor is only allowed a maximum of 18 units per semester.\nCurrent Load: ${assignedUnits} units\nSubject Units: ${newUnits} units`)
    }

    try {
      await apiCreateTeachingLoad(token, {
        facultyId: targetFacultyId,
        subjectId: selectedSubject,
        sectionId: fullSection,
        semester
      })
      
      const lRes = await apiGetTeachingLoads(token)
      setLoads(lRes.teachingLoads)
      
      setSelectedSubject('')
      setSectionLetter('')
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

  const facultyGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const filtered = loads.filter(l => {
        if (!q) return true
        const fac = allFaculty.find(f => String(f.id) === String(l.faculty_id))
        const facultyName = (fac ? (fac.full_name || fac.displayName) : (l.faculty_name || '')).toLowerCase()
        const subjectCode = (l.subject?.code || '').toLowerCase()
        const subjectName = (l.subject?.name || '').toLowerCase()
        return facultyName.includes(q) || subjectCode.includes(q) || subjectName.includes(q)
    })

    const groups = {}
    filtered.forEach(l => {
      const facId = String(l.faculty_id || 'unknown')
      if (!groups[facId]) {
         groups[facId] = {
            faculty_id: facId,
            faculty_name: l.faculty_name || `ID: ${facId}`,
            subjects: [],
            totalUnits: 0
         }
      }
      groups[facId].subjects.push(l)
      groups[facId].totalUnits += Number(l.subject?.credits || 0)
    })
    Object.values(groups).forEach(g => {
       const fac = allFaculty.find(f => String(f.id) === String(g.faculty_id))
       if (fac) g.faculty_name = fac.full_name || fac.displayName || g.faculty_name
    })

    return Object.values(groups).sort((a,b) => a.faculty_name.localeCompare(b.faculty_name))
  }, [loads, searchQuery, allFaculty])

  const activeFacultyGroup = useMemo(() => {
     if (!viewingFacultyId) return null
     return facultyGroups.find(g => String(g.faculty_id) === String(viewingFacultyId)) || null
  }, [viewingFacultyId, facultyGroups])

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading Teaching Load...</div>

  return (
    <div className="module-page">
      <style>{`
        @media print {
          .no-print, header, .sidebar, .top-nav, .btn, .assign-form-container, .auth-field, select, button { display: none !important; }
          .content-area { margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
          .data-table { border-collapse: collapse !important; width: 100% !important; border: 1px solid #ddd !important; }
          .data-table th, .data-table td { border: 1px solid #ddd !important; padding: 8px !important; text-align: left !important; }
          .content-panel { border: none !important; margin-bottom: 20px !important; box-shadow: none !important; }
          body { background: white !important; font-size: 11pt !important; }
          .main-title { font-size: 18pt !important; margin-bottom: 5px !important; }
          .status-badge { border: 1px solid #999 !important; color: black !important; }
        }
      `}</style>

      <header className="module-header flex flex-wrap justify-between items-center gap-4 no-print">
        <div>
          <h1 className="main-title font-extrabold text-[var(--text)]">Teaching Load Management</h1>
          <p className="main-description text-[var(--text-muted)] mt-1">Oversee subject assignments and class sections.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative">
             <input 
               type="text" 
               placeholder="Search faculty or subject..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="search-input !w-[300px] !pl-10"
               style={{ borderRadius: 'var(--radius-lg)' }}
             />
             <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
             </div>
         </div>
       </header>

      <div className="content-panel no-print assign-form-container">
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
            <label className="auth-label">Course</label>
            <select className="search-input" style={{ borderRadius: 'var(--radius-md)', padding: '10px' }} value={sectionCourse} onChange={e => setSectionCourse(e.target.value)}>
              {COURSE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="auth-field">
            <label className="auth-label">Year Level</label>
            <select className="search-input" style={{ borderRadius: 'var(--radius-md)', padding: '10px' }} value={sectionYear} onChange={e => setSectionYear(e.target.value)}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="auth-field">
            <label className="auth-label">Semester</label>
            <select
              className="search-input"
              style={{ borderRadius: 'var(--radius-md)', padding: '10px' }}
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              {SEMESTER_OPTIONS.map(sem => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>
          <div className="auth-field">
            <label className="auth-label">Section Letter (A-E)</label>
            <select className="search-input" style={{ borderRadius: 'var(--radius-md)', padding: '10px' }} value={sectionLetter} onChange={e => setSectionLetter(e.target.value)}>
              <option value="">Select Section</option>
              {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="auth-field">
            <label className="auth-label">Subject</label>
            <select className="search-input" style={{ borderRadius: 'var(--radius-md)', padding: '10px' }} value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">Select Subject</option>
              {(() => {
                 const semLower = semester.toLowerCase();
                 const currSem = semLower.includes('1st') ? '1st Semester' : (semLower.includes('2nd') ? '2nd Semester' : 'All');
                 const allowedCodes = getExpectedCodes(sectionCourse, sectionYear, currSem);
                 return subjects
                   .filter(s => allowedCodes.has(s.code.toLowerCase()))
                   .map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>);
              })()}
            </select>
          </div>
          <div className="flex items-end justify-end">
            <button onClick={handleAdd} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>Assign Load</button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {facultyGroups.length === 0 ? (
          <div className="content-panel text-center p-12">
            <p className="text-[var(--text-muted)] text-sm">No teaching loads assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             {facultyGroups.map(fg => (
                 <div key={fg.faculty_id} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                     <div className="flex items-center gap-4 mb-4">
                         <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-xl font-bold text-[var(--accent)] border border-[var(--accent)]/20 uppercase">
                             {fg.faculty_name.charAt(0)}
                         </div>
                         <div>
                             <h3 className="font-bold text-[var(--text)]">{fg.faculty_name}</h3>
                             <p className="text-xs text-[var(--accent)] font-semibold">{fg.totalUnits} Units Total</p>
                         </div>
                     </div>
                     <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border-color)]">
                         <span className="text-xs font-bold text-[var(--text-muted)] bg-[rgba(0,0,0,0.03)] px-3 py-1 rounded-full border border-black/5 dark:border-white/5">{fg.subjects.length} Subjects</span>
                         <button onClick={() => setViewingFacultyId(fg.faculty_id)} className="flex items-center gap-2 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] px-3 py-1.5 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            View Load
                         </button>
                     </div>
                 </div>
             ))}
          </div>
        )}
      </div>

      {activeFacultyGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.02)]">
               <div>
                  <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">Teaching Load</h2>
                  <p className="text-sm font-semibold text-[var(--accent)] mt-0.5">{activeFacultyGroup.faculty_name} &bull; {activeFacultyGroup.totalUnits} Units</p>
               </div>
               <button onClick={() => setViewingFacultyId(null)} className="p-2 hover:bg-[rgba(0,0,0,0.05)] rounded-full text-[var(--text-muted)] transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
               </button>
            </div>
            
            <div className="overflow-y-auto w-full">
               <div className="p-0 table-wrapper border-0 pb-12">
                 <table className="data-table w-full">
                   <thead className="bg-[rgba(0,0,0,0.02)] sticky top-0 z-10 backdrop-blur-md">
                     <tr>
                       <th className="py-3">Code</th>
                       <th>Subject Name</th>
                       <th>Section</th>
                       <th>Semester</th>
                       <th>Schedule</th>
                       <th>Units</th>
                       <th style={{ textAlign: 'right' }}>Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[var(--border-color)]">
                     {activeFacultyGroup.subjects.map(l => (
                       <tr key={l.id} className={`hover:bg-[rgba(0,0,0,0.01)] transition-colors ${l.is_virtual ? 'opacity-80' : ''}`}>
                         <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                           <span className="px-2 py-1 bg-[var(--accent-soft)] text-[var(--accent)] rounded border border-[var(--accent)]/10 text-xs">
                             {l.subject?.code}
                           </span>
                           {l.is_virtual && <span className="ml-2 px-1.5 py-0.5 bg-[var(--background)] border border-[var(--border-color)] rounded-[4px] text-[10px] uppercase tracking-tighter opacity-70">Schedule Only</span>}
                         </td>
                         <td className="font-medium">{l.subject?.name}</td>
                         <td>
                           <span className="px-2 py-0.5 bg-[var(--background)] border border-[var(--border-color)] rounded text-xs font-semibold">
                             {l.section_id || l.section}
                           </span>
                         </td>
                         <td className="text-xs font-semibold text-[var(--text-muted)]">
                            {l.semester || 'Unassigned'}
                         </td>
                         <td className="text-xs">
                           {l.schedule_info ? (
                             <div className="flex flex-col">
                               <span className="font-bold text-[var(--accent)]">{l.schedule_info.day}</span>
                               <span className="text-[var(--text-muted)] text-[10px]">{l.schedule_info.time}</span>
                               <span className="text-[var(--text-muted)] text-[10px] italic">{l.schedule_info.room}</span>
                             </div>
                           ) : (
                             <span className="text-[var(--text-muted)] italic">No schedule linked</span>
                           )}
                         </td>
                         <td className="text-[var(--text-muted)] font-mono">{l.subject?.credits || 0}</td>
                         <td style={{ textAlign: 'right' }}>
                           <button onClick={() => handleDelete(l.id)} disabled={l.is_virtual} className={`text-xs px-3 py-1.5 rounded transition border ${l.is_virtual ? 'bg-[rgba(0,0,0,0.02)] text-gray-400 border-transparent cursor-not-allowed hidden' : 'bg-rose-50/50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border-rose-200'}`}>Remove</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
