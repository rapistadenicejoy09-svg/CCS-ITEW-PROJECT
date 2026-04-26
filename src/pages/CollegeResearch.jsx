import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  apiResearchList,
  apiResearchAnalytics,
  apiResearchAdvisers,
  apiResearchAuthorSuggestions,
  apiResearchCreate,
  apiResearchPatch,
  apiResearchUploadPdf,
  apiResearchFacultyReview,
  apiResearchFinalApproval,
  apiResearchDownloadBlob,
  apiResearchDelete,
} from '../lib/api'
import { getCurrentRole, hasPermission, PERMISSIONS } from '../lib/security'

const STATUS_LABELS = {
  draft: 'Draft',
  under_faculty_review: 'Faculty review',
  pending_approval: 'Chair / Dean',
  published: 'Published',
  rejected: 'Rejected',
}

const RESEARCH_TYPES = [
  { value: 'thesis', label: 'Thesis' },
  { value: 'capstone', label: 'Capstone' },
  { value: 'faculty_research', label: 'Faculty research' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_HINTS = ['AI', 'Web Dev', 'Data Science', 'Networking', 'Security', 'Mobile', 'HCI', 'General']

function CrIconList() {
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

function CrIconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function CrIconDetails({ expanded }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {expanded ? (
        <polyline points="18 15 12 9 6 15" />
      ) : (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </>
      )}
    </svg>
  )
}

function CrIconPdf() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-6" />
      <path d="m9 15 3 3 3-3" />
    </svg>
  )
}

function CrIconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function roleLabel(role) {
  if (role === 'department_chair') return 'Chair'
  if (role === 'faculty_professor') return 'Professor'
  return role || ''
}

function IconFilter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function getAdminLoginIdentifier() {
  try {
    const raw = localStorage.getItem('authUser')
    const u = raw ? JSON.parse(raw) : null
    return (u?.identifier || '').trim() || null
  } catch {
    return null
  }
}

const MIN_TITLE_LEN = 3
const MIN_ABSTRACT_LEN = 20

export default function CollegeResearch() {
  const token = localStorage.getItem('authToken')
  const role = getCurrentRole()

  const canCreate = hasPermission(PERMISSIONS.DOC_CREATE)
  const canReviewAsAdviser =
    hasPermission(PERMISSIONS.DOC_APPROVE) &&
    ['faculty', 'faculty_professor'].includes(role || '')
  const canFinalApprove = ['dean', 'department_chair', 'admin'].includes(role || '')
  const canSeeAllPipeline = role === 'admin' || role === 'secretary'
  const canDelete = role === 'admin'

  const [tab, setTab] = useState('repository')
  const [items, setItems] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [analyticsScope, setAnalyticsScope] = useState(null)
  const [advisers, setAdvisers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [yearFilter, setYearFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')
  const [appliedLibraryFilters, setAppliedLibraryFilters] = useState({
    year: '',
    course: '',
    keyword: '',
    author: '',
  })

  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [pendingSubmitMode, setPendingSubmitMode] = useState(null) // 'draft' | 'submit'
  const [form, setForm] = useState({
    title: '',
    abstract: '',
    year: new Date().getFullYear(),
    course: 'CS',
    category: '',
    researchType: 'capstone',
    keywords: '',
    adviserFacultyId: '',
    requireApproval: false,
    publishDirect: false,
    coAuthorIds: [],
    file: null,
  })

  const [authorQuery, setAuthorQuery] = useState('')
  const [authorHits, setAuthorHits] = useState([])
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false)
  const [authorSearching, setAuthorSearching] = useState(false)
  const [coAuthorLabels, setCoAuthorLabels] = useState({})
  const coAuthorComboboxRef = useRef(null)

  const [expandedId, setExpandedId] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [pdfDraftPick, setPdfDraftPick] = useState({})
  const [repoViewMode, setRepoViewMode] = useState('list')
  const [deleteTarget, setDeleteTarget] = useState(null)



  const loadList = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const scope =
        tab === 'library'
          ? 'repository'
          : tab === 'mine'
            ? 'mine'
            : tab === 'adviser'
              ? 'adviser_review'
              : tab === 'approval'
                ? 'pending_approval'
                : tab === 'all'
                  ? 'all'
                  : 'repository'

      const query = { scope }
      if (appliedLibraryFilters.year) query.year = appliedLibraryFilters.year
      if (appliedLibraryFilters.course) query.course = appliedLibraryFilters.course
      if (appliedLibraryFilters.keyword) query.keyword = appliedLibraryFilters.keyword
      if (appliedLibraryFilters.author) query.author = appliedLibraryFilters.author

      const res = await apiResearchList(token, query)
      setItems(res.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load research')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, tab, appliedLibraryFilters])

  const loadAnalytics = useCallback(async () => {
    if (!token || tab !== 'analytics') return
    setLoading(true)
    setError(null)
    try {
      const res = await apiResearchAnalytics(token)
      setAnalytics(res.analytics || null)
      setAnalyticsScope(res.scope || null)
    } catch (e) {
      setError(e.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [token, tab])

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics()
    else loadList()
  }, [tab, loadList, loadAnalytics])

  useEffect(() => {
    if (!token || !showForm) return
      ; (async () => {
        try {
          const res = await apiResearchAdvisers(token)
          setAdvisers(res.advisers || [])
        } catch {
          setAdvisers([])
        }
      })()
  }, [token, showForm])

  useEffect(() => {
    if (!authorDropdownOpen || !token || !showForm) {
      return
    }
    let cancelled = false
    const delay = authorQuery.trim().length >= 2 ? 220 : 0
    setAuthorSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await apiResearchAuthorSuggestions(token, authorQuery.trim(), 55, form.course)
        if (cancelled) return
        const picked = new Set(form.coAuthorIds.map(Number))
        const users = (res.users || []).filter((u) => !picked.has(Number(u.id)))
        setAuthorHits(users)
      } catch {
        if (!cancelled) setAuthorHits([])
      } finally {
        if (!cancelled) setAuthorSearching(false)
      }
    }, delay)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [authorQuery, authorDropdownOpen, token, showForm, form.coAuthorIds, form.course])

  useEffect(() => {
    if (!authorDropdownOpen) return
    function handlePointerDown(e) {
      if (coAuthorComboboxRef.current && !coAuthorComboboxRef.current.contains(e.target)) {
        setAuthorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [authorDropdownOpen])

  useEffect(() => {
    if (!showSubmitConfirm) return
    function onKey(e) {
      if (e.key === 'Escape') {
        setShowSubmitConfirm(false)
        setPendingSubmitMode(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSubmitConfirm])

  const yearValid = useMemo(() => {
    const y = Number(form.year)
    return Number.isFinite(y) && y >= 1990 && y <= 2100
  }, [form.year])

  const isDraftValid = useMemo(() => {
    if (!yearValid) return false
    if (form.title.trim().length < MIN_TITLE_LEN) return false
    if (form.abstract.trim().length < MIN_ABSTRACT_LEN) return false
    return true
  }, [form.title, form.abstract, yearValid])

  const isSubmitValid = useMemo(() => {
    if (!isDraftValid) return false
    if (role === 'student' && !String(form.adviserFacultyId).trim()) return false
    if (!form.file) return false
    const name = String(form.file.name || '').toLowerCase()
    const type = form.file.type || ''
    if (type !== 'application/pdf' && !name.endsWith('.pdf')) return false
    return true
  }, [isDraftValid, role, form.adviserFacultyId, form.file])

  const tabs = useMemo(() => {
    const t = [{ id: 'library', label: 'Library' }]
    t.push({ id: 'mine', label: 'My submissions' })
    if (canReviewAsAdviser) t.push({ id: 'adviser', label: 'Adviser review' })
    if (canFinalApprove) t.push({ id: 'approval', label: 'Final approval' })
    if (canSeeAllPipeline) t.push({ id: 'all', label: 'All records' })
    t.push({ id: 'analytics', label: 'Analytics' })
    return t
  }, [canReviewAsAdviser, canFinalApprove, canSeeAllPipeline])

  async function performCreate(isDraft) {
    if (!token) return
    setSubmitting(true)
    setError(null)
    setShowSubmitConfirm(false)
    setPendingSubmitMode(null)
    try {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      fd.append('abstract', form.abstract.trim())
      fd.append('year', String(form.year))
      fd.append('course', form.course)
      fd.append('category', form.category.trim())
      fd.append('researchType', form.researchType)
      const kw = form.keywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      fd.append('keywords', JSON.stringify(kw))
      if (form.adviserFacultyId) fd.append('adviserFacultyId', String(form.adviserFacultyId))
      fd.append('coAuthorUserIds', JSON.stringify(form.coAuthorIds))
      fd.append('status', isDraft ? 'draft' : 'submitted')
      if (role === 'secretary') {
        fd.append('requireApproval', form.requireApproval ? 'true' : 'false')
      }
      if (role === 'admin') {
        fd.append('publishDirect', form.publishDirect ? 'true' : 'false')
      }
      if (form.file) fd.append('file', form.file)

      await apiResearchCreate(token, fd)
      setShowForm(false)
      setAuthorQuery('')
      setAuthorHits([])
      setCoAuthorLabels({})
      setForm({
        title: '',
        abstract: '',
        year: new Date().getFullYear(),
        course: 'CS',
        category: '',
        researchType: 'capstone',
        keywords: '',
        adviserFacultyId: '',
        requireApproval: false,
        publishDirect: false,
        coAuthorIds: [],
        file: null,
      })
      await loadList()
    } catch (err) {
      setError(err.message || 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  function requestSubmit(mode) {
    if (mode === 'draft' && !isDraftValid) return
    if (mode === 'submit' && !isSubmitValid) return
    setPendingSubmitMode(mode)
    setShowSubmitConfirm(true)
  }

  function confirmPendingSubmit() {
    if (pendingSubmitMode === 'draft') void performCreate(true)
    else if (pendingSubmitMode === 'submit') void performCreate(false)
  }

  function addCoAuthor(u) {
    const id = Number(u.id)
    if (!Number.isFinite(id)) return
    setForm((f) => ({
      ...f,
      coAuthorIds: f.coAuthorIds.includes(id) ? f.coAuthorIds : [...f.coAuthorIds, id],
    }))
    setCoAuthorLabels((prev) => ({ ...prev, [id]: u.displayName }))
    setAuthorQuery('')
    setAuthorHits((h) => h.filter((x) => Number(x.id) !== id))
  }

  function removeCoAuthor(id) {
    setForm((f) => ({ ...f, coAuthorIds: f.coAuthorIds.filter((x) => x !== id) }))
    setCoAuthorLabels((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function downloadPdf(id, name) {
    if (!token) return
    try {
      const blob = await apiResearchDownloadBlob(token, id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (name || 'research').replace(/[^\w.-]+/g, '_') + '.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message || 'Download failed')
    }
  }

  async function runFacultyReview(id, action) {
    if (!token) return
    try {
      await apiResearchFacultyReview(token, id, { action, comments: reviewNote })
      setReviewNote('')
      setExpandedId(null)
      await loadList()
    } catch (e) {
      setError(e.message || 'Action failed')
    }
  }

  async function runFinal(id, action) {
    if (!token) return
    try {
      await apiResearchFinalApproval(token, id, { action, comments: reviewNote })
      setReviewNote('')
      setExpandedId(null)
      setSuccessMsg(action === 'approve' ? 'Research published successfully!' : 'Research rejected.')
      await loadList()
    } catch (e) {
      setError(e.message || 'Action failed')
    }
  }

  async function resubmitRow(id) {
    if (!token) return
    try {
      await apiResearchPatch(token, id, { status: 'resubmit' })
      setExpandedId(null)
      await loadList()
    } catch (e) {
      setError(e.message || 'Resubmit failed')
    }
  }

  async function submitDraftRow(id) {
    if (!token) return
    try {
      await apiResearchPatch(token, id, { status: 'submitted' })
      setExpandedId(null)
      await loadList()
    } catch (e) {
      setError(e.message || 'Submit failed')
    }
  }

  async function uploadDraftPdf(rowId) {
    const file = pdfDraftPick[rowId]
    if (!token || !file) return
    try {
      const fd = new FormData()
      fd.append('file', file)
      await apiResearchUploadPdf(token, rowId, fd)
      setPdfDraftPick((p) => ({ ...p, [rowId]: null }))
      await loadList()
    } catch (e) {
      setError(e.message || 'PDF upload failed')
    }
  }

  function canAttachPdfClient(row) {
    if (!['draft', 'rejected'].includes(row.status)) return false
    if (role === 'admin' || role === 'secretary') return true
    try {
      const n = Number(JSON.parse(localStorage.getItem('authUser') || 'null')?.id)
      return Number.isFinite(n) && n === row.created_by_user_id
    } catch {
      return false
    }
  }

  function openDeleteConfirm(row) {
    if (!token || !canDelete) return
    setDeleteTarget(row)
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
  }

  async function confirmDeleteResearch() {
    if (!token || !canDelete || !deleteTarget) return

    try {
      await apiResearchDelete(token, deleteTarget.id)
      closeDeleteModal()
      setExpandedId((cur) => (cur === deleteTarget.id ? null : cur))
      await loadList()
    } catch (e) {
      throw new Error(e.message || 'Delete failed')
    }
  }



  function researchDetailBlock(row) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-inner animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
             <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-black text-[var(--accent)]">Project Abstract</span>
                <p className="text-sm leading-relaxed text-[var(--text)] opacity-80">{row.abstract || 'No abstract provided.'}</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
                <div>
                   <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] block mb-1">Adviser</span>
                   <p className="text-xs font-bold text-[var(--text)]">{row.adviser_name || '—'}</p>
                </div>
                <div>
                   <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] block mb-1">Keywords</span>
                   <p className="text-xs font-bold text-[var(--text)]">
                      {Array.isArray(row.keywords) && row.keywords.length ? row.keywords.join(', ') : '—'}
                   </p>
                </div>
             </div>
             <div className="pt-4">
                <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] block mb-1">Authors</span>
                <div className="flex flex-wrap gap-2 mt-2">
                   {Array.isArray(row.authors) ? row.authors.map((a) => (
                      <span key={a.user_id || a.display_name} className="px-3 py-1 bg-[var(--border-color)] text-[10px] font-bold rounded-full text-[var(--text)]">
                         {a.display_name} {a.user_id && <span className="opacity-40 ml-1">#{a.user_id}</span>}
                      </span>
                   )) : '—'}
                </div>
             </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
             <div className="p-4 bg-[rgba(255,255,255,0.02)] border border-[var(--border-color)] rounded-xl space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
                   Submission Info
                   {row.repository_ref && <span className="text-[var(--accent)]">{row.repository_ref}</span>}
                </h5>
                <div className="space-y-3">
                   <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Status</span>
                      <span className="font-bold capitalize">{row.status?.replace(/_/g, ' ')}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Type</span>
                      <span className="font-bold capitalize">{row.research_type?.replace(/_/g, ' ')}</span>
                   </div>
                </div>
             </div>

             {canAttachPdfClient(row) && (
                <div className="space-y-3 p-4 bg-[var(--accent-soft)] border border-[var(--accent-soft)] rounded-xl">
                   <label className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] block">Draft Management</label>
                   <input
                      type="file"
                      className="w-full text-[10px] file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-soft)] hover:file:text-[var(--accent)]"
                      accept="application/pdf,.pdf"
                      onChange={(e) =>
                        setPdfDraftPick((p) => ({
                          ...p,
                          [row.id]: e.target.files?.[0] || null,
                        }))
                      }
                   />
                   <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary btn-compact flex-1"
                        disabled={!pdfDraftPick[row.id]}
                        onClick={() => uploadDraftPdf(row.id)}
                      >
                        {row.has_pdf ? 'Replace PDF' : 'Upload PDF'}
                      </button>
                      {row.status === 'draft' && (
                        <button type="button" className="btn btn-secondary btn-compact flex-1" onClick={() => submitDraftRow(row.id)}>
                          Submit
                        </button>
                      )}
                   </div>
                </div>
             )}

             {row.status === 'rejected' &&
                (() => {
                  try {
                    const n = Number(JSON.parse(localStorage.getItem('authUser') || 'null')?.id)
                    return Number.isFinite(n) && n === row.created_by_user_id
                  } catch {
                    return false
                  }
                })() && (
                <button type="button" className="btn btn-primary w-full" onClick={() => resubmitRow(row.id)}>
                  Resubmit for Review
                </button>
             )}

             {((canReviewAsAdviser && row.status === 'under_faculty_review') ||
               (canFinalApprove && row.status === 'pending_approval')) && (
               <div className="space-y-4 p-4 bg-[rgba(255,255,255,0.02)] border border-[var(--border-color)] rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] block">Administrative Actions</span>
                  <textarea
                    className="search-input w-full text-xs"
                    rows={2}
                    placeholder="Review comments..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                     <button 
                        type="button" 
                        className="btn btn-primary btn-compact flex-1" 
                        onClick={() => row.status === 'under_faculty_review' ? runFacultyReview(row.id, 'approve') : runFinal(row.id, 'approve')}
                     >
                        {row.status === 'under_faculty_review' ? 'Endorse' : 'Publish'}
                     </button>
                     <button 
                        type="button" 
                        className="btn btn-secondary btn-compact flex-1" 
                        onClick={() => row.status === 'under_faculty_review' ? runFacultyReview(row.id, 'reject') : runFinal(row.id, 'reject')}
                     >
                        Reject
                     </button>
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="module-page college-research-page">
      <div className="w-full space-y-6">
        <header className="module-header flex flex-col md:flex-row justify-between items-start md:items-center admin-student-list-header-enter">
          <div>
            <h1 className="main-title font-extrabold text-[var(--text)]">College Research</h1>
            <p className="main-description text-[var(--text-muted)] mt-1">
              Central library for CCS theses, capstones, and faculty research. Linked authors connect to student and
              faculty profiles in the system.
            </p>
          </div>
          <div className="header-actions">
            {canCreate ? (
              <button
                type="button"
                className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'} flex items-center gap-2`}
                onClick={() => {
                  setShowForm((s) => !s)
                  setShowSubmitConfirm(false)
                  setPendingSubmitMode(null)
                }}
              >
                {showForm ? 'Close form' : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    New Record
                  </>
                )}
              </button>
            ) : null}
          </div>
        </header>

        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-2 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${tab === t.id ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-soft)]' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent-soft)]'}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab !== 'analytics' ? (
            <div className="flex items-center gap-2 p-1">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`btn flex items-center gap-2 ${showFilters || Object.values(appliedLibraryFilters).some(Boolean) ? 'btn-primary' : 'btn-secondary'}`}
              >
                <IconFilter /> Filters
                {Object.values(appliedLibraryFilters).some(Boolean) && (
                  <span className={`w-1.5 h-1.5 rounded-full ${showFilters || Object.values(appliedLibraryFilters).some(Boolean) ? 'bg-[#1a0d05]' : 'bg-[var(--accent)]'}`} />
                )}
              </button>
              
              <div className="h-6 w-[1px] bg-[var(--border-color)] mx-1" />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`btn btn-compact flex items-center justify-center !p-2 ${repoViewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                  title="List view"
                  onClick={() => setRepoViewMode('list')}
                >
                  <CrIconList />
                </button>
                <button
                  type="button"
                  className={`btn btn-compact flex items-center justify-center !p-2 ${repoViewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                  title="Grid view"
                  onClick={() => setRepoViewMode('grid')}
                >
                  <CrIconGrid />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {tab !== 'analytics' && showFilters ? (
          <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 shadow-sm animate-fade-in">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-[var(--accent)] tracking-widest ml-1">Search Keywords</label>
                  <input
                    className="search-input w-full"
                    placeholder="Title, abstract, etc."
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-[var(--accent)] tracking-widest ml-1">Researcher</label>
                  <input
                    className="search-input w-full"
                    placeholder="Author or adviser"
                    value={authorFilter}
                    onChange={(e) => setAuthorFilter(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-[var(--accent)] tracking-widest ml-1">Publication Year</label>
                  <input
                    type="number"
                    className="search-input w-full"
                    placeholder="Year"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-[var(--accent)] tracking-widest ml-1">Degree Program</label>
                  <select
                    className="search-input w-full"
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                  >
                    <option value="">All programs</option>
                    <option value="CS">BSCS</option>
                    <option value="IT">BSIT</option>
                  </select>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  className="btn btn-primary h-[42px] px-6"
                  onClick={() =>
                    setAppliedLibraryFilters({
                      year: yearFilter,
                      course: courseFilter,
                      keyword: keywordFilter,
                      author: authorFilter,
                    })
                  }
                >
                  Apply
                </button>
                {Object.values(appliedLibraryFilters).some(Boolean) && (
                   <button 
                    type="button" 
                    className="btn btn-secondary h-[42px] px-4"
                    onClick={() => {
                      setYearFilter('')
                      setCourseFilter('')
                      setKeywordFilter('')
                      setAuthorFilter('')
                      setAppliedLibraryFilters({ year: '', course: '', keyword: '', author: '' })
                    }}
                   >
                    Clear
                   </button>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="college-research-banner" role="alert">
            {error}
            <button type="button" className="btn btn-secondary college-research-banner-dismiss" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        {successMsg ? (
          <div className="college-research-banner college-research-banner-success" role="status">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {successMsg}
            <button type="button" className="btn btn-secondary college-research-banner-dismiss" onClick={() => setSuccessMsg(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        {showForm && canCreate ? (
          <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-6 md:p-8 shadow-lg admin-animate-reveal">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-[var(--text)]">New Research Record</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Fill in the details below to catalog your research project.
                </p>
              </div>
              <div className="hidden md:flex flex-col items-end text-[10px] uppercase tracking-widest font-bold text-[var(--accent)]">
                <span>Validation Mode</span>
                <span className="text-emerald-500">{isSubmitValid ? 'Ready for Submission' : isDraftValid ? 'Draft Only' : 'Incomplete'}</span>
              </div>
            </div>

            <form
              className="space-y-8"
              onSubmit={(e) => {
                e.preventDefault()
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-[0.2em] font-black text-[var(--accent)] border-b border-[var(--accent-soft)] pb-2 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
                       Project Narrative
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="auth-field">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block" htmlFor="cr-title">
                          Research Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="cr-title"
                          className="search-input w-full !py-3 text-base font-semibold"
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          placeholder="e.g., An Intelligent Agentic System for Academic Profiling"
                          autoComplete="off"
                        />
                      </div>

                      <div className="auth-field">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block" htmlFor="cr-abstract">
                          Abstract / Summary <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          id="cr-abstract"
                          className="search-input w-full !py-3 text-sm leading-relaxed"
                          rows={6}
                          value={form.abstract}
                          onChange={(e) => setForm({ ...form, abstract: e.target.value })}
                          placeholder={`A concise summary of your work (minimum ${MIN_ABSTRACT_LEN} characters)...`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h4 className="text-xs uppercase tracking-[0.2em] font-black text-[var(--accent)] border-b border-[var(--accent-soft)] pb-2 flex items-center gap-2">
                       Metadata & Classification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="auth-field">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block" htmlFor="cr-category">
                          Category / Field
                        </label>
                        <input
                          id="cr-category"
                          className="search-input w-full"
                          list="research-category-hints-new"
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          placeholder="e.g. AI, Cyber Security"
                        />
                        <datalist id="research-category-hints-new">
                          {CATEGORY_HINTS.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                      <div className="auth-field">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block" htmlFor="cr-keywords">
                          Keywords
                        </label>
                        <input
                          id="cr-keywords"
                          className="search-input w-full"
                          value={form.keywords}
                          onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                          placeholder="keyword1, keyword2, ..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Submission Details */}
                <div className="lg:col-span-4 space-y-6 bg-[rgba(255,255,255,0.02)] p-6 rounded-2xl border border-[var(--border-color)]">
                   <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-[0.2em] font-black text-[var(--text-muted)] border-b border-[var(--border-color)] pb-2">
                       Logistics
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="auth-field">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block" htmlFor="cr-year">
                          Year <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="cr-year"
                          type="number"
                          className="search-input w-full"
                          value={form.year}
                          onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                          min={1990}
                          max={2100}
                        />
                      </div>
                      <div className="auth-field">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block" htmlFor="cr-course">
                          Course <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="cr-course"
                          className="search-input w-full appearance-none"
                          value={form.course}
                          onChange={(e) => setForm({ ...form, course: e.target.value })}
                        >
                          <option value="CS">CS</option>
                          <option value="IT">IT</option>
                        </select>
                      </div>
                    </div>

                    <div className="auth-field">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block" htmlFor="cr-type">
                        Research Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="cr-type"
                        className="search-input w-full appearance-none"
                        value={form.researchType}
                        onChange={(e) => setForm({ ...form, researchType: e.target.value })}
                      >
                        {RESEARCH_TYPES.map((rt) => (
                          <option key={rt.value} value={rt.value}>
                            {rt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="auth-field">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block" htmlFor="cr-adviser">
                        Adviser {role === 'student' && <span className="text-rose-500">*</span>}
                      </label>
                      <select
                        id="cr-adviser"
                        className="search-input w-full appearance-none"
                        value={form.adviserFacultyId}
                        onChange={(e) => setForm({ ...form, adviserFacultyId: e.target.value })}
                      >
                        <option value="">{role === 'student' ? 'Select adviser…' : 'None'}</option>
                        {advisers.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                    <h4 className="text-xs uppercase tracking-[0.2em] font-black text-[var(--text-muted)] pb-2 flex items-center justify-between">
                       Co-authors 
                       <span className="text-[var(--accent)] font-mono">{form.coAuthorIds.length}</span>
                    </h4>
                    <div className="relative" ref={coAuthorComboboxRef}>
                      <input
                        id="cr-coauthor-input"
                        type="text"
                        className="search-input w-full !text-xs"
                        value={authorQuery}
                        onChange={(e) => setAuthorQuery(e.target.value)}
                        onFocus={() => setAuthorDropdownOpen(true)}
                        placeholder="Search users..."
                        autoComplete="off"
                      />
                      {authorDropdownOpen && (
                        <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl p-1 animate-fade-in list-none">
                          {authorSearching ? (
                            <li className="p-3 text-center text-xs text-[var(--text-muted)] italic">Searching...</li>
                          ) : authorHits.length === 0 ? (
                            <li className="p-3 text-center text-xs text-[var(--text-muted)] italic">No users found.</li>
                          ) : (
                            authorHits.map((u) => (
                              <li key={u.id}>
                                <button 
                                  type="button" 
                                  className="w-full text-left p-3 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] rounded-lg transition-colors flex flex-col"
                                  onClick={() => addCoAuthor(u)}
                                >
                                  <span className="font-bold text-sm">{u.displayName}</span>
                                  <span className="text-[10px] opacity-60 uppercase tracking-tighter">
                                    {u.role !== 'student' ? formatFacultyRole(u.role) : (u.studentId || 'Student')}
                                  </span>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </div>
                    {form.coAuthorIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {form.coAuthorIds.map((id) => (
                          <div key={id} className="group flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-soft)] rounded-full text-[11px] font-bold">
                            {coAuthorLabels[id] || `ID ${id}`}
                            <button 
                              type="button" 
                              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                              onClick={() => removeCoAuthor(id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                     <h4 className="text-xs uppercase tracking-[0.2em] font-black text-[var(--text-muted)] pb-2 flex items-center gap-2">
                        Document Attachment
                     </h4>
                     <label 
                        className={`block cursor-pointer p-4 rounded-xl border-2 border-dashed transition-all duration-300 ${form.file ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)] hover:border-[var(--accent-soft)] lg:hover:scale-[1.02]'}`}
                      >
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                        />
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${form.file ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border-color)] text-[var(--text-muted)]'}`}>
                              <CrIconPdf />
                           </div>
                           <div className="flex-1 overflow-hidden">
                              <p className="text-[11px] font-bold text-[var(--text)] truncate">
                                {form.file ? form.file.name : 'Choose PDF File'}
                              </p>
                              <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                                {form.file ? `${(form.file.size / 1024 / 1024).toFixed(1)} MB` : 'Max 25MB · PDF Only'}
                              </p>
                           </div>
                        </div>
                     </label>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-[11px] text-[var(--text-muted)] leading-relaxed italic max-w-sm">
                   * Draft saves require title, abstract, and year. Formal submission also requires a PDF and an adviser evaluation (for students).
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <button
                    type="button"
                    className="btn btn-secondary flex-1 sm:flex-none !px-8 hover:bg-[var(--border-color)]"
                    disabled={submitting || !isDraftValid}
                    onClick={() => requestSubmit('draft')}
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary flex-1 sm:flex-none !px-8"
                    disabled={submitting || !isSubmitValid}
                    onClick={() => requestSubmit('submit')}
                  >
                    {submitting ? 'Processing...' : 'Submit for Review'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        ) : null}

        {showSubmitConfirm && pendingSubmitMode ? (
          <div className="modal-overlay college-research-modal-overlay" role="presentation">
            <div className="modal-card college-research-confirm-card" role="dialog" aria-modal="true" aria-labelledby="cr-confirm-title">
              <h3 id="cr-confirm-title" className="modal-title">
                {pendingSubmitMode === 'draft' ? 'Save draft?' : 'Submit for review?'}
              </h3>
              <div className="college-research-confirm-body">
                <p>
                  <strong>Title:</strong> {form.title.trim() || '—'}
                </p>
                <p>
                  <strong>Year / course:</strong> {form.year} · {form.course}
                </p>
                <p>
                  <strong>Type:</strong> {RESEARCH_TYPES.find((t) => t.value === form.researchType)?.label || form.researchType}
                </p>
                {form.adviserFacultyId ? (
                  <p>
                    <strong>Adviser:</strong>{' '}
                    {advisers.find((a) => String(a.id) === String(form.adviserFacultyId))?.displayName || 'Selected'}
                  </p>
                ) : null}
                <p>
                  <strong>Co-authors:</strong>{' '}
                  {form.coAuthorIds.length
                    ? form.coAuthorIds.map((id) => coAuthorLabels[id] || `#${id}`).join(', ')
                    : 'None'}
                </p>
                <p>
                  <strong>PDF:</strong> {form.file ? form.file.name : pendingSubmitMode === 'draft' ? 'None (draft)' : '—'}
                </p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => {
                    setShowSubmitConfirm(false)
                    setPendingSubmitMode(null)
                  }}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" disabled={submitting} onClick={confirmPendingSubmit}>
                  {submitting ? 'Working…' : pendingSubmitMode === 'draft' ? 'Yes, save draft' : 'Yes, submit'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteTarget && (
          <ConfirmDeleteModal
            title="Delete research record?"
            description={
              <p className="leading-relaxed">
                This permanently removes{' '}
                <span className="font-semibold text-[var(--text)]">
                  {deleteTarget.title}
                </span>{' '}
                and its PDF from the library. This cannot be undone. Enter your administrator password to confirm.
              </p>
            }
            confirmLabel="Confirm Deletion"
            adminIdentifier={getAdminLoginIdentifier()}
            onConfirm={confirmDeleteResearch}
            onClose={closeDeleteModal}
          />
        )}

        {tab === 'analytics' ? (
          <section className="space-y-6">
            {loading ? (
              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-20 flex flex-col items-center justify-center gap-4 shadow-sm">
                <div className="w-12 h-12 border-4 border-[var(--accent-soft)] border-t-[var(--accent)] rounded-full animate-spin"></div>
                <span className="text-[var(--text-muted)] font-black uppercase tracking-widest text-[10px]">Aggregating Data...</span>
              </div>
            ) : analytics ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border-l-4 border-l-[var(--accent)]">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)] block mb-1">Total Published</span>
                    <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-extrabold text-[var(--text)]">{analytics.totalPublished ?? 0}</span>
                       <span className="text-xs text-[var(--accent)] font-bold">Records</span>
                    </div>
                  </div>

                  {analytics.byStatus && Object.entries(analytics.byStatus).map(([k, v]) => (
                    <div key={k} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)] block mb-1">
                        {STATUS_LABELS[k] || k?.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-baseline gap-2">
                         <span className="text-3xl font-extrabold text-[var(--text)]">{v}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
                      <h4 className="text-xs uppercase tracking-[0.2em] font-black text-[var(--accent)] mb-6 border-b border-[var(--accent-soft)] pb-2 flex items-center gap-2">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                         Publications per Year
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(analytics.byYear || {})
                          .sort((a, b) => Number(b[0]) - Number(a[0]))
                          .map(([y, c]) => (
                            <div key={y} className="flex justify-between items-center group">
                               <span className="text-sm font-bold text-[var(--text)]">{y}</span>
                               <div className="flex-1 mx-4 h-1 bg-[var(--border-color)] rounded-full overflow-hidden">
                                  <div className="h-full bg-[var(--accent)] opacity-20 group-hover:opacity-100 transition-opacity" style={{ width: `${Math.min((c / (analytics.totalPublished || 1)) * 100, 100)}%` }}></div>
                               </div>
                               <span className="text-sm font-black text-[var(--accent)] font-mono">{c}</span>
                            </div>
                          ))}
                      </div>
                   </div>

                   <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
                      <h4 className="text-xs uppercase tracking-[0.2em] font-black text-[var(--accent)] mb-6 border-b border-[var(--accent-soft)] pb-2 flex items-center gap-2">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                         Dominant Categories
                      </h4>
                      <div className="flex flex-wrap gap-3">
                         {Object.entries(analytics.byCategory || {})
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, c]) => (
                               <div key={cat} className="px-4 py-2 bg-[var(--accent-soft)] border border-[var(--accent-soft)] rounded-xl flex items-center gap-3">
                                  <span className="text-xs font-bold text-[var(--accent)]">{cat}</span>
                                  <span className="text-[10px] bg-[var(--accent)] text-white px-2 py-0.5 rounded-full font-black">{c}</span>
                               </div>
                            ))}
                      </div>
                   </div>
                </div>

                {analytics.mostActiveFaculty?.length > 0 && (
                  <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
                    <h4 className="text-xs uppercase tracking-[0.2em] font-black text-[var(--accent)] mb-6 border-b border-[var(--accent-soft)] pb-2">
                       Most Active Faculty Researchers
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.mostActiveFaculty.map((row, idx) => (
                        <div key={row.userId} className="flex items-center gap-4 p-4 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[var(--border-color)]">
                           <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-black text-xs">
                              #{idx + 1}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-[var(--text)]">{row.displayName}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-tighter">{row.count} Publication{row.count === 1 ? '' : 's'}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-20 text-center opacity-50 italic">No analytics data available.</div>
            )}
          </section>
        ) : loading ? (
          <div className="college-research-page-loading content-panel" role="status">
            <div className="college-research-spinner college-research-spinner-lg" />
            <span>Loading records…</span>
          </div>
        ) : (
          <section className={repoViewMode === 'list' ? "bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm" : "w-full"}>
            {repoViewMode === 'list' ? (
              <div className="table-wrapper !bg-transparent !rounded-none">
                <table className="data-table w-full">
                  <thead>
                    <tr className="bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.02)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4 text-[var(--accent)]">Reference</th>
                      <th className="px-6 py-4">Research Title</th>
                      <th className="px-6 py-4">Year</th>
                      <th className="px-6 py-4 text-center">Course</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-[var(--text-muted)] italic">
                           <div className="flex flex-col items-center gap-2 opacity-50">
                              <CrIconList size={32} />
                              <span>No research records found matching your criteria.</span>
                           </div>
                        </td>
                      </tr>
                    ) : (
                      items.map((row) => (
                        <Fragment key={row.id}>
                          <tr className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                            <td className="py-4 pl-6">
                              {row.repository_ref ? (
                                <span className="text-[10px] font-black text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-1 rounded tracking-tighter">PUBLISHED: {row.repository_ref}</span>
                              ) : row.submission_ref ? (
                                <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--border-color)] px-2 py-1 rounded tracking-tighter">SUB: {row.submission_ref}</span>
                              ) : (
                                <span className="text-[10px] opacity-20">—</span>
                              )}
                            </td>
                            <td className="py-4">
                               <div className="max-w-md">
                                  <p className="font-bold text-[var(--text)] text-sm line-clamp-1 group-hover:text-[var(--accent)] transition-colors">{row.title}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-tight mt-1">{row.research_type?.replace(/_/g, ' ')}</p>
                               </div>
                            </td>
                            <td className="py-4 text-xs font-mono text-[var(--text-muted)]">{row.year}</td>
                            <td className="py-4 text-center">
                               <span className={`text-[10px] font-bold px-2 py-1 rounded ${row.course === 'CS' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                  {row.course}
                               </span>
                            </td>
                            <td className="py-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                row.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                row.status === 'under_review' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}>
                                {STATUS_LABELS[row.status] || row.status?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-4 pr-6">
                               <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    className={`p-2 rounded-lg transition-all ${expandedId === row.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                                    title="View details"
                                  >
                                    <CrIconDetails size={16} expanded={expandedId === row.id} />
                                  </button>
                                  {row.has_pdf && (
                                    <button
                                      type="button"
                                      className="p-2 rounded-lg bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all"
                                      onClick={() => downloadPdf(row.id, row.title)}
                                      title="Download PDF"
                                    >
                                      <CrIconPdf size={16} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      className="p-2 rounded-lg bg-[var(--border-color)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                      onClick={() => openDeleteConfirm(row)}
                                      title="Delete record"
                                    >
                                      <CrIconTrash size={16} />
                                    </button>
                                  )}
                               </div>
                            </td>
                          </tr>
                          {expandedId === row.id ? (
                            <tr className="bg-[rgba(0,0,0,0.2)] animate-slide-down">
                              <td colSpan={6} className="p-8">
                                 {researchDetailBlock(row)}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
                {items.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-[var(--text-muted)] italic opacity-50 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)]">No records found.</div>
                ) : (
                  items.map((row) => (
                    <article key={row.id} className="group relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:translate-y-[-4px] hover:border-[var(--accent-soft)] flex flex-col">
                       {/* Header Bar */}
                       <div className="flex justify-between items-start p-5 pb-3">
                          <div className="flex flex-col gap-1">
                             {row.repository_ref ? (
                                <span className="text-[9px] font-black tracking-widest text-[var(--accent)] uppercase bg-[var(--accent-soft)] px-2 py-0.5 rounded w-fit">Published: {row.repository_ref}</span>
                             ) : (
                                <span className="text-[9px] font-bold tracking-widest text-[var(--text-muted)] uppercase bg-[var(--border-color)] px-2 py-0.5 rounded w-fit">Submission</span>
                             )}
                             <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border w-fit ${
                                row.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' : 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                             }`}>
                                {STATUS_LABELS[row.status] || row.status?.replace(/_/g, ' ')}
                             </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             {canDelete && (
                                <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10" onClick={() => openDeleteConfirm(row)}>
                                   <CrIconTrash size={14} />
                                </button>
                             )}
                          </div>
                       </div>

                       <div className="px-5 flex-1">
                          <h3 className="text-base font-extrabold text-[var(--text)] leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-3 mb-3 cursor-pointer" onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}>
                             {row.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-4">
                             <div className="flex items-center gap-1.5 px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] rounded text-[10px] font-bold text-[var(--text-muted)]">
                                {row.course}
                             </div>
                             <div className="flex items-center gap-1.5 px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] rounded text-[10px] font-bold text-[var(--text-muted)]">
                                {row.year}
                             </div>
                             <div className="flex items-center gap-1.5 px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[var(--border-color)] rounded text-[10px] font-bold text-[var(--text-muted)] uppercase">
                                {row.research_type?.split('_')[0]}
                             </div>
                          </div>
                       </div>

                       <div className="p-5 pt-0 mt-auto flex items-center justify-between border-t border-[var(--border-color)] bg-[rgba(255,255,255,0.01)] transition-colors group-hover:bg-[rgba(255,255,255,0.03)]">
                          <button 
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--accent)] hover:text-[var(--text)] transition-colors"
                            onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                          >
                             {expandedId === row.id ? 'Hide Details' : 'View Details'}
                             <CrIconDetails size={12} expanded={expandedId === row.id} />
                          </button>
                          {row.has_pdf && (
                             <button 
                                className="p-2 rounded-xl bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-soft)] hover:scale-110 active:scale-95 transition-all"
                                onClick={() => downloadPdf(row.id, row.title)}
                             >
                                <CrIconPdf size={16} />
                             </button>
                          )}
                       </div>
                       {expandedId === row.id && (
                          <div className="p-5 bg-[rgba(0,0,0,0.4)] border-t border-[var(--border-color)] animate-fade-in">
                             {researchDetailBlock(row)}
                          </div>
                       )}
                    </article>
                  ))
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
