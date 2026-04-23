import { useEffect, useState } from 'react'

const STORAGE_KEY = 'faculty_consultations'

export default function FacultyConsultation() {
  const [loading, setLoading] = useState(true)
  const [consultations, setConsultations] = useState([])

  // Form states
  const [day, setDay] = useState('Monday')
  const [time, setTime] = useState('')
  const [room, setRoom] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    // Simulated load from local storage to persist without API
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setConsultations(JSON.parse(stored))
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }, [])

  function handleAdd() {
    if (!time.trim() || !room.trim()) {
      return alert('Time slot and Room are required.')
    }
    
    const newSlot = {
      id: Date.now().toString(),
      day,
      time: time.trim(),
      room: room.trim(),
      notes: notes.trim()
    }
    
    const updated = [...consultations, newSlot]
    setConsultations(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    
    setTime('')
    setRoom('')
    setNotes('')
  }

  function handleRemove(id) {
    if (!confirm('Remove this consultation slot?')) return
    const updated = consultations.filter(c => c.id !== id)
    setConsultations(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading Office Hours...</div>

  return (
    <div className="module-page">
      <header className="module-header flex justify-between items-center">
        <div>
          <h1 className="main-title font-extrabold text-[var(--text)]">Consultation Hours</h1>
          <p className="main-description text-[var(--text-muted)] mt-1">Manage and display your availability for student consultations.</p>
        </div>
        <div className="badge-enrolled">
           {consultations.length} Active Slots
        </div>
      </header>

      <div className="content-panel shadow-sm">
        <div className="content-header !pb-2 border-b-0">
          <h3 className="content-title text-lg flex items-center gap-2">Set Consultation Schedule</h3>
          <p className="content-subtitle text-xs">Students will see these times as available for meetings or advising.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4 bg-[rgba(0,0,0,0.01)] p-4 rounded-xl border border-[var(--border-color)]">
          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1 block ml-1">Day</label>
            <select className="search-input w-full appearance-none bg-white dark:bg-[#111] !rounded-lg" value={day} onChange={e => setDay(e.target.value)}>
              <option>Monday</option>
              <option>Tuesday</option>
              <option>Wednesday</option>
              <option>Thursday</option>
              <option>Friday</option>
              <option>Saturday</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1 block ml-1">Time Slot</label>
            <input type="text" className="search-input w-full bg-white dark:bg-[#111] !rounded-lg" placeholder="e.g. 1:00 PM - 3:00 PM" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1 block ml-1">Location</label>
            <input type="text" className="search-input w-full bg-white dark:bg-[#111] !rounded-lg" placeholder="e.g. Faculty Office" value={room} onChange={e => setRoom(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1 block ml-1">Purpose / Notes <span className="opacity-50">(Opt)</span></label>
            <input type="text" className="search-input w-full bg-white dark:bg-[#111] !rounded-lg" placeholder="e.g. Advising, Thesis" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={handleAdd} className="btn btn-primary w-full shadow-sm !rounded-lg py-2">Save Slot</button>
          </div>
        </div>
      </div>

      <div className="content-panel mt-6 shadow-sm">
        <div className="content-header">
          <h3 className="content-title">Active Consultation Hours</h3>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr className="bg-[rgba(0,0,0,0.02)]">
                <th className="w-1/6">Day</th>
                <th className="w-1/4">Time Slot</th>
                <th className="w-1/4">Location</th>
                <th className="w-1/4">Notes / Purpose</th>
                <th className="w-1/6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => {
                const daySlots = consultations.filter(c => c.day === d)
                if (daySlots.length === 0) return null
                return daySlots.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-[rgba(0,0,0,0.01)] transition-colors">
                    {idx === 0 ? (
                       <td rowSpan={daySlots.length} className="align-top font-bold text-[var(--accent)] bg-[rgba(var(--accent-rgb),0.02)] border-r border-[var(--border-color)]">
                          {d}
                       </td>
                    ) : null}
                    <td className="font-semibold text-sm">{c.time}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--background)] border border-[var(--border-color)] text-[var(--text)]">
                         {c.room}
                      </span>
                    </td>
                    <td className="text-sm text-[var(--text-muted)] italic">{c.notes || '—'}</td>
                    <td className="text-right align-middle">
                      <button onClick={() => handleRemove(c.id)} className="text-xs px-3 py-1.5 rounded bg-rose-50/50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition border border-rose-200">Remove</button>
                    </td>
                  </tr>
                ))
              })}
              {consultations.length === 0 && (
                <tr><td colSpan="5" className="empty-state py-12">No consultation hours configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
