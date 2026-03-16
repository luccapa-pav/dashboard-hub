import { useState, useRef } from 'react'
import { Plus, X, Circle, Clock, CheckCircle2 } from 'lucide-react'
import { dashboards } from '../data/dashboards'

const COLUMNS = [
  { id: 'todo',  label: 'A Fazer',       Icon: Circle       },
  { id: 'doing', label: 'Em Progresso',  Icon: Clock        },
  { id: 'done',  label: 'Concluído',     Icon: CheckCircle2 },
]

function useTasks() {
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lucc-tasks') || '[]') }
    catch { return [] }
  })

  const save = next => {
    setTasks(next)
    localStorage.setItem('lucc-tasks', JSON.stringify(next))
  }

  const addTask = (title, projectId) => {
    save([{
      id: `t${Date.now()}`,
      title: title.trim(),
      projectId: projectId || null,
      status: 'todo',
      createdAt: Date.now(),
    }, ...tasks])
  }

  const moveTask = (id, status) =>
    save(tasks.map(t => t.id === id ? { ...t, status } : t))

  const deleteTask = id =>
    save(tasks.filter(t => t.id !== id))

  return { tasks, addTask, moveTask, deleteTask }
}

function AddTaskForm({ onAdd }) {
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const inputRef = useRef(null)

  const handleSubmit = e => {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title, project ? parseInt(project) : null)
    setTitle('')
    setProject('')
    inputRef.current?.focus()
  }

  return (
    <form className="task-add-form" onSubmit={handleSubmit}>
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

function TaskCard({ task, onMove, onDelete }) {
  const project = task.projectId
    ? dashboards.find(d => d.id === task.projectId)
    : null
  const others = COLUMNS.filter(c => c.id !== task.status)

  return (
    <div className="task-card">
      <div className="task-card-top">
        <p className="task-title">{task.title}</p>
        <button
          className="task-delete"
          onClick={() => onDelete(task.id)}
          aria-label="Remover tarefa"
        >
          <X size={12} />
        </button>
      </div>
      {project && <span className="task-project">{project.name}</span>}
      <div className="task-actions">
        {others.map(col => (
          <button
            key={col.id}
            className="task-move-btn"
            onClick={() => onMove(task.id, col.id)}
          >
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TaskManager() {
  const { tasks, addTask, moveTask, deleteTask } = useTasks()
  const active = tasks.filter(t => t.status !== 'done').length

  return (
    <div className="task-manager">
      <div className="task-header">
        <h2 className="task-header-title">Tarefas</h2>
        {active > 0 && (
          <span className="task-header-count">{active} ativa{active !== 1 ? 's' : ''}</span>
        )}
      </div>

      <AddTaskForm onAdd={addTask} />

      <div className="task-columns">
        {COLUMNS.map(({ id, label, Icon }) => {
          const col = tasks.filter(t => t.status === id)
          return (
            <div key={id} className="task-column">
              <div className="task-column-header">
                <Icon size={12} />
                <span>{label}</span>
                <span className="task-column-count">{col.length}</span>
              </div>
              <div className="task-column-body">
                {col.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onMove={moveTask}
                    onDelete={deleteTask}
                  />
                ))}
                {col.length === 0 && (
                  <div className="task-column-empty">Vazio</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
