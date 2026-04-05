import { useEffect, useState } from 'react'

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconGraduation = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
)

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IconFlask = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2v7.31" />
    <path d="M14 9.3V2" />
    <path d="M8.5 2h7" />
    <path d="M16 22a6 6 0 0 0 4-10.8V2h-4v9.2a6 6 0 0 0 0 10.8z" />
    <path d="M4 22a6 6 0 0 1 4-10.8V2H4v9.2a6 6 0 0 1 0 10.8z" />
  </svg>
)

const FACULTY_SECTIONS = [
  {
    Icon: IconUser,
    title: 'Personal Information',
    items: ['Full name', 'Faculty ID', 'Email address', 'Contact number', 'Department / Faculty', 'Photo'],
  },
  {
    Icon: IconGraduation,
    title: 'Academic Details',
    items: ['Current position / rank', 'Specialization', 'Years of service', 'Advisor status'],
  },
  {
    Icon: IconCalendar,
    title: 'Teaching Load',
    items: ['Subjects assigned', 'Class schedule', 'Semester / term', 'Office hours'],
  },
  {
    Icon: IconFlask,
    title: 'Research & Publications',
    items: ['Research projects', 'Publications', 'Conferences attended', 'Grants'],
  },
]

export default function FacultyProfile() {
  const [faculty, setFaculty] = useState(null)

  useEffect(() => {
    try {
      const session = localStorage.getItem('facultySession')
      if (session) {
        setFaculty(JSON.parse(session))
      }
    } catch {
      setFaculty(null)
    }
  }, [])

  const displayName = faculty?.email?.split('@')[0] || 'Faculty Member'

  return (
    <div className="profile-page profile-page-faculty">
      <div className="profile-hero profile-hero-faculty">
        <div className="profile-hero-badge">Faculty</div>
        <div className="profile-avatar profile-avatar-faculty">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <h1 className="profile-hero-title">{faculty?.email || 'Faculty Member'}</h1>
        <p className="profile-hero-subtitle">College Faculty</p>

        <div className="faculty-stats">
          <div className="faculty-stat">
            <span className="faculty-stat-label">Department</span>
            <span className="faculty-stat-value">—</span>
          </div>
          <div className="faculty-stat-divider" />
          <div className="faculty-stat">
            <span className="faculty-stat-label">Position</span>
            <span className="faculty-stat-value">—</span>
          </div>
          <div className="faculty-stat-divider" />
          <div className="faculty-stat">
            <span className="faculty-stat-label">Status</span>
            <span className="faculty-stat-value faculty-stat-active">Active</span>
          </div>
        </div>
      </div>

      <div className="profile-grid profile-grid-faculty">
        {FACULTY_SECTIONS.map((section, i) => (
          <div key={i} className="profile-card profile-card-faculty">
            <h3 className="profile-card-title">
              <span className="profile-card-icon profile-card-icon-svg profile-card-icon-faculty">
                <section.Icon />
              </span>
              {section.title}
            </h3>
            <ul className="profile-card-list">
              {section.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
