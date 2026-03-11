import { useEffect, useState } from 'react'

const IconAccount = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconSecurity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IconSystem = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const IconActivity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const ADMIN_SECTIONS = [
  {
    Icon: IconAccount,
    title: 'Account Information',
    items: ['Full name', 'Email address', 'Role & permissions', 'Account status'],
  },
  {
    Icon: IconSecurity,
    title: 'Security & Access',
    items: ['Password management', 'Login history', 'Two-factor authentication', 'Session management'],
  },
  {
    Icon: IconSystem,
    title: 'System Access',
    items: ['Dashboard overview', 'Student records access', 'Faculty management', 'Reports & analytics'],
  },
  {
    Icon: IconActivity,
    title: 'Activity Log',
    items: ['Recent actions', 'Audit trail', 'Export logs'],
  },
]

export default function AdminProfile() {
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    try {
      const session = localStorage.getItem('adminSession')
      if (session) {
        setAdmin(JSON.parse(session))
      }
    } catch {
      setAdmin(null)
    }
  }, [])

  const displayName = admin?.fullName || admin?.email || 'Administrator'

  return (
    <div className="profile-page profile-page-admin">
      <div className="profile-hero profile-hero-admin">
        <div className="profile-hero-badge">Admin</div>
        <div className="profile-avatar profile-avatar-admin">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <h1 className="profile-hero-title">{displayName}</h1>
        <p className="profile-hero-subtitle">System Administrator</p>
      </div>

      <div className="profile-grid">
        {ADMIN_SECTIONS.map((section, i) => (
          <div key={i} className="profile-card profile-card-admin">
            <h3 className="profile-card-title">
              <span className="profile-card-icon profile-card-icon-svg">
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
