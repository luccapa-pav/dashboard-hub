import { useState, useRef, useCallback } from 'react'
import { Plus, X, ChevronRight, ChevronDown } from 'lucide-react'
import { dashboards } from '../data/dashboards'

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
function makeTask(title, projectId = null) {
  return {
    id: `t${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
    title: title.trim(),
    projectId,
    status: 'todo',
    children: [],
    createdAt: Date.now(),
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

// ── Hook ───────────────────────────────────────────────────────
function useTasks() {
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lucc-tasks') || '[]') }
    catch { return [] }
  })

  const save = useCallback(next => {
    setTasks(next)
    localStorage.setItem('lucc-tasks', JSON.stringify(next))
  }, [])

  return {
    tasks,
    addTask:    (title, pid)    => save([makeTask(title, pid), ...tasks]),
    addSubtask: (parentId, t)   => save(treeAddChild(tasks, parentId, makeTask(t))),
    setStatus:  (id, status)    => save(treeUpdate(tasks, id, t => ({ ...t, status }))),
    deleteTask: id              => save(treeDelete(tasks, id)),
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
      style={{ '--sc': s.color, borderColor: `${s.color}50` }}
    >
      <span className="ti-status-dot" />
      <span className="ti-status-lbl">{s.label}</span>
    </button>
  )
}

// ── Recursive Task Item ────────────────────────────────────────
function TaskItem({ task, depth, hooks, expanded, onToggle }) {
  const { addSubtask, setStatus, deleteTask } = hooks
  const progress  = getProgress(task)
  const hasKids   = task.children?.length > 0
  const isOpen    = expanded.has(task.id)
  const project   = task.projectId ? dashboards.find(d => d.id === task.projectId) : null
  const indent    = depth * 20

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
    // auto-expand so new child is visible
    if (!isOpen) onToggle(task.id)
  }

  return (
    <div className="ti">
      {/* Main row */}
      <div className="ti-row" style={{ marginLeft: indent }}>
        <button className="ti-expand" onClick={() => onToggle(task.id)}>
          {hasKids
            ? (isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />)
            : <span className="ti-leaf" />
          }
        </button>

        <span className={`ti-title${task.status === 'done' ? ' ti-title-done' : ''}`}>
          {task.title}
        </span>

        {project && <span className="ti-proj">{project.name}</span>}

        {hasKids && (
          <span className="ti-pct">{progress}%</span>
        )}

        <StatusBadge status={task.status} onChange={s => setStatus(task.id, s)} />

        <button className="ti-btn" onClick={openAdd} title="Adicionar subtarefa">
          <Plus size={11} />
        </button>
        <button className="ti-btn ti-btn-del" onClick={() => deleteTask(task.id)} title="Remover">
          <X size={11} />
        </button>
      </div>

      {/* Progress bar */}
      {hasKids && (
        <div className="ti-bar-wrap" style={{ marginLeft: indent + 28 }}>
          <div className="ti-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Add subtask inline form */}
      {adding && (
        <form
          className="ti-add-child"
          style={{ marginLeft: indent + 28 }}
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
          <button className="ti-add-ok" type="submit" disabled={!childTitle.trim()}>OK</button>
          <button className="ti-add-cancel" type="button" onClick={() => setAdding(false)}>×</button>
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

// ── Top-level add form ─────────────────────────────────────────
function AddTaskForm({ onAdd }) {
  const [title,   setTitle]   = useState('')
  const [project, setProject] = useState('')
  const inputRef = useRef(null)

  const submit = e => {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title, project ? parseInt(project) : null)
    setTitle('')
    setProject('')
    inputRef.current?.focus()
  }

  return (
    <form className="task-add-form" onSubmit={submit}>
      <input
        ref={inputRef}
        className="task-add-input"
        placeholder="Nova tarefa..."
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <select
        className="task-add-select"
        value={project}
        onChange={e => setProject(e.target.value)}
      >
        <option value="">Projeto</option>
        {dashboards.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button className="task-add-btn" type="submit" disabled={!title.trim()}>
        <Plus size={14} />
      </button>
    </form>
  )
}

// ── TaskManager ────────────────────────────────────────────────
export function TaskManager() {
  const taskHooks = useTasks()
  const { tasks } = taskHooks

  const [expanded, setExpanded] = useState(() => new Set())

  const toggle = useCallback(id => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const active = countActive(tasks)

  return (
    <div className="task-manager">
      <div className="task-header">
        <h2 className="task-header-title">Tarefas</h2>
        {active > 0 && (
          <span className="task-header-count">{active} ativa{active !== 1 ? 's' : ''}</span>
        )}
      </div>

      <AddTaskForm onAdd={taskHooks.addTask} />

      {tasks.length === 0 && (
        <div className="task-empty">
          <p>Nenhuma tarefa ainda</p>
          <span>Adicione sua primeira tarefa acima</span>
        </div>
      )}

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
    </div>
  )
}
