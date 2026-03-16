import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Scissors, TrendingUp, Workflow, Target,
  BarChart2, Users, ShoppingCart, Globe, Zap, Star,
  Sun, Moon, Search, X, ExternalLink, Clock, Tag, ArrowRight,
  Github, Database, Layers, LayoutGrid, FileText,
  List, Command, Link2, Calendar, Plus,
} from 'lucide-react'
import { dashboards } from './data/dashboards'
import { links } from './data/links'
import { CommandPalette } from './components/CommandPalette'
import { TaskManager } from './components/TaskManager'
import { CalendarTab } from './components/CalendarTab'
import './App.css'

// ── Icon maps ──────────────────────────────────────────────────
const iconMap = {
  Scissors, TrendingUp, Workflow, Target,
  BarChart: BarChart2, Users, ShoppingCart, Globe, Zap, Star,
}

const linkIconMap = {
  Github, Globe, Database, Layers, LayoutGrid, FileText,
}

// ── Status config ──────────────────────────────────────────────
const statusConfig = {
  'Ativo':              { label: 'Ativo',       cls: 'status-active' },
  'Em desenvolvimento': { label: 'Em dev',       cls: 'status-dev'   },
  'Planejamento':       { label: 'Planejamento', cls: 'status-plan'  },
  'Pausado':            { label: 'Pausado',      cls: 'status-paused'},
}

// ── Helpers ────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function relativeTime(ts) {
  if (!ts) return null
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}

function formatDate(str) {
  return new Date(str).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Highlight ──────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="search-mark">{part}</mark>
          : part
      )}
    </>
  )
}

// ── Hooks ──────────────────────────────────────────────────────
function useTime() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  )
  useEffect(() => {
    const id = setInterval(() =>
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    , 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('lucc-theme') || 'dark'
  )
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('lucc-theme', theme)
  }, [theme])
  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])
  return { theme, toggle }
}

function useActivity() {
  const [activity, setActivity] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lucc-activity') || '{}') }
    catch { return {} }
  })
  const track = useCallback((id) => {
    setActivity(prev => {
      const next = { ...prev, [id]: Date.now() }
      localStorage.setItem('lucc-activity', JSON.stringify(next))
      return next
    })
  }, [])
  const lastVisit = useCallback((id) => activity[id] || null, [activity])
  return { track, lastVisit }
}

function useNotes() {
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lucc-notes') || '{}') }
    catch { return {} }
  })
  const setNote = useCallback((id, text) => {
    setNotes(prev => {
      const next = { ...prev, [id]: text }
      localStorage.setItem('lucc-notes', JSON.stringify(next))
      return next
    })
  }, [])
  const getNote = useCallback((id) => notes[id] || '', [notes])
  return { getNote, setNote }
}

function useTagSystem() {
  const [tags, setTags] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lucc-tags') || '[]') }
    catch { return [] }
  })
  const [dashTags, setDashTags] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lucc-dash-tags') || '{}') }
    catch { return {} }
  })

  const addTag = useCallback((name) => {
    setTags(prev => {
      const next = [...prev, { id: Date.now().toString(), name }]
      localStorage.setItem('lucc-tags', JSON.stringify(next))
      return next
    })
  }, [])

  const deleteTag = useCallback((tagId) => {
    setTags(prev => {
      const next = prev.filter(t => t.id !== tagId)
      localStorage.setItem('lucc-tags', JSON.stringify(next))
      return next
    })
    setDashTags(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => { next[k] = next[k].filter(t => t !== tagId) })
      localStorage.setItem('lucc-dash-tags', JSON.stringify(next))
      return next
    })
  }, [])

  const assignTag = useCallback((dashId, tagId) => {
    setDashTags(prev => {
      const current = prev[dashId] || []
      if (current.includes(tagId)) return prev
      const next = { ...prev, [dashId]: [...current, tagId] }
      localStorage.setItem('lucc-dash-tags', JSON.stringify(next))
      return next
    })
  }, [])

  const removeTagFromDash = useCallback((dashId, tagId) => {
    setDashTags(prev => {
      const current = prev[dashId] || []
      const next = { ...prev, [dashId]: current.filter(t => t !== tagId) }
      localStorage.setItem('lucc-dash-tags', JSON.stringify(next))
      return next
    })
  }, [])

  const getDashTagIds = useCallback((dashId) => {
    return dashTags[dashId] || []
  }, [dashTags])

  return { tags, addTag, deleteTag, assignTag, removeTagFromDash, getDashTagIds }
}

// ── Progress Bar ───────────────────────────────────────────────
function ProgressBar({ value = 0, className = '' }) {
  return (
    <div className={`progress-track ${className}`}>
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  )
}

// ── Card Preview ───────────────────────────────────────────────
function CardPreview({ Icon }) {
  return (
    <div className="card-preview">
      <div className="preview-lines">
        <div className="preview-line" style={{ '--w': '65%', '--d': '0s' }} />
        <div className="preview-line" style={{ '--w': '45%', '--d': '0.08s' }} />
        <div className="preview-line" style={{ '--w': '80%', '--d': '0.16s' }} />
        <div className="preview-line" style={{ '--w': '35%', '--d': '0.24s' }} />
      </div>
      <div className="preview-icon">
        <Icon size={22} strokeWidth={1.4} />
      </div>
    </div>
  )
}

// ── Detail Panel ───────────────────────────────────────────────
function DetailPanel({ dashboard, onClose, lastVisit, getNote, setNote, tags, dashTagIds, assignTag, removeTagFromDash }) {
  const Icon = iconMap[dashboard.icon] || BarChart2
  const status = statusConfig[dashboard.status] || { label: dashboard.status, cls: 'status-plan' }
  const [opening, setOpening] = useState(false)
  const [showTagDrop, setShowTagDrop] = useState(false)
  const touchStartX = useRef(null)
  const last = lastVisit(dashboard.id)
  const note = getNote(dashboard.id)

  const unassignedTags = tags.filter(t => !dashTagIds.includes(t.id))

  const handleOpen = () => {
    setOpening(true)
    setTimeout(() => {
      window.open(dashboard.url, '_blank', 'noopener,noreferrer')
      setOpening(false)
    }, 500)
  }

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleTouchStart = e => { touchStartX.current = e.touches[0].clientX }
  const handleTouchMove = e => {
    if (touchStartX.current === null) return
    if (e.touches[0].clientX - touchStartX.current > 72) {
      onClose()
      touchStartX.current = null
    }
  }
  const handleTouchEnd = () => { touchStartX.current = null }

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <aside
        className="detail-panel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button className="panel-close" onClick={onClose} aria-label="Fechar">
          <X size={15} />
        </button>

        <div className="panel-preview">
          <Icon size={36} strokeWidth={1.2} />
        </div>

        <div className="panel-content">
          <div className="panel-meta">
            <span className={`status-badge ${status.cls}`}>
              {status.cls === 'status-active' && <span className="pulse-dot" />}
              {status.label}
            </span>
            <span className="panel-cat"><Tag size={10} />{dashboard.category}</span>
          </div>

          <h2>{dashboard.name}</h2>
          <p className="panel-desc">{dashboard.longDescription || dashboard.description}</p>

          {dashboard.progress !== undefined && (
            <div className="panel-stack">
              <span className="panel-label">Progresso — {dashboard.progress}%</span>
              <ProgressBar value={dashboard.progress} className="panel-progress-bar" />
            </div>
          )}

          <div className="panel-stack">
            <span className="panel-label">Tags</span>
            <div className="stack-tags">
              {dashTagIds.map(id => {
                const tag = tags.find(t => t.id === id)
                if (!tag) return null
                return (
                  <span
                    key={id}
                    className="stack-tag panel-tag-removable"
                    onClick={() => removeTagFromDash(dashboard.id, id)}
                    title="Clique para remover"
                  >
                    {tag.name} <span className="tag-x">×</span>
                  </span>
                )
              })}
              {unassignedTags.length > 0 && (
                <div className="tag-drop-wrap">
                  <button
                    className="tag-add-btn tag-add-btn-sm"
                    onClick={() => setShowTagDrop(v => !v)}
                  >
                    <Plus size={10} /> Tag
                  </button>
                  {showTagDrop && (
                    <div className="tag-dropdown">
                      {unassignedTags.map(t => (
                        <button
                          key={t.id}
                          className="tag-drop-item"
                          onClick={() => {
                            assignTag(dashboard.id, t.id)
                            setShowTagDrop(false)
                          }}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="panel-updated">
            <Clock size={11} />
            {last
              ? <span>Visitado {relativeTime(last)}</span>
              : <span>Atualizado em {formatDate(dashboard.updatedAt)}</span>
            }
          </div>

          <div className="panel-stack">
            <span className="panel-label">Notas</span>
            <textarea
              className="notes-textarea"
              placeholder="Adicione notas sobre este projeto..."
              value={note}
              onChange={e => setNote(dashboard.id, e.target.value)}
              rows={3}
            />
          </div>

          <button className="panel-open-btn" onClick={handleOpen} disabled={opening}>
            {opening
              ? <span className="btn-spinner" />
              : <><ExternalLink size={14} />Abrir projeto</>
            }
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Dashboard Card ─────────────────────────────────────────────
function DashboardCard({ dashboard, index, onClick, query, lastVisit }) {
  const Icon = iconMap[dashboard.icon] || BarChart2
  const status = statusConfig[dashboard.status] || { label: dashboard.status, cls: 'status-plan' }
  const last = lastVisit(dashboard.id)

  return (
    <div
      className="card"
      style={{ '--i': index }}
      onClick={() => onClick(dashboard)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(dashboard)}
    >
      <CardPreview Icon={Icon} />

      <div className="card-body">
        <div className="card-body-head">
          <h3><Highlight text={dashboard.name} query={query} /></h3>
          <span className={`status-badge ${status.cls}`}>
            {status.cls === 'status-active' && <span className="pulse-dot" />}
            {status.label}
          </span>
        </div>
        <p><Highlight text={dashboard.description} query={query} /></p>
        {dashboard.progress !== undefined && (
          <ProgressBar value={dashboard.progress} className="card-progress-bar" />
        )}
      </div>

      <div className="card-footer">
        <span className="category-tag">{dashboard.category}</span>
        {last
          ? <span className="card-hint last-visit-hint"><Clock size={10} />{relativeTime(last)}</span>
          : <span className="card-hint">Ver detalhes <ArrowRight size={11} /></span>
        }
      </div>
    </div>
  )
}

// ── Links Section ──────────────────────────────────────────────
function LinksSection() {
  return (
    <section className="hub-links">
      <div className="hub-links-header">
        <span className="hub-links-title">Ferramentas</span>
        <Link2 size={13} />
      </div>
      <div className="links-grid">
        {links.map(link => {
          const Icon = linkIconMap[link.icon] || Globe
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-card"
            >
              <Icon size={17} strokeWidth={1.5} />
              <span className="link-name">{link.name}</span>
              <span className="link-cat">{link.category}</span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

// ── Empty State ────────────────────────────────────────────────
function EmptyState({ query }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Search size={26} strokeWidth={1.5} /></div>
      <p>Nenhum resultado para <strong>"{query}"</strong></p>
      <span>Tente buscar por nome ou categoria</span>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────
function App() {
  const time = useTime()
  const { theme, toggle } = useTheme()
  const { track, lastVisit } = useActivity()
  const { getNote, setNote } = useNotes()
  const { tags, addTag, deleteTag, assignTag, removeTagFromDash, getDashTagIds } = useTagSystem()
  const [tab, setTab] = useState('hub')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [activeTags, setActiveTags] = useState(new Set())
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const searchRef = useRef(null)

  const stats = useMemo(() => ({
    total:   dashboards.length,
    active:  dashboards.filter(d => d.status === 'Ativo').length,
    inDev:   dashboards.filter(d => d.status === 'Em desenvolvimento').length,
    planned: dashboards.filter(d => d.status === 'Planejamento').length,
  }), [])

  const handleSelectDashboard = useCallback((d) => {
    track(d.id)
    setTab('hub')
    setSelected(d)
  }, [track])

  const toggleActiveTag = useCallback((tagId) => {
    setActiveTags(prev => {
      const next = new Set(prev)
      next.has(tagId) ? next.delete(tagId) : next.add(tagId)
      return next
    })
  }, [])

  // Atalhos de teclado
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(v => !v)
        return
      }
      if (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA') return
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 't' || e.key === 'T') toggle()
      if (e.key === 'l' || e.key === 'L') setViewMode(v => v === 'grid' ? 'list' : 'grid')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  const filtered = useMemo(() => {
    let result = dashboards.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase())
    )
    if (activeTags.size > 0) {
      result = result.filter(d => {
        const dTagIds = getDashTagIds(d.id)
        return [...activeTags].some(id => dTagIds.includes(id))
      })
    }
    return result
  }, [search, activeTags, getDashTagIds])

  return (
    <div className="hub">

      {/* ── Sidebar ── */}
      <aside className="hub-sidebar">
        <div className="hub-brand">
          <span className="brand-dot" />
          <span className="brand-name">LUCCA CORE</span>
        </div>

        <nav className="hub-tabs-nav">
          <button
            className={`tab-btn${tab === 'hub' ? ' tab-active' : ''}`}
            onClick={() => setTab('hub')}
          >
            Hub
          </button>
          <button
            className={`tab-btn${tab === 'tasks' ? ' tab-active' : ''}`}
            onClick={() => setTab('tasks')}
          >
            Tarefas
          </button>
          <button
            className={`tab-btn${tab === 'agenda' ? ' tab-active' : ''}`}
            onClick={() => setTab('agenda')}
          >
            Agenda
          </button>
        </nav>

        <div className="hub-sidebar-bottom">
          <div className="hub-avatar" title="Lucca">L</div>
          <button className="theme-btn" onClick={toggle} aria-label="Alternar tema" title="Atalho: T">
            {theme === 'dark'
              ? <Sun size={15} strokeWidth={1.75} />
              : <Moon size={15} strokeWidth={1.75} />
            }
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="hub-main">

        {/* ── Hub Tab ── */}
        {tab === 'hub' && (
          <div className="hub-content">
            {/* Greeting + Stats */}
            <div className="hub-intro">
              <h1>
                {getGreeting()}, Lucca
                <span className="greeting-time">· {time}</span>
              </h1>
              <p className="hub-subtitle">Aqui estão seus projetos e ferramentas</p>
              <div className="hub-stats">
                <span className="stat-pill">
                  <strong>{stats.total}</strong> projetos
                </span>
                {stats.active > 0 && (
                  <span className="stat-pill stat-pill-active">
                    <span className="pulse-dot" />
                    <strong>{stats.active}</strong> ativo
                  </span>
                )}
                {stats.inDev > 0 && (
                  <span className="stat-pill">
                    <strong>{stats.inDev}</strong> em dev
                  </span>
                )}
                {stats.planned > 0 && (
                  <span className="stat-pill">
                    <strong>{stats.planned}</strong> planejado
                  </span>
                )}
              </div>
            </div>

            {/* Toolbar: search + view toggle */}
            <div className="hub-toolbar">
              <div className="hub-search">
                <Search size={14} className="search-icon" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Buscar projetos..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="search-input"
                />
                {search && (
                  <button className="search-clear" onClick={() => setSearch('')} aria-label="Limpar">
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="view-toggle">
                <button
                  className={`view-btn${viewMode === 'grid' ? ' view-btn-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grade (L)"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  className={`view-btn${viewMode === 'list' ? ' view-btn-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="Lista (L)"
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* Tag filter row */}
            <div className="tag-filter-row">
              {showTagInput ? (
                <input
                  autoFocus
                  className="tag-add-input"
                  placeholder="Nome da tag..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      addTag(tagInput.trim())
                      setTagInput('')
                      setShowTagInput(false)
                    }
                    if (e.key === 'Escape') {
                      setTagInput('')
                      setShowTagInput(false)
                    }
                  }}
                  onBlur={() => { if (!tagInput.trim()) setShowTagInput(false) }}
                />
              ) : (
                <button className="tag-add-btn" onClick={() => setShowTagInput(true)}>
                  <Plus size={11} /> Nova tag
                </button>
              )}
              {tags.map(tag => (
                <button
                  key={tag.id}
                  className={`tag-pill${activeTags.has(tag.id) ? ' tag-pill-active' : ''}`}
                  onClick={() => toggleActiveTag(tag.id)}
                >
                  {tag.name}
                  <span
                    className="tag-pill-x"
                    onClick={e => { e.stopPropagation(); deleteTag(tag.id) }}
                  >×</span>
                </button>
              ))}
            </div>

            {/* Filter count */}
            {search.trim() && (
              <p className="filter-count">
                <strong>{filtered.length}</strong> de {dashboards.length} resultados
              </p>
            )}

            {/* Grid / List */}
            <main className={`hub-grid${viewMode === 'list' ? ' list-view' : ''}`}>
              {filtered.length > 0
                ? filtered.map((d, i) => (
                    <DashboardCard
                      key={d.id}
                      dashboard={d}
                      index={i}
                      onClick={handleSelectDashboard}
                      query={search}
                      lastVisit={lastVisit}
                    />
                  ))
                : <EmptyState query={search} />
              }
            </main>

            {/* Links Hub */}
            <LinksSection />
          </div>
        )}

        {/* ── Tasks Tab ── */}
        {tab === 'tasks' && <TaskManager />}

        {/* ── Agenda Tab ── */}
        {tab === 'agenda' && <CalendarTab />}

      </div>

      {/* ── Detail Panel ── */}
      {selected && (
        <DetailPanel
          dashboard={selected}
          onClose={() => setSelected(null)}
          lastVisit={lastVisit}
          getNote={getNote}
          setNote={setNote}
          tags={tags}
          dashTagIds={getDashTagIds(selected.id)}
          assignTag={assignTag}
          removeTagFromDash={removeTagFromDash}
        />
      )}

      {/* ── Command Palette ── */}
      {cmdOpen && (
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          onSelectProject={handleSelectDashboard}
        />
      )}

    </div>
  )
}

export default App
