import { useState, useEffect, useRef } from 'react'
import { Search, BarChart2, Link2, ArrowRight } from 'lucide-react'
import { dashboards } from '../data/dashboards'
import { links } from '../data/links'

export function CommandPalette({ onClose, onSelectProject }) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const all = [
    ...dashboards.map(d => ({ type: 'project', item: d, key: `p${d.id}` })),
    ...links.map(l => ({ type: 'link', item: l, key: l.id })),
  ]

  const filtered = query.trim()
    ? all.filter(({ item }) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      )
    : all

  useEffect(() => { setActiveIdx(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.children[activeIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && filtered[activeIdx]) {
        const { type, item } = filtered[activeIdx]
        if (type === 'project') onSelectProject(item)
        else window.open(item.url, '_blank', 'noopener,noreferrer')
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, activeIdx, onClose, onSelectProject])

  const handleClick = ({ type, item }) => {
    if (type === 'project') onSelectProject(item)
    else window.open(item.url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <>
      <div className="cp-overlay" onClick={onClose} />
      <div className="cp-modal" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
        <div className="cp-search-row">
          <Search size={14} className="cp-search-icon" />
          <input
            ref={inputRef}
            className="cp-input"
            placeholder="Buscar projetos, links..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="cp-esc-badge" onClick={onClose}>Esc</kbd>
        </div>

        <div className="cp-results" ref={listRef}>
          {filtered.length === 0 && (
            <div className="cp-empty">Nenhum resultado para "{query}"</div>
          )}
          {filtered.map(({ type, item, key }, idx) => (
            <button
              key={key}
              className={`cp-item${idx === activeIdx ? ' cp-item-active' : ''}`}
              onClick={() => handleClick({ type, item })}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              <span className="cp-item-icon">
                {type === 'project' ? <BarChart2 size={13} /> : <Link2 size={13} />}
              </span>
              <span className="cp-item-name">{item.name}</span>
              <span className="cp-item-meta">{item.category}</span>
              <ArrowRight size={11} className="cp-item-arrow" />
            </button>
          ))}
        </div>

        <div className="cp-footer">
          <span><kbd>↑↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>Esc</kbd> fechar</span>
        </div>
      </div>
    </>
  )
}
