import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Scissors, TrendingUp, Workflow, Target,
  BarChart2, Users, ShoppingCart, Globe, Zap, Star,
  Sun, Moon, Search, X, ExternalLink, Clock, Tag, ArrowRight,
  Github, Database, Layers, LayoutGrid, FileText,
  List, LayoutList, Link2, Calendar, Plus, Trash2, ChevronDown, ArrowUpDown,
  Download, Upload,
} from 'lucide-react'
import { dashboards as staticDashboards } from './data/dashboards'
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

const ICON_OPTIONS = [
  { key: 'Globe',       label: 'Globe'      },
  { key: 'BarChart',    label: 'Analytics'  },
  { key: 'TrendingUp',  label: 'Trend'      },
  { key: 'Scissors',    label: 'Scissors'   },
  { key: 'Workflow',    label: 'Workflow'   },
  { key: 'Target',      label: 'Target'     },
  { key: 'Users',       label: 'Users'      },
  { key: 'ShoppingCart',label: 'Commerce'   },
  { key: 'Zap',         label: 'Zap'        },
  { key: 'Star',        label: 'Star'       },
]

const STATUS_OPTIONS = [
  'Ativo', 'Em desenvolvimento', 'Planejamento', 'Pausado',
]

const SORT_OPTIONS = [
  { key: 'default',   label: 'Padrão'    },
  { key: 'name',      label: 'Nome'      },
  { key: 'status',    label: 'Status'    },
  { key: 'progress',  label: 'Progresso' },
  { key: 'lastVisit', label: 'Recentes'  },
]

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

function categoryColor(name) {
  if (!name) return null
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360}, 60%, 65%)`
}

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
  } catch { return null }
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

function useCustomDashboards() {
  const [custom, setCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lucc-custom-dashboards') || '[]') }
    catch { return [] }
  })
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const undoTimerRef = useRef(null)

  const add = useCallback((data) => {
    setCustom(prev => {
      const next = [...prev, { ...data, id: `c-${Date.now()}`, isCustom: true }]
      localStorage.setItem('lucc-custom-dashboards', JSON.stringify(next))
      return next
    })
  }, [])
  const remove = useCallback((id) => {
    setCustom(prev => {
      const next = prev.filter(d => d.id !== id)
      localStorage.setItem('lucc-custom-dashboards', JSON.stringify(next))
      return next
    })
  }, [])
  const removeWithUndo = useCallback((id) => {
    setPendingDeleteId(id)
    undoTimerRef.current = setTimeout(() => {
      remove(id)
      setPendingDeleteId(null)
    }, 5000)
  }, [remove])
  const undoRemove = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setPendingDeleteId(null)
  }, [])
  const visibleCustom = useMemo(() => custom.filter(d => d.id !== pendingDeleteId), [custom, pendingDeleteId])
  return { custom: visibleCustom, add, remove, removeWithUndo, undoRemove, pendingDeleteId }
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
  const addAndAssignTag = useCallback((dashId, name) => {
    const id = Date.now().toString()
    setTags(prev => {
      const next = [...prev, { id, name }]
      localStorage.setItem('lucc-tags', JSON.stringify(next))
      return next
    })
    setDashTags(prev => {
      const current = prev[dashId] || []
      const next = { ...prev, [dashId]: [...current, id] }
      localStorage.setItem('lucc-dash-tags', JSON.stringify(next))
      return next
    })
  }, [])
  return { tags, addTag, deleteTag, assignTag, removeTagFromDash, getDashTagIds, addAndAssignTag }
}

function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('lucc-favorites') || '[]')) }
    catch { return new Set() }
  })
  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('lucc-favorites', JSON.stringify([...next]))
      return next
    })
  }, [])
  return { favorites, toggleFavorite }
}

function usePendingTasks(tab) {
  const count = (tasks) => tasks.reduce((acc, t) => {
    return acc + (t.status !== 'done' ? 1 : 0) + count(t.children || [])
  }, 0)
  const read = () => {
    try { return count(JSON.parse(localStorage.getItem('lucc-tasks') || '[]')) }
    catch { return 0 }
  }
  const [pending, setPending] = useState(read)
  useEffect(() => { setPending(read()) }, [tab])
  return pending
}

// ── Progress Ring ──────────────────────────────────────────────
function ProgressRing({ value = 0, size = 32, stroke = 2.5 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <svg width={size} height={size} className="progress-ring">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  )
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

// ── Add Project Modal ──────────────────────────────────────────
function AddProjectModal({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name: '',
    url: '',
    description: '',
    category: '',
    status: 'Planejamento',
    icon: 'Globe',
    progress: 0,
  })
  const [iconOpen, setIconOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const valid = form.name.trim() && form.url.trim()

  const handleSubmit = () => {
    if (!valid) return
    onAdd({
      ...form,
      longDescription: form.description,
      updatedAt: new Date().toISOString().split('T')[0],
    })
    onClose()
  }

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const SelectedIcon = iconMap[form.icon] || Globe

  return (
    <div className="task-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="task-modal add-modal">
        <div className="add-modal-header">
          <span className="add-modal-icon-wrap"><Plus size={16} /></span>
          <h3 className="add-modal-title">Novo Projeto</h3>
          <button className="task-modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="add-modal-body">
          {/* Name */}
          <div className="add-field">
            <label className="add-label">Nome <span className="modal-req">*</span></label>
            <input
              className="add-input"
              placeholder="Ex: Meu Dashboard"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              autoFocus
            />
          </div>

          {/* URL */}
          <div className="add-field">
            <label className="add-label">URL <span className="modal-req">*</span></label>
            <input
              className="add-input"
              placeholder="https://..."
              value={form.url}
              onChange={e => set('url', e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="add-field">
            <label className="add-label">Descrição</label>
            <input
              className="add-input"
              placeholder="Breve descrição do projeto"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Category + Icon row */}
          <div className="add-row">
            <div className="add-field add-field-half">
              <label className="add-label">Categoria</label>
              <input
                className="add-input"
                placeholder="Ex: CRM"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              />
            </div>

            <div className="add-field add-field-half">
              <label className="add-label">Ícone</label>
              <div className="add-select-wrap">
                <button
                  className="add-select-btn"
                  onClick={() => { setIconOpen(v => !v); setStatusOpen(false) }}
                >
                  <SelectedIcon size={14} />
                  <span>{ICON_OPTIONS.find(i => i.key === form.icon)?.label}</span>
                  <ChevronDown size={12} className={iconOpen ? 'chevron-open' : ''} />
                </button>
                {iconOpen && (
                  <div className="add-dropdown">
                    {ICON_OPTIONS.map(opt => {
                      const Ic = iconMap[opt.key] || Globe
                      return (
                        <button
                          key={opt.key}
                          className={`add-drop-item${form.icon === opt.key ? ' add-drop-active' : ''}`}
                          onClick={() => { set('icon', opt.key); setIconOpen(false) }}
                        >
                          <Ic size={13} /> {opt.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="add-field">
            <label className="add-label">Status</label>
            <div className="add-select-wrap">
              <button
                className="add-select-btn"
                onClick={() => { setStatusOpen(v => !v); setIconOpen(false) }}
              >
                <span className={`add-status-dot status-dot-${form.status.replace(/ /g, '-').toLowerCase()}`} />
                <span>{form.status}</span>
                <ChevronDown size={12} className={statusOpen ? 'chevron-open' : ''} />
              </button>
              {statusOpen && (
                <div className="add-dropdown">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      className={`add-drop-item${form.status === s ? ' add-drop-active' : ''}`}
                      onClick={() => { set('status', s); setStatusOpen(false) }}
                    >
                      <span className={`add-status-dot status-dot-${s.replace(/ /g, '-').toLowerCase()}`} />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="add-field">
            <label className="add-label">Progresso — {form.progress}%</label>
            <input
              type="range"
              className="add-range"
              min={0} max={100}
              value={form.progress}
              onChange={e => set('progress', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="add-modal-footer">
          <button className="add-cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="add-submit-btn" onClick={handleSubmit} disabled={!valid}>
            <Plus size={14} /> Adicionar projeto
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detail Panel ───────────────────────────────────────────────
function DetailPanel({ dashboard, onClose, lastVisit, getNote, setNote, tags, dashTagIds, assignTag, removeTagFromDash, onDelete, addAndAssignTag }) {
  const Icon = iconMap[dashboard.icon] || BarChart2
  const status = statusConfig[dashboard.status] || { label: dashboard.status, cls: 'status-plan' }
  const [opening, setOpening] = useState(false)
  const [showTagDrop, setShowTagDrop] = useState(false)
  const [newTagInput, setNewTagInput] = useState(null)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const originalNote = useRef(getNote(dashboard.id))

  const handleClose = useCallback(() => {
    if (getNote(dashboard.id) !== originalNote.current) {
      if (!window.confirm('As notas foram alteradas. Fechar painel?')) return
    }
    onClose()
  }, [onClose, getNote, dashboard.id])
  const touchStartX = useRef(null)
  const last = lastVisit(dashboard.id)
  const note = getNote(dashboard.id)
  const unassignedTags = tags.filter(t => !dashTagIds.includes(t.id))

  const handleOpen = () => {
    setOpening(true)
    setPopupBlocked(false)
    setTimeout(() => {
      const win = window.open(dashboard.url, '_blank', 'noopener,noreferrer')
      if (!win) setPopupBlocked(true)
      setOpening(false)
    }, 500)
  }

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleClose])

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
      <div className="panel-overlay" onClick={handleClose} />
      <aside
        className="detail-panel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button className="panel-close" onClick={handleClose} aria-label="Fechar">
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
                    <div className="tag-drop-divider" />
                    {newTagInput !== null ? (
                      <div className="tag-drop-create">
                        <input
                          autoFocus
                          className="tag-drop-input"
                          placeholder="Nome da tag..."
                          value={newTagInput}
                          onChange={e => setNewTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTagInput.trim()) {
                              addAndAssignTag(dashboard.id, newTagInput.trim())
                              setNewTagInput(null)
                              setShowTagDrop(false)
                            }
                            if (e.key === 'Escape') setNewTagInput(null)
                          }}
                        />
                      </div>
                    ) : (
                      <button
                        className="tag-drop-item tag-drop-create-btn"
                        onClick={() => setNewTagInput('')}
                      >
                        <Plus size={11} /> Criar nova tag
                      </button>
                    )}
                  </div>
                )}
              </div>
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

          <button className="panel-open-btn" onClick={handleOpen} disabled={opening} title={dashboard.url}>
            {opening
              ? <span className="btn-spinner" />
              : <><ExternalLink size={14} />Abrir projeto</>
            }
          </button>
          {popupBlocked && (
            <div className="popup-blocked-msg">
              <span>Popup bloqueado pelo navegador.</span>
              <a
                href={dashboard.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPopupBlocked(false)}
              >
                Abrir mesmo assim →
              </a>
            </div>
          )}

          {dashboard.isCustom && (
            <button
              className="panel-delete-btn"
              onClick={() => { onDelete(dashboard.id); onClose() }}
            >
              <Trash2 size={13} /> Remover projeto
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

// ── Dashboard Card ─────────────────────────────────────────────
function DashboardCard({ dashboard, index, onClick, query, lastVisit, isFavorite, onToggleFavorite, isLastVisited }) {
  const Icon = iconMap[dashboard.icon] || BarChart2
  const status = statusConfig[dashboard.status] || { label: dashboard.status, cls: 'status-plan' }
  const last = lastVisit(dashboard.id)
  const favicon = getFavicon(dashboard.url)

  return (
    <div
      className={`card${dashboard.isCustom ? ' card-custom' : ''}${isLastVisited ? ' card-last-visited' : ''}`}
      style={{ '--i': index }}
      data-status={dashboard.status}
      onClick={() => onClick(dashboard)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(dashboard)}
    >
      <button
        className={`card-star-btn${isFavorite ? ' star-active' : ''}`}
        onClick={e => { e.stopPropagation(); onToggleFavorite(dashboard.id) }}
        title={isFavorite ? 'Remover favorito' : 'Favoritar'}
        aria-label={isFavorite ? 'Remover favorito' : 'Favoritar'}
      >
        <Star size={12} />
      </button>
      <CardPreview Icon={Icon} />
      <div className="card-body">
        <div className="card-body-head">
          <h3>
            {favicon && (
              <img
                src={favicon}
                className="card-favicon"
                alt=""
                onError={e => { e.target.style.display = 'none' }}
              />
            )}
            <Highlight text={dashboard.name} query={query} />
          </h3>
          <span className={`status-badge ${status.cls}`}>
            {status.cls === 'status-active' && <span className="pulse-dot" />}
            {status.label}
          </span>
        </div>
        <p><Highlight text={dashboard.description} query={query} /></p>
      </div>
      <div className="card-footer">
        {(() => { const c = categoryColor(dashboard.category); return (
          <span className="category-tag" style={c ? { color: c, borderColor: c + '40' } : undefined}>
            {dashboard.category}
          </span>
        )})()}
        <div className="card-footer-right">
          {dashboard.progress !== undefined && (
            <div className="card-ring-foot">
              <ProgressRing value={dashboard.progress} size={26} stroke={2.5} />
              <span className="ring-pct">{dashboard.progress}%</span>
            </div>
          )}
          {last
            ? <span className="card-hint last-visit-hint"><Clock size={10} />{relativeTime(last)}</span>
            : <span className="card-hint">Ver detalhes <ArrowRight size={11} /></span>
          }
        </div>
      </div>
    </div>
  )
}

// ── Add Project Card ───────────────────────────────────────────
function AddProjectCard({ onClick }) {
  return (
    <div
      className="card add-project-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="add-project-inner">
        <div className="add-project-icon">
          <Plus size={20} strokeWidth={1.5} />
        </div>
        <span className="add-project-label">Novo Projeto</span>
        <span className="add-project-hint">Clique para adicionar</span>
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
  const { custom, add: addCustom, remove: removeCustom, removeWithUndo, undoRemove, pendingDeleteId } = useCustomDashboards()
  const { tags, addTag, deleteTag, assignTag, removeTagFromDash, getDashTagIds, addAndAssignTag } = useTagSystem()
  const { favorites, toggleFavorite } = useFavorites()
  const [tab, setTab] = useState(() => localStorage.getItem('lucc-tab') || 'hub')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('default')
  const [showSortDrop, setShowSortDrop] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTags, setActiveTags] = useState(new Set())
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [activeStatus, setActiveStatus] = useState(null)
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lucc-search-history') || '[]') }
    catch { return [] }
  })
  const [showHistory, setShowHistory] = useState(false)
  const searchRef = useRef(null)
  const fileInputRef = useRef(null)
  const pendingTasks = usePendingTasks(tab)

  useEffect(() => { localStorage.setItem('lucc-tab', tab) }, [tab])

  const saveToHistory = useCallback((q) => {
    if (!q.trim()) return
    setSearchHistory(prev => {
      const next = [q.trim(), ...prev.filter(s => s !== q.trim())].slice(0, 5)
      localStorage.setItem('lucc-search-history', JSON.stringify(next))
      return next
    })
  }, [])

  const handleExport = useCallback(() => {
    const data = {
      customDashboards: JSON.parse(localStorage.getItem('lucc-custom-dashboards') || '[]'),
      tags:     JSON.parse(localStorage.getItem('lucc-tags')       || '[]'),
      dashTags: JSON.parse(localStorage.getItem('lucc-dash-tags')  || '{}'),
      notes:    JSON.parse(localStorage.getItem('lucc-notes')      || '{}'),
      favorites:JSON.parse(localStorage.getItem('lucc-favorites')  || '[]'),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'lucca-core-backup.json'; a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result)
        if (d.customDashboards) localStorage.setItem('lucc-custom-dashboards', JSON.stringify(d.customDashboards))
        if (d.tags)     localStorage.setItem('lucc-tags',       JSON.stringify(d.tags))
        if (d.dashTags) localStorage.setItem('lucc-dash-tags',  JSON.stringify(d.dashTags))
        if (d.notes)    localStorage.setItem('lucc-notes',      JSON.stringify(d.notes))
        if (d.favorites)localStorage.setItem('lucc-favorites',  JSON.stringify(d.favorites))
        window.location.reload()
      } catch { alert('Arquivo inválido') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const allDashboards = useMemo(() => [...staticDashboards, ...custom], [custom])

  const stats = useMemo(() => ({
    total:   allDashboards.length,
    active:  allDashboards.filter(d => d.status === 'Ativo').length,
    inDev:   allDashboards.filter(d => d.status === 'Em desenvolvimento').length,
    planned: allDashboards.filter(d => d.status === 'Planejamento').length,
  }), [allDashboards])

  const avgProgress = useMemo(() => {
    const withP = allDashboards.filter(d => d.progress !== undefined)
    if (!withP.length) return null
    return Math.round(withP.reduce((acc, d) => acc + d.progress, 0) / withP.length)
  }, [allDashboards])

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
      if (e.key === '1') setTab('hub')
      if (e.key === '2') setTab('tasks')
      if (e.key === '3') setTab('agenda')
      if ((e.key === 'f' || e.key === 'F') && selected) toggleFavorite(selected.id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  const lastVisitedId = useMemo(() => {
    let maxTs = 0, maxId = null
    allDashboards.forEach(d => {
      const ts = lastVisit(d.id)
      if (ts && ts > maxTs) { maxTs = ts; maxId = d.id }
    })
    return maxId
  }, [allDashboards, lastVisit])

  const filtered = useMemo(() => {
    let result = allDashboards.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      (d.category || '').toLowerCase().includes(search.toLowerCase())
    )
    if (activeTags.size > 0) {
      result = result.filter(d => {
        const dTagIds = getDashTagIds(d.id)
        return [...activeTags].some(id => dTagIds.includes(id))
      })
    }
    if (activeStatus) result = result.filter(d => d.status === activeStatus)
    return result
  }, [search, activeTags, activeStatus, getDashTagIds, allDashboards])

  const sortedFiltered = useMemo(() => {
    const result = [...filtered]
    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'status') result.sort((a, b) => a.status.localeCompare(b.status))
    else if (sortBy === 'progress') result.sort((a, b) => (b.progress || 0) - (a.progress || 0))
    else if (sortBy === 'lastVisit') result.sort((a, b) => (lastVisit(b.id) || 0) - (lastVisit(a.id) || 0))
    else result.sort((a, b) => (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0))
    return result
  }, [filtered, sortBy, favorites, lastVisit])

  const favCards  = useMemo(() => sortedFiltered.filter(d => favorites.has(d.id)),  [sortedFiltered, favorites])
  const restCards = useMemo(() => sortedFiltered.filter(d => !favorites.has(d.id)), [sortedFiltered, favorites])
  const hasSections = favCards.length > 0 && restCards.length > 0 && sortBy === 'default'

  const cardProps = (d, i) => ({
    key: d.id, dashboard: d, index: i,
    onClick: handleSelectDashboard, query: search, lastVisit,
    isFavorite: favorites.has(d.id), onToggleFavorite: toggleFavorite,
    isLastVisited: d.id === lastVisitedId,
  })

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
            {pendingTasks > 0 && <span className="tab-badge">{pendingTasks}</span>}
          </button>
          <button
            className={`tab-btn${tab === 'agenda' ? ' tab-active' : ''}`}
            onClick={() => setTab('agenda')}
          >
            Agenda
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />

        {tab === 'hub' && (stats.active > 0 || stats.inDev > 0) && (
          <div className="sidebar-mini-stats">
            {stats.active > 0 && <span>{stats.active} ativo{stats.active > 1 ? 's' : ''}</span>}
            {stats.inDev > 0  && <span>{stats.inDev} em dev</span>}
          </div>
        )}

        <div className="hub-sidebar-bottom" style={{ marginTop: 0 }}>
          <div className="hub-avatar" title="Lucca">L</div>
          <button className="theme-btn" title="Exportar dados" onClick={handleExport}>
            <Download size={14} strokeWidth={1.75} />
          </button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <button className="theme-btn" title="Importar dados" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} strokeWidth={1.75} />
          </button>
          <button className="theme-btn" onClick={toggle} aria-label="Alternar tema">
            {theme === 'dark'
              ? <Sun size={15} strokeWidth={1.75} />
              : <Moon size={15} strokeWidth={1.75} />
            }
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="hub-main">

        {tab === 'hub' && (
          <div className={`hub-content${selected ? ' panel-open' : ''}`}>

            {/* ── Greeting Hero ── */}
            <div className="hub-intro">
              <div className="greeting-hero">
                <span className="greeting-salut">{getGreeting()}</span>
                <h1 className="greeting-name">Lucca</h1>
                <div className="greeting-time-pill">
                  <Clock size={11} />
                  {time}
                </div>
              </div>
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
                {avgProgress !== null && (
                  <span className="stat-pill">
                    <strong>{avgProgress}%</strong> médio
                  </span>
                )}
              </div>
            </div>

            {/* ── Toolbar ── */}
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
                  onFocus={() => { if (!search && searchHistory.length) setShowHistory(true) }}
                  onBlur={() => {
                    if (search.trim()) saveToHistory(search.trim())
                    setTimeout(() => setShowHistory(false), 150)
                  }}
                />
                {search && (
                  <button className="search-clear" onClick={() => setSearch('')} aria-label="Limpar">
                    <X size={13} />
                  </button>
                )}
                {showHistory && !search && searchHistory.length > 0 && (
                  <div className="search-history-drop">
                    <span className="search-history-label">Buscas recentes</span>
                    {searchHistory.map((q, i) => (
                      <button key={i} className="search-history-item"
                        onClick={() => { setSearch(q); setShowHistory(false) }}>
                        <Clock size={11} /> {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="sort-wrap">
                <button className="sort-btn" onClick={() => setShowSortDrop(v => !v)}>
                  <ArrowUpDown size={13} />
                  <span>{SORT_OPTIONS.find(s => s.key === sortBy)?.label}</span>
                  <ChevronDown size={11} className={showSortDrop ? 'chevron-open' : ''} />
                </button>
                {showSortDrop && (
                  <div className="sort-dropdown">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        className={`sort-drop-item${sortBy === opt.key ? ' sort-drop-active' : ''}`}
                        onClick={() => { setSortBy(opt.key); setShowSortDrop(false) }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="view-toggle">
                <button
                  className={`view-btn${viewMode === 'grid' ? ' view-btn-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grade"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  className={`view-btn${viewMode === 'list' ? ' view-btn-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="Lista"
                >
                  <List size={14} />
                </button>
                <button
                  className={`view-btn${viewMode === 'compact' ? ' view-btn-active' : ''}`}
                  onClick={() => setViewMode('compact')}
                  title="Compacto"
                >
                  <LayoutList size={14} />
                </button>
              </div>
            </div>

            {/* ── Tag filter row ── */}
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

            {/* ── Status filter row ── */}
            <div className="status-filter-row">
              {['Ativo', 'Em desenvolvimento', 'Planejamento', 'Pausado'].map(s => (
                <button
                  key={s}
                  className={`status-filter-btn${activeStatus === s ? ' status-filter-active' : ''}`}
                  onClick={() => setActiveStatus(prev => prev === s ? null : s)}
                >
                  {statusConfig[s]?.label || s}
                </button>
              ))}
              {activeStatus && (
                <button className="status-filter-clear" onClick={() => setActiveStatus(null)}>
                  <X size={10} /> Limpar
                </button>
              )}
            </div>

            {search.trim() && (
              <p className="filter-count">
                <strong>{sortedFiltered.length}</strong> de {allDashboards.length} resultados
              </p>
            )}

            {/* ── Grid ── */}
            {sortedFiltered.length === 0 ? (
              <EmptyState query={search} />
            ) : hasSections ? (
              <>
                <div className="grid-section">
                  <div className="grid-section-header"><Star size={11} /> Favoritos</div>
                  <div className={`hub-grid${viewMode === 'list' ? ' list-view' : ''}${viewMode === 'compact' ? ' compact-view' : ''}`}>
                    {favCards.map((d, i) => <DashboardCard {...cardProps(d, i)} />)}
                  </div>
                </div>
                <div className="grid-section">
                  <div className="grid-section-header">Projetos</div>
                  <div className={`hub-grid${viewMode === 'list' ? ' list-view' : ''}${viewMode === 'compact' ? ' compact-view' : ''}`}>
                    {restCards.map((d, i) => <DashboardCard {...cardProps(d, i)} />)}
                    {!search.trim() && activeTags.size === 0 && !activeStatus && (
                      <AddProjectCard onClick={() => setShowAddModal(true)} />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <main className={`hub-grid${viewMode === 'list' ? ' list-view' : ''}${viewMode === 'compact' ? ' compact-view' : ''}`}>
                {sortedFiltered.map((d, i) => <DashboardCard {...cardProps(d, i)} />)}
                {!search.trim() && activeTags.size === 0 && !activeStatus && (
                  <AddProjectCard onClick={() => setShowAddModal(true)} />
                )}
              </main>
            )}

            <LinksSection />
          </div>
        )}

        {tab === 'tasks' && <TaskManager />}
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
          onDelete={(id) => { setSelected(null); removeWithUndo(id) }}
          addAndAssignTag={addAndAssignTag}
        />
      )}

      {/* ── Add Project Modal ── */}
      {showAddModal && (
        <AddProjectModal
          onAdd={addCustom}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* ── Command Palette ── */}
      {cmdOpen && (
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          onSelectProject={handleSelectDashboard}
        />
      )}

      {/* ── Undo Toast ── */}
      {pendingDeleteId && (
        <div className="undo-toast">
          <span>Projeto removido</span>
          <button className="undo-btn" onClick={undoRemove}>Desfazer</button>
        </div>
      )}
    </div>
  )
}

export default App
