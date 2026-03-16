import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, X, ChevronRight, ChevronDown, ClipboardList, Calendar, AlignLeft } from 'lucide-react'
import { dashboards } from '../data/dashboards'

// ── Date field constants ───────────────────────────────────────
const MONTHS_PT = [
  ['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],
  ['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],
  ['09','Set'],['10','Out'],['11','Nov'],['12','Dez'],
]
const CUR_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => String(CUR_YEAR + i))
const DAYS  = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

// ── Statuses ───────────────────────────────────────────────────
export const STATUSES = [
  { id: 'creating', label: 'Criando',    color: '#818cf8' },
  { id: 'todo',     label: 'A Fazer',    color: '#6b7280' },
  { id: 'doing',    label: 'Fazendo',    color: '#f59e0b' },
  { id: 'review',   label: 'Em Análise', color: '#f97316' },
  { id: 'done',     label: 'Pronta',     color: '#22c55e' },
]

// ── Progress (recursive) ───────────────────────────────────────
function getProgress(task) {
  if (!task.children?.length) return task.status === 'done' ? 100 : 0
  const sum = task.children.reduce((acc, c) => acc + getProgress(c), 0)
  return Math.round(sum / task.children.length)
}

// ── Tree helpers ───────────────────────────────────────────────
function makeTask(title, projectId = null, opts = {}) {
  return {
    id: `t${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
    title: title.trim(),
    projectId,
    status: opts.status || 'todo',
    children: [],
    createdAt: Date.now(),
    dueDate: opts.dueDate || null,
    description: opts.description || '',
  }
}

function treeUpdate(tasks, id, fn) {
  return tasks.map(t =>
    t.id === id
      ? fn(t)
      : { ...t, children: treeUpdate(t.children || [], id, fn) }
  )
}

function treeDelete(tasks, id) {
  return tasks
    .filter(t => t.id !== id)
    .map(t => ({ ...t, children: treeDelete(t.children || [], id) }))
}

function treeAddChild(tasks, parentId, child) {
  return tasks.map(t =>
    t.id === parentId
      ? { ...t, children: [...(t.children || []), child] }
      : { ...t, children: treeAddChild(t.children || [], parentId, child) }
  )
}

function countActive(tasks) {
  return tasks.reduce((n, t) => {
    const self = t.status !== 'done' ? 1 : 0
    return n + self + countActive(t.children || [])
  }, 0)
}

function formatDueDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date - today) / 86400000)
  if (diff < 0) return { label: `${Math.abs(diff)}d atraso`, variant: 'overdue' }
  if (diff === 0) return { label: 'Hoje', variant: 'today' }
  if (diff === 1) return { label: 'Amanhã', variant: 'soon' }
  if (diff <= 7) return { label: `${diff} dias`, variant: 'soon' }
  return { label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), variant: '' }
}

// ── Hook ───────────────────────────────────────────────────────
function useTasks() {
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lucc-tasks') || '[]') }
    catch { return [] }
  })

  const save = useCallback(updater => {
    setTasks(cur => {
      const next = typeof updater === 'function' ? updater(cur) : updater
      try { localStorage.setItem('lucc-tasks', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return {
    tasks,
    addTask:    (title, pid, opts)  => save(cur => [makeTask(title, pid, opts), ...cur]),
    addSubtask: (parentId, t)       => save(cur => treeAddChild(cur, parentId, makeTask(t))),
    setStatus:  (id, status)        => save(cur => treeUpdate(cur, id, t => ({ ...t, status }))),
    deleteTask: id                  => save(cur => treeDelete(cur, id)),
  }
}

// ── Status badge (click to cycle) ─────────────────────────────
function StatusBadge({ status, onChange }) {
  const idx   = STATUSES.findIndex(s => s.id === status)
  const s     = STATUSES[Math.max(idx, 0)]
  const cycle = e => { e.stopPropagation(); onChange(STATUSES[(idx + 1) % STATUSES.length].id) }

  return (
    <button
      className="ti-status"
      onClick={cycle}
      title={`${s.label} — clique para avançar`}
      style={{ '--sc': s.color, borderColor: `${s.color}30` }}
    >
      <span className="ti-status-dot" />
      <span className="ti-status-lbl">{s.label}</span>
    </button>
  )
}

// ── Date field (3 selects — day / month / year) ───────────────
function DateField({ value, onChange }) {
  const parts  = value ? value.split('-') : ['', '', '']
  const [selY, setSelY] = useState(parts[0] || '')
  const [selM, setSelM] = useState(parts[1] || '')
  const [selD, setSelD] = useState(parts[2] || '')

  const emit = (y, m, d) => onChange(y && m && d ? `${y}-${m}-${d}` : '')

  return (
    <div className="modal-date-row">
      <select
        className="modal-input modal-date-select"
        value={selD}
        onChange={e => { setSelD(e.target.value); emit(selY, selM, e.target.value) }}
      >
        <option value="">Dia</option>
        {DAYS.map(d => <option key={d} value={d}>{parseInt(d)}</option>)}
      </select>
      <select
        className="modal-input modal-date-select"
        value={selM}
        onChange={e => { setSelM(e.target.value); emit(selY, e.target.value, selD) }}
      >
        <option value="">Mês</option>
        {MONTHS_PT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <select
        className="modal-input modal-date-select modal-date-year"
        value={selY}
        onChange={e => { setSelY(e.target.value); emit(e.target.value, selM, selD) }}
      >
        <option value="">Ano</option>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

// ── Status select (for modal) ─────────────────────────────────
function StatusSelectField({ value, onChange }) {
  const statusObj = STATUSES.find(s => s.id === value) || STATUSES[1]
  return (
    <div className="modal-status-wrap">
      <span className="modal-status-preview" style={{ background: statusObj.color }} />
      <select
        className="modal-input modal-status-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {STATUSES.map(s => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── Task Create Modal ──────────────────────────────────────────
function TaskCreateModal({ onAdd, onClose }) {
  const [title,       setTitle]       = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [projectId,   setProjectId]   = useState('')
  const [description, setDescription] = useState('')
  const [status,      setStatus]      = useState('todo')
  const titleRef = useRef(null)

  useEffect(() => {
    titleRef.current?.focus()
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const submit = e => {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title, projectId || null, {
      dueDate:     dueDate || null,
      description: description.trim(),
      status,
    })
    onClose()
  }

  return (
    <div
      className="task-modal-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="task-modal" role="dialog" aria-modal="true" aria-label="Nova Tarefa">
        <div className="task-modal-header">
          <h3 className="task-modal-title">Nova Tarefa</h3>
          <button className="task-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={15} />
          </button>
        </div>

        <form className="task-modal-form" onSubmit={submit}>
          {/* Nome */}
          <div className="modal-field">
            <label className="modal-label">
              Nome <span className="modal-req">*</span>
            </label>
            <input
              ref={titleRef}
              className="modal-input"
              placeholder="O que precisa ser feito?"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Data */}
          <div className="modal-field">
            <label className="modal-label">
              <Calendar size={11} /> Data
            </label>
            <DateField value={dueDate} onChange={setDueDate} />
          </div>

          {/* Projeto */}
          <div className="modal-field">
            <label className="modal-label">Projeto</label>
            <select
              className="modal-input modal-select"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">Nenhum</option>
              {dashboards.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div className="modal-field">
            <label className="modal-label">
              <AlignLeft size={11} /> Descrição
            </label>
            <textarea
              className="modal-input modal-textarea"
              placeholder="Detalhes opcionais..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="modal-field">
            <label className="modal-label">Status inicial</label>
            <StatusSelectField value={status} onChange={setStatus} />
          </div>

          {/* Ações */}
          <div className="modal-actions">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="modal-btn-submit" disabled={!title.trim()}>
              <Plus size={14} />
              Criar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Recursive Task Item ────────────────────────────────────────
function TaskItem({ task, depth, hooks, expanded, onToggle }) {
  const { addSubtask, setStatus, deleteTask } = hooks
  const progress  = getProgress(task)
  const hasKids   = task.children?.length > 0
  const isOpen    = expanded.has(task.id)
  const project   = task.projectId ? dashboards.find(d => d.id === task.projectId) : null
  const indent    = depth * 18
  const statusObj = STATUSES.find(s => s.id === task.status) || STATUSES[1]
  const due       = formatDueDate(task.dueDate)

  const [adding,     setAdding]     = useState(false)
  const [childTitle, setChildTitle] = useState('')
  const inputRef = useRef(null)

  const openAdd = e => {
    e.stopPropagation()
    setAdding(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const submitChild = e => {
    e.preventDefault()
    if (!childTitle.trim()) return
    addSubtask(task.id, childTitle)
    setChildTitle('')
    setAdding(false)
    if (!isOpen) onToggle(task.id)
  }

  return (
    <div className="ti">
      {/* Main row */}
      <div
        className="ti-row"
        style={{
          marginLeft: indent,
          '--status-color': statusObj.color,
        }}
      >
        {/* Left status stripe */}
        <span className="ti-stripe" />

        <button className="ti-expand" onClick={() => onToggle(task.id)}>
          {hasKids
            ? (isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />)
            : <span className="ti-leaf" />
          }
        </button>

        <div className="ti-main">
          <span className={`ti-title${task.status === 'done' ? ' ti-title-done' : ''}`}>
            {task.title}
          </span>
          <div className="ti-meta">
            {project && <span className="ti-proj">{project.name}</span>}
            {due && (
              <span className={`ti-date ti-date-${due.variant}`}>
                <Calendar size={10} />
                {due.label}
              </span>
            )}
            {task.description && (
              <span className="ti-desc">{task.description}</span>
            )}
          </div>
        </div>

        {hasKids && (
          <span className="ti-pct" style={{ color: progress === 100 ? '#22c55e' : 'var(--text-mid)' }}>
            {progress}%
          </span>
        )}

        <StatusBadge status={task.status} onChange={s => setStatus(task.id, s)} />

        <div className="ti-actions">
          <button className="ti-btn" onClick={openAdd} title="Adicionar subtarefa">
            <Plus size={11} />
          </button>
          <button className="ti-btn ti-btn-del" onClick={() => deleteTask(task.id)} title="Remover">
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {hasKids && (
        <div className="ti-bar-wrap" style={{ marginLeft: indent + 26 }}>
          <div
            className="ti-bar-fill"
            style={{
              width: `${progress}%`,
              background: progress === 100 ? '#22c55e' : 'var(--accent)',
            }}
          />
        </div>
      )}

      {/* Add subtask inline form */}
      {adding && (
        <form
          className="ti-add-child"
          style={{ marginLeft: indent + 26 }}
          onSubmit={submitChild}
        >
          <input
            ref={inputRef}
            className="ti-add-input"
            placeholder="Nome da subtarefa..."
            value={childTitle}
            onChange={e => setChildTitle(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setAdding(false)}
          />
          <button className="ti-add-ok" type="submit" disabled={!childTitle.trim()}>Adicionar</button>
          <button className="ti-add-cancel" type="button" onClick={() => setAdding(false)}>
            <X size={11} />
          </button>
        </form>
      )}

      {/* Recursive children */}
      {isOpen && hasKids && (
        <div className="ti-children">
          {task.children.map(child => (
            <TaskItem
              key={child.id}
              task={child}
              depth={depth + 1}
              hooks={hooks}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── TaskManager ────────────────────────────────────────────────
export function TaskManager() {
  const taskHooks = useTasks()
  const { tasks } = taskHooks

  const [expanded,  setExpanded]  = useState(() => new Set())
  const [modalOpen, setModalOpen] = useState(false)

  const toggle = useCallback(id => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Atalho N → abre modal (fora de campos de texto)
  useEffect(() => {
    const handler = e => {
      const tag = document.activeElement.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setModalOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const active = countActive(tasks)
  const done   = tasks.filter(t => t.status === 'done').length

  return (
    <div className="task-manager">
      <div className="task-header">
        <div className="task-header-left">
          <h2 className="task-header-title">Tarefas</h2>
          {tasks.length > 0 && (
            <div className="task-header-stats">
              {active > 0 && (
                <span className="task-stat task-stat-active">
                  {active} ativa{active !== 1 ? 's' : ''}
                </span>
              )}
              {done > 0 && (
                <span className="task-stat task-stat-done">
                  {done} concluída{done !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          className="task-add-cta"
          onClick={() => setModalOpen(true)}
          title="Nova tarefa (N)"
        >
          <Plus size={15} />
          Nova Tarefa
        </button>
      </div>

      {tasks.length === 0 && (
        <div className="task-empty">
          <ClipboardList size={32} strokeWidth={1.2} />
          <p>Nenhuma tarefa ainda</p>
          <span>
            Clique em <strong>Nova Tarefa</strong> ou pressione <kbd>N</kbd>
          </span>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="task-tree">
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              depth={0}
              hooks={taskHooks}
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <TaskCreateModal
          onAdd={taskHooks.addTask}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
