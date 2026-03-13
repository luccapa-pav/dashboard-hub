import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Scissors, TrendingUp, Workflow, Target,
  BarChart2, Users, ShoppingCart, Globe, Zap, Star,
  Sun, Moon, Search, X, ExternalLink, Clock, Tag, ArrowRight,
} from 'lucide-react'
import { dashboards } from './data/dashboards'
import './App.css'

// ── Maps ─────────────────────────────────────────────────────
const iconMap = {
  Scissors, TrendingUp, Workflow, Target,
  BarChart: BarChart2, Users, ShoppingCart, Globe, Zap, Star,
}

const statusConfig = {
  'Ativo':              { label: 'Ativo',        cls: 'status-active' },
  'Em desenvolvimento': { label: 'Em dev',        cls: 'status-dev'   },
  'Planejamento':       { label: 'Planejamento',  cls: 'status-plan'  },
  'Pausado':            { label: 'Pausado',       cls: 'status-paused'},
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(str) {
  return new Date(str).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Theme ─────────────────────────────────────────────────────
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

// ── Card Preview (visual abstrato) ────────────────────────────
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

// ── Detail Panel ──────────────────────────────────────────────
function DetailPanel({ dashboard, onClose }) {
  const Icon = iconMap[dashboard.icon] || BarChart2
  const status = statusConfig[dashboard.status] || { label: dashboard.status, cls: 'status-plan' }
  const [opening, setOpening] = useState(false)

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

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <aside className="detail-panel">
        <button className="panel-close" onClick={onClose} aria-label="Fechar">
          <X size={15} />
        </button>

        <div className="panel-preview">
          <Icon size={36} strokeWidth={1.2} />
        </div>

        <div className="panel-content">
          <div className="panel-meta">
            <span className={`status-badge ${status.cls}`}>{status.label}</span>
            <span className="panel-cat"><Tag size={10} />{dashboard.category}</span>
          </div>

          <h2>{dashboard.name}</h2>
          <p className="panel-desc">{dashboard.longDescription || dashboard.description}</p>

          {dashboard.stack?.length > 0 && (
            <div className="panel-stack">
              <span className="panel-label">Stack</span>
              <div className="stack-tags">
                {dashboard.stack.map(s => <span key={s} className="stack-tag">{s}</span>)}
              </div>
            </div>
          )}

          {dashboard.updatedAt && (
            <div className="panel-updated">
              <Clock size={11} />
              <span>Atualizado em {formatDate(dashboard.updatedAt)}</span>
            </div>
          )}

          <button
            className="panel-open-btn"
            onClick={handleOpen}
            disabled={opening}
          >
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

// ── Dashboard Card ────────────────────────────────────────────
function DashboardCard({ dashboard, index, onClick }) {
  const Icon = iconMap[dashboard.icon] || BarChart2
  const status = statusConfig[dashboard.status] || { label: dashboard.status, cls: 'status-plan' }

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
          <h3>{dashboard.name}</h3>
          <span className={`status-badge ${status.cls}`}>{status.label}</span>
        </div>
        <p>{dashboard.description}</p>
      </div>

      <div className="card-footer">
        <span className="category-tag">{dashboard.category}</span>
        <span className="card-hint">
          Ver detalhes <ArrowRight size={11} />
        </span>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────
function EmptyState({ query }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Search size={26} strokeWidth={1.5} /></div>
      <p>Nenhum resultado para <strong>"{query}"</strong></p>
      <span>Tente buscar por nome ou categoria</span>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────
function App() {
  const { theme, toggle } = useTheme()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const searchRef = useRef(null)

  // Atalhos de teclado
  useEffect(() => {
    const handler = e => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if ((e.key === 't' || e.key === 'T') && document.activeElement.tagName !== 'INPUT') {
        toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  const filtered = dashboards.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="hub">
      <header className="hub-header">
        <div className="hub-brand">
          <span className="brand-dot" />
          <span className="brand-name">LUCCA CORE</span>
        </div>
        <button
          className="theme-btn"
          onClick={toggle}
          aria-label="Alternar tema"
          title="Atalho: T"
        >
          {theme === 'dark'
            ? <Sun size={15} strokeWidth={1.75} />
            : <Moon size={15} strokeWidth={1.75} />
          }
        </button>
      </header>

      <div className="hub-intro">
        <h1>Seus projetos</h1>
        <p>Acesse e gerencie todos os seus dashboards</p>
      </div>

      <div className="hub-search">
        <Search size={14} className="search-icon" />
        <input
          ref={searchRef}
          type="text"
          placeholder='Buscar projetos... (pressione "/")'
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

      <main className="hub-grid">
        {filtered.length > 0
          ? filtered.map((d, i) => (
            <DashboardCard
              key={d.id}
              dashboard={d}
              index={i}
              onClick={setSelected}
            />
          ))
          : <EmptyState query={search} />
        }
      </main>

      {selected && (
        <DetailPanel dashboard={selected} onClose={() => setSelected(null)} />
      )}

      <footer className="hub-shortcuts">
        <span><kbd>/</kbd> buscar</span>
        <span><kbd>T</kbd> tema</span>
        <span><kbd>Esc</kbd> fechar</span>
      </footer>
    </div>
  )
}

export default App
