import { useEffect, useState } from 'react'

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M8 7h8" />
    <path d="M8 11h8" />
  </svg>
)

const IconClipboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 14h6" />
    <path d="M9 18h6" />
  </svg>
)

const IconTrendingUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
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

const IconAward = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
  </svg>
)

const IconCreditCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
)

const IconFolder = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
)

const IconScale = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16h6" />
    <path d="M19 13v6" />
    <path d="M12 15V3" />
    <path d="M9 6l3-3 3 3" />
    <path d="M6 19a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2" />
  </svg>
)

const STUDENT_SECTIONS = [
  { Icon: IconUser, title: 'Basic Information', items: ['Full name', 'Student ID / registration number', 'Date of birth', 'Gender', 'Photo', 'Contact details (email, phone)', 'Address'] },
  { Icon: IconBook, title: 'Academic Information', items: ['Current program/course', 'Department or faculty', 'Year level / grade level', 'Section or class', 'Advisor or homeroom teacher'] },
  { Icon: IconClipboard, title: 'Enrollment Details', items: ['Subjects enrolled this term', 'Class schedule', 'Semester / term information', 'Enrollment status (active, leave, graduated)'] },
  { Icon: IconTrendingUp, title: 'Academic Performance', items: ['Grades per subject', 'GPA / average', 'Academic standing', 'Transcript or report card'] },
  { Icon: IconCalendar, title: 'Attendance Records', items: ['Daily attendance', 'Absences / tardiness', 'Attendance percentage'] },
  { Icon: IconAward, title: 'Activities & Achievements', items: ['Clubs or organizations', 'Awards and recognitions', 'Extracurricular activities', 'Competitions participated in'] },
  { Icon: IconCreditCard, title: 'Financial Information', items: ['Tuition balance', 'Payment history', 'Scholarships or grants'] },
  { Icon: IconFolder, title: 'Documents & Requirements', items: ['Uploaded documents (ID, birth certificate, etc.)', 'Admission requirements', 'Certificates'] },
  { Icon: IconScale, title: 'Behavior / Discipline Records', items: ['Warnings or disciplinary actions', 'Teacher notes or comments'] },
]

export default function StudentProfile() {
  const [student, setStudent] = useState(null)

  useEffect(() => {
    try {
      const session = localStorage.getItem('studentSession')
      if (session) {
        setStudent(JSON.parse(session))
      }
    } catch {
      setStudent(null)
    }
  }, [])

  const displayName = student?.idOrEmail || 'Student'

  return (
    <div className="profile-page profile-page-student">
      <div className="profile-hero profile-hero-student">
        <div className="profile-hero-badge">Student</div>
        <div className="profile-avatar profile-avatar-student">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <h1 className="profile-hero-title">{displayName}</h1>
        <p className="profile-hero-subtitle">Enrolled Student</p>

        <div className="student-stats">
          <div className="student-stat">
            <span className="student-stat-label">Year Level</span>
            <span className="student-stat-value">—</span>
          </div>
          <div className="student-stat-divider" />
          <div className="student-stat">
            <span className="student-stat-label">Status</span>
            <span className="student-stat-value student-stat-active">Active</span>
          </div>
          <div className="student-stat-divider" />
          <div className="student-stat">
            <span className="student-stat-label">Program</span>
            <span className="student-stat-value">—</span>
          </div>
        </div>
      </div>

      <div className="profile-grid profile-grid-student">
        {STUDENT_SECTIONS.map((section, i) => (
          <div key={i} className="profile-card profile-card-student">
            <h3 className="profile-card-title">
              <span className="profile-card-icon profile-card-icon-svg profile-card-icon-student">
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
