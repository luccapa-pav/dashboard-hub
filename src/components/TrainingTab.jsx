import { useState, useEffect, useRef, useCallback } from 'react'
import { Dumbbell, Plus, Trash2, ChevronDown, ChevronUp, Play, Check, X, Clock, Flame, BarChart2, Edit2 } from 'lucide-react'
import { useTraining } from '../hooks/useTraining'

// ── Helpers ───────────────────────────────────────────────────
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function calcVolume(sets) {
  return Object.values(sets || {}).flat().reduce((acc, s) => acc + (s.reps * s.weightKg), 0)
}

// ── Timer Hook ────────────────────────────────────────────────
function useTimer(running) {
  const [elapsed, setElapsed] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(ref.current)
    }
    return () => clearInterval(ref.current)
  }, [running])
  return elapsed
}

// ── Stepper ───────────────────────────────────────────────────
function Stepper({ value, onChange, step = 1, min = 0, decimals = 0 }) {
  return (
    <div className="training-stepper">
      <button className="stepper-btn" onClick={() => onChange(Math.max(min, +(value - step).toFixed(decimals + 1)))}>−</button>
      <span className="stepper-val">{Number(value).toFixed(decimals)}</span>
      <button className="stepper-btn" onClick={() => onChange(+(value + step).toFixed(decimals + 1))}>+</button>
    </div>
  )
}

// ── SetRow ────────────────────────────────────────────────────
function SetRow({ set, onUpdate, onDelete }) {
  return (
    <div className={`training-set-row${set.completed ? ' set-done' : ''}`}>
      <span className="set-num">#{set.setNumber}</span>
      <div className="set-field">
        <span className="set-label">Reps</span>
        <Stepper value={set.reps} onChange={v => onUpdate({ reps: v })} step={1} min={1} />
      </div>
      <div className="set-field">
        <span className="set-label">kg</span>
        <Stepper value={set.weightKg} onChange={v => onUpdate({ weightKg: v })} step={0.5} min={0} decimals={1} />
      </div>
      <button
        className={`set-check-btn${set.completed ? ' checked' : ''}`}
        onClick={() => onUpdate({ completed: !set.completed })}
      >
        {set.completed ? <Check size={16} /> : <span>✓</span>}
      </button>
      <button className="set-del-btn" onClick={onDelete}><X size={12} /></button>
    </div>
  )
}

// ── ExerciseCard (during session) ─────────────────────────────
function ExerciseCard({ exercise, sets = [], onAddSet, onUpdateSet, onDeleteSet, history }) {
  const [expanded, setExpanded] = useState(true)
  const lastWeight = history[0]?.sets?.slice(-1)[0]?.weightKg ?? exercise.defaultWeight
  const lastReps   = history[0]?.sets?.slice(-1)[0]?.reps   ?? exercise.defaultReps

  return (
    <div className="training-exercise-card">
      <div className="ex-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="ex-card-info">
          <span className="ex-card-name">{exercise.name}</span>
          {exercise.muscleGroup && <span className="muscle-badge">{exercise.muscleGroup}</span>}
        </div>
        <div className="ex-card-meta">
          <span className="ex-sets-count">{sets.length} séries</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div className="ex-card-body">
          {history.length > 0 && (
            <div className="ex-last-session">
              Última vez: {history[0].sets.length}×{lastReps} @ {lastWeight}kg
            </div>
          )}
          {sets.map(set => (
            <SetRow
              key={set.id}
              set={set}
              onUpdate={patch => onUpdateSet(exercise.id, set.id, patch)}
              onDelete={() => onDeleteSet(exercise.id, set.id)}
            />
          ))}
          <button
            className="training-add-set-btn"
            onClick={() => onAddSet(exercise.id, lastReps, lastWeight)}
          >
            <Plus size={14} /> Adicionar série
          </button>
        </div>
      )}
    </div>
  )
}

// ── DaySelector ───────────────────────────────────────────────
function DaySelector({ selected, onChange, days }) {
  return (
    <div className="day-selector">
      {days.map((day, idx) => (
        <button
          key={day}
          className={`day-btn${selected.includes(idx) ? ' day-active' : ''}`}
          onClick={() => {
            onChange(selected.includes(idx)
              ? selected.filter(d => d !== idx)
              : [...selected, idx].sort()
            )
          }}
        >
          {day}
        </button>
      ))}
    </div>
  )
}

// ── AddExerciseForm ───────────────────────────────────────────
function AddExerciseForm({ onAdd, muscleGroups, equipment }) {
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equip, setEquip] = useState('')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button className="training-add-set-btn routine-add-ex-btn" onClick={() => setOpen(true)}>
        <Plus size={14} /> Adicionar exercício
      </button>
    )
  }

  return (
    <div className="add-exercise-form">
      <input
        className="training-input"
        placeholder="Nome do exercício"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />
      <select className="training-select" value={muscle} onChange={e => setMuscle(e.target.value)}>
        <option value="">Grupo muscular</option>
        {muscleGroups.map(m => <option key={m}>{m}</option>)}
      </select>
      <select className="training-select" value={equip} onChange={e => setEquip(e.target.value)}>
        <option value="">Equipamento</option>
        {equipment.map(eq => <option key={eq}>{eq}</option>)}
      </select>
      <div className="add-ex-actions">
        <button className="training-add-set-btn" onClick={() => {
          if (!name.trim()) return
          onAdd(name.trim(), muscle, equip)
          setName(''); setMuscle(''); setEquip(''); setOpen(false)
        }}>
          Salvar
        </button>
        <button className="set-del-btn" onClick={() => setOpen(false)}><X size={14} /></button>
      </div>
    </div>
  )
}

// ── AddTrainingDayForm ────────────────────────────────────────
function AddTrainingDayForm({ onAdd, onCancel, DAYS }) {
  const [label, setLabel] = useState('')
  const [weekDays, setWeekDays] = useState([])

  return (
    <div className="add-training-day-form">
      <input
        className="training-input"
        placeholder="Nome do dia (ex: Peito + Tríceps)"
        value={label}
        onChange={e => setLabel(e.target.value)}
        autoFocus
      />
      <DaySelector selected={weekDays} onChange={setWeekDays} days={DAYS} />
      <div className="add-ex-actions">
        <button
          className="training-add-set-btn"
          disabled={!label.trim()}
          onClick={() => { if (label.trim()) onAdd(label.trim(), weekDays) }}
        >
          Salvar
        </button>
        <button className="set-del-btn" onClick={onCancel}><X size={14} /></button>
      </div>
    </div>
  )
}

// ── ExerciseRowInRoutine ──────────────────────────────────────
function ExerciseRowInRoutine({ exercise, onDelete }) {
  return (
    <div className="routine-exercise-row">
      <div className="routine-ex-info">
        <span className="routine-ex-name">{exercise.name}</span>
        {exercise.muscleGroup && <span className="muscle-badge">{exercise.muscleGroup}</span>}
        {exercise.equipment && <span className="equip-badge">{exercise.equipment}</span>}
      </div>
      <div className="routine-ex-defaults">
        <span>{exercise.defaultSets}×{exercise.defaultReps}</span>
        {exercise.defaultWeight > 0 && <span> @ {exercise.defaultWeight}kg</span>}
      </div>
      <button className="set-del-btn" onClick={onDelete}>
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// ── TrainingDayCard ───────────────────────────────────────────
function TrainingDayCard({ day, onUpdate, onDelete, onAddExercise, onDeleteExercise, MUSCLE_GROUPS, EQUIPMENT, DAYS }) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [editLabel, setEditLabel] = useState('')

  return (
    <div className="training-day-card">
      <div className="training-day-header">
        {editingLabel ? (
          <div className="routine-edit-row">
            <input
              className="training-input"
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdate({ label: editLabel.trim() }); setEditingLabel(false) }
              }}
              autoFocus
            />
            <button className="training-add-set-btn" onClick={() => { onUpdate({ label: editLabel.trim() }); setEditingLabel(false) }}>OK</button>
            <button className="set-del-btn" onClick={() => setEditingLabel(false)}><X size={14} /></button>
          </div>
        ) : (
          <div className="training-day-title-row">
            <span className="training-day-label">{day.label}</span>
            <div className="training-day-week-badges">
              {(day.weekDays || []).map(d => (
                <span key={d} className="day-badge">{DAYS[d]}</span>
              ))}
            </div>
            <div className="training-day-actions">
              <button className="routine-edit-btn" onClick={() => { setEditingLabel(true); setEditLabel(day.label) }}>
                <Edit2 size={12} />
              </button>
              <button className="set-del-btn" onClick={onDelete}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="training-day-week-row">
        <DaySelector
          selected={day.weekDays || []}
          onChange={weekDays => onUpdate({ weekDays })}
          days={DAYS}
        />
      </div>
      <div className="training-day-exercises">
        {(day.exercises || []).sort((a, b) => a.order - b.order).map(ex => (
          <ExerciseRowInRoutine
            key={ex.id}
            exercise={ex}
            onDelete={() => onDeleteExercise(ex.id)}
          />
        ))}
        <AddExerciseForm
          onAdd={(name, muscle, equip) => onAddExercise(name, muscle, equip)}
          muscleGroups={MUSCLE_GROUPS}
          equipment={EQUIPMENT}
        />
      </div>
    </div>
  )
}

// ── RoutineCard ───────────────────────────────────────────────
function RoutineCard({
  routine, expanded, onToggle, onSetActive, isActive,
  onUpdate, onDelete,
  onAddDay, onUpdateDay, onDeleteDay,
  onAddExercise, onDeleteExercise,
  MUSCLE_GROUPS, EQUIPMENT, DAYS,
}) {
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [showAddDay, setShowAddDay] = useState(false)
  const trainingDays = routine.trainingDays || []

  return (
    <div className={`routine-card${isActive ? ' routine-card-active' : ''}`}>
      <div
        className="routine-card-header"
        onClick={() => { onToggle(); onSetActive() }}
      >
        {editingName ? (
          <div className="routine-edit-row" onClick={e => e.stopPropagation()}>
            <input
              className="training-input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdate({ name: editName.trim() }); setEditingName(false) }
              }}
              autoFocus
            />
            <button className="training-add-set-btn" onClick={() => { onUpdate({ name: editName.trim() }); setEditingName(false) }}>OK</button>
            <button className="set-del-btn" onClick={() => setEditingName(false)}><X size={14} /></button>
          </div>
        ) : (
          <>
            <div className="routine-card-title">
              <span className="routine-card-name">{routine.name}</span>
              {isActive && <span className="routine-active-badge">ativa</span>}
            </div>
            <div className="routine-card-actions" onClick={e => e.stopPropagation()}>
              <button className="routine-edit-btn" onClick={() => { setEditingName(true); setEditName(routine.name) }}>
                <Edit2 size={14} />
              </button>
              <button className="set-del-btn" onClick={() => {
                if (confirm(`Excluir rotina "${routine.name}"?`)) onDelete()
              }}>
                <Trash2 size={14} />
              </button>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </>
        )}
      </div>

      {expanded && (
        <div className="routine-card-body">
          {trainingDays.length === 0 && (
            <p className="routine-empty-hint">Nenhum dia de treino. Adicione abaixo.</p>
          )}
          {trainingDays.map(day => (
            <TrainingDayCard
              key={day.id}
              day={day}
              onUpdate={patch => onUpdateDay(day.id, patch)}
              onDelete={() => { if (confirm(`Excluir dia "${day.label}"?`)) onDeleteDay(day.id) }}
              onAddExercise={(name, muscle, equip) => onAddExercise(day.id, name, muscle, equip)}
              onDeleteExercise={(exId) => onDeleteExercise(day.id, exId)}
              MUSCLE_GROUPS={MUSCLE_GROUPS}
              EQUIPMENT={EQUIPMENT}
              DAYS={DAYS}
            />
          ))}
          {showAddDay ? (
            <AddTrainingDayForm
              onAdd={(label, weekDays) => { onAddDay(label, weekDays); setShowAddDay(false) }}
              onCancel={() => setShowAddDay(false)}
              DAYS={DAYS}
            />
          ) : (
            <button className="training-add-set-btn add-day-btn" onClick={() => setShowAddDay(true)}>
              <Plus size={14} /> Adicionar dia de treino
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── RotinasScreen ─────────────────────────────────────────────
function RotinasScreen({ training }) {
  const {
    routines, activeRoutine, setActiveRoutineId,
    addRoutine, updateRoutine, deleteRoutine,
    addTrainingDay, updateTrainingDay, deleteTrainingDay,
    addExercise, deleteExercise,
    MUSCLE_GROUPS, EQUIPMENT, DAYS,
  } = training

  const [expandedId, setExpandedId] = useState(() => activeRoutine?.id || routines[0]?.id || null)
  const [showNewRoutine, setShowNewRoutine] = useState(false)
  const [newName, setNewName] = useState('')

  const handleAddRoutine = () => {
    if (!newName.trim()) return
    const id = addRoutine(newName.trim())
    setNewName('')
    setShowNewRoutine(false)
    setExpandedId(id)
  }

  return (
    <div className="training-rotinas">
      {/* Add Routine Button */}
      {showNewRoutine ? (
        <div className="add-routine-form">
          <input
            className="training-input"
            placeholder="Nome da rotina"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddRoutine() }}
            autoFocus
          />
          <div className="add-ex-actions">
            <button className="training-add-set-btn" disabled={!newName.trim()} onClick={handleAddRoutine}>
              Criar
            </button>
            <button className="set-del-btn" onClick={() => { setShowNewRoutine(false); setNewName('') }}>
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button className="new-routine-btn" onClick={() => setShowNewRoutine(true)}>
          <Plus size={16} /> Nova Rotina
        </button>
      )}

      {/* Routine Cards */}
      {routines.length === 0 && !showNewRoutine && (
        <div className="training-empty">
          <Dumbbell size={40} strokeWidth={1.2} />
          <p>Crie sua primeira rotina acima.</p>
        </div>
      )}
      {routines.map(routine => (
        <RoutineCard
          key={routine.id}
          routine={routine}
          expanded={expandedId === routine.id}
          isActive={activeRoutine?.id === routine.id}
          onToggle={() => setExpandedId(id => id === routine.id ? null : routine.id)}
          onSetActive={() => setActiveRoutineId(routine.id)}
          onUpdate={patch => updateRoutine(routine.id, patch)}
          onDelete={() => deleteRoutine(routine.id)}
          onAddDay={(label, weekDays) => addTrainingDay(routine.id, label, weekDays)}
          onUpdateDay={(dayId, patch) => updateTrainingDay(routine.id, dayId, patch)}
          onDeleteDay={(dayId) => deleteTrainingDay(routine.id, dayId)}
          onAddExercise={(dayId, name, muscle, equip) => addExercise(routine.id, dayId, name, muscle, equip)}
          onDeleteExercise={(dayId, exId) => deleteExercise(routine.id, dayId, exId)}
          MUSCLE_GROUPS={MUSCLE_GROUPS}
          EQUIPMENT={EQUIPMENT}
          DAYS={DAYS}
        />
      ))}
    </div>
  )
}

// ── RegistrarScreen ───────────────────────────────────────────
function RegistrarScreen({ training }) {
  const {
    activeRoutine, todayTrainingDay, todaySession,
    startSession, completeSession, deleteSession,
    addSet, updateSet, deleteSet,
    addCardio, updateCardio, deleteCardio,
    exerciseHistory,
    updateSession,
  } = training

  const [manualDay, setManualDay] = useState(null)
  const session = todaySession
  const elapsed = useTimer(!!session && !session?.completed)
  const [showCardioForm, setShowCardioForm] = useState(false)
  const [cardioType, setCardioType] = useState('Corrida')
  const [cardioDur, setCardioDur] = useState(30)
  const [cardioDist, setCardioDist] = useState(0)

  if (!activeRoutine) {
    return (
      <div className="training-empty">
        <Dumbbell size={40} strokeWidth={1.2} />
        <p>Crie uma rotina primeiro na aba <strong>Rotina</strong>.</p>
      </div>
    )
  }

  const trainingDays = activeRoutine.trainingDays || []

  // Determine which training day is relevant
  const activeDay = session
    ? trainingDays.find(d => d.id === session.trainingDayId) || null
    : (manualDay || todayTrainingDay)

  if (!session) {
    // No training day today and no manual selection
    if (!activeDay) {
      return (
        <div className="training-start-screen">
          <div className="training-start-info">
            <span className="rest-day-emoji">💪</span>
            <h3>Hoje é folga</h3>
            {trainingDays.length > 0 ? (
              <p>Quer treinar mesmo assim? Escolha um dia:</p>
            ) : (
              <p>Adicione dias de treino na aba <strong>Rotina</strong>.</p>
            )}
          </div>
          {trainingDays.length > 0 && (
            <div className="training-day-picker">
              {trainingDays.map(d => (
                <button
                  key={d.id}
                  className={`training-day-pick-btn${manualDay?.id === d.id ? ' day-pick-active' : ''}`}
                  onClick={() => setManualDay(d)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="training-start-screen">
        <div className="training-start-info">
          <Dumbbell size={32} strokeWidth={1.2} />
          <h3>{activeRoutine.name}</h3>
          <p className="training-day-subtitle">{activeDay.label}</p>
          <p>{activeDay.exercises.length} exercício{activeDay.exercises.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="session-start-btn" onClick={() => startSession(activeRoutine.id, activeDay.id)}>
          <Play size={18} /> Iniciar {activeDay.label}
        </button>
      </div>
    )
  }

  const sessionExercises = activeDay?.exercises || []
  const completedSets = Object.values(session.sets).flat().filter(s => s.completed).length
  const totalSets     = Object.values(session.sets).flat().length

  return (
    <div className="training-registrar">
      {/* Timer sticky */}
      <div className="session-timer-bar">
        <Clock size={14} />
        <span className="timer-display">{formatDuration(elapsed)}</span>
        {activeDay && <span className="timer-day-label">{activeDay.label}</span>}
        <span className="timer-sets">{completedSets}/{totalSets} séries</span>
        <button className="session-abort-btn" onClick={() => { if (confirm('Cancelar treino?')) deleteSession(session.id) }}>
          <X size={14} />
        </button>
      </div>

      {/* Exercises */}
      {sessionExercises.map(ex => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          sets={session.sets[ex.id] || []}
          onAddSet={(exId, reps, weight) => addSet(session.id, exId, reps, weight)}
          onUpdateSet={(exId, setId, patch) => updateSet(session.id, exId, setId, patch)}
          onDeleteSet={(exId, setId) => deleteSet(session.id, exId, setId)}
          history={exerciseHistory(ex.id)}
        />
      ))}

      {sessionExercises.length === 0 && (
        <div className="training-empty" style={{ padding: '20px 0' }}>
          <p>Este dia não tem exercícios cadastrados.</p>
        </div>
      )}

      {/* Cardio */}
      <div className="training-cardio-section">
        <div className="cardio-section-header">
          <Flame size={16} />
          <span>Cardio</span>
          <button className="training-add-set-btn" onClick={() => setShowCardioForm(v => !v)}>
            <Plus size={14} /> Adicionar
          </button>
        </div>
        {session.cardio.map(c => (
          <div key={c.id} className="cardio-row">
            <span className="cardio-type">{c.type}</span>
            <Stepper value={c.durationMin} onChange={v => updateCardio(session.id, c.id, { durationMin: v })} step={5} min={5} />
            <span className="cardio-unit">min</span>
            <Stepper value={c.distanceKm} onChange={v => updateCardio(session.id, c.id, { distanceKm: v })} step={0.5} min={0} decimals={1} />
            <span className="cardio-unit">km</span>
            <button className="set-del-btn" onClick={() => deleteCardio(session.id, c.id)}><X size={12} /></button>
          </div>
        ))}
        {showCardioForm && (
          <div className="cardio-add-form">
            <select value={cardioType} onChange={e => setCardioType(e.target.value)} className="training-select">
              {['Corrida', 'Caminhada', 'Bicicleta', 'Elíptico', 'Remo', 'Corda', 'Nadar'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <div className="cardio-form-row">
              <Stepper value={cardioDur} onChange={setCardioDur} step={5} min={5} />
              <span>min</span>
              <Stepper value={cardioDist} onChange={setCardioDist} step={0.5} min={0} decimals={1} />
              <span>km</span>
            </div>
            <button className="training-add-set-btn" onClick={() => {
              addCardio(session.id, cardioType, cardioDur, cardioDist)
              setShowCardioForm(false)
            }}>
              Confirmar
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <textarea
        className="session-notes"
        placeholder="Observações do treino..."
        value={session.notes || ''}
        onChange={e => updateSession(session.id, { notes: e.target.value })}
        rows={2}
      />

      {/* Finish */}
      <button className="session-finish-btn" onClick={() => completeSession(session.id)}>
        <Check size={18} /> Finalizar treino
      </button>
    </div>
  )
}

// ── HistoricoScreen ───────────────────────────────────────────
function WeekSummaryBar({ sessions }) {
  const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const sessionDays = new Set(
    sessions
      .filter(s => new Date(s.startedAt) >= startOfWeek)
      .map(s => new Date(s.startedAt).getDay())
  )

  return (
    <div className="week-summary-bar">
      {days.map((d, i) => (
        <div key={i} className={`week-day-dot${sessionDays.has(i) ? ' dot-active' : ''}`}>
          <div className="dot" />
          <span>{d}</span>
        </div>
      ))}
    </div>
  )
}

function SessionCard({ session, routines, onDelete }) {
  const routine = routines.find(r => r.id === session.routineId)
  const trainingDay = routine?.trainingDays?.find(d => d.id === session.trainingDayId)
  const start = new Date(session.startedAt)
  const end   = session.finishedAt ? new Date(session.finishedAt) : null
  const durationSec = end ? Math.round((end - start) / 1000) : 0
  const volume = calcVolume(session.sets)
  const totalSets = Object.values(session.sets).flat().length

  return (
    <div className="training-session-card">
      <div className="session-card-header">
        <div className="session-card-info">
          <span className="session-card-date">{formatDate(session.startedAt)}</span>
          <span className="session-card-routine">{routine?.name || 'Rotina removida'}</span>
          {trainingDay && <span className="session-card-day">{trainingDay.label}</span>}
        </div>
        <button className="set-del-btn" onClick={() => {
          if (confirm('Excluir este treino?')) onDelete(session.id)
        }}>
          <Trash2 size={12} />
        </button>
      </div>
      <div className="session-card-stats">
        {durationSec > 0 && (
          <span className="session-stat"><Clock size={12} /> {formatDuration(durationSec)}</span>
        )}
        <span className="session-stat"><Dumbbell size={12} /> {totalSets} séries</span>
        {volume > 0 && <span className="session-stat"><BarChart2 size={12} /> {volume.toFixed(0)} kg vol.</span>}
        {session.cardio.length > 0 && (
          <span className="session-stat"><Flame size={12} /> {session.cardio.reduce((a, c) => a + c.durationMin, 0)} min cardio</span>
        )}
      </div>
      {session.notes && <p className="session-card-notes">{session.notes}</p>}
    </div>
  )
}

function HistoricoScreen({ training }) {
  const { sessions, currentWeekSessions, deleteSession } = training
  const completed = [...sessions].filter(s => s.completed).reverse()

  return (
    <div className="training-historico">
      <WeekSummaryBar sessions={completed} />
      <div className="historico-stats">
        <div className="hstat">
          <span className="hstat-val">{currentWeekSessions.length}</span>
          <span className="hstat-label">esta semana</span>
        </div>
        <div className="hstat">
          <span className="hstat-val">{completed.length}</span>
          <span className="hstat-label">total</span>
        </div>
        <div className="hstat">
          <span className="hstat-val">
            {completed.length > 0
              ? Math.round(completed.reduce((a, s) => {
                  if (!s.finishedAt) return a
                  return a + (new Date(s.finishedAt) - new Date(s.startedAt)) / 60000
                }, 0) / completed.length)
              : 0} min
          </span>
          <span className="hstat-label">média/treino</span>
        </div>
      </div>

      {completed.length === 0 ? (
        <div className="training-empty">
          <BarChart2 size={40} strokeWidth={1.2} />
          <p>Nenhum treino finalizado ainda.</p>
        </div>
      ) : (
        <div className="session-list">
          {completed.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              routines={training.routines}
              onDelete={deleteSession}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── AIFeedbackPanel ───────────────────────────────────────────
function AIFeedbackPanel({ training }) {
  const { currentWeekSessions, sessions, aiFeedbacks, saveAIFeedback, FEATURES } = training
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const requestFeedback = useCallback(async () => {
    if (!FEATURES.aiEnabled) return
    setLoading(true)
    setError(null)
    try {
      const snapshot = {
        currentWeek: currentWeekSessions,
        allSessions: sessions.slice(-14),
      }
      const res = await fetch('/api/ai-training-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const { feedback } = await res.json()
      saveAIFeedback(feedback, snapshot)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [FEATURES.aiEnabled, currentWeekSessions, sessions, saveAIFeedback])

  const latest = aiFeedbacks[0]

  return (
    <div className="training-ai-panel">
      <div className="ai-panel-header">
        <span className="ai-panel-title">Feedback Semanal</span>
        {FEATURES.aiEnabled ? (
          <button
            className="ai-request-btn"
            onClick={requestFeedback}
            disabled={loading || currentWeekSessions.length === 0}
          >
            {loading ? 'Analisando...' : 'Solicitar feedback'}
          </button>
        ) : (
          <span className="ai-disabled-hint">IA não configurada</span>
        )}
      </div>

      {error && <div className="ai-error">{error}</div>}

      {currentWeekSessions.length === 0 && (
        <div className="ai-no-data">Complete ao menos um treino esta semana para receber feedback.</div>
      )}

      {latest && (
        <div className="ai-feedback-card">
          <div className="ai-feedback-meta">
            Semana {latest.weekNumber}/{latest.year} · {new Date(latest.createdAt).toLocaleDateString('pt-BR')}
          </div>
          <div className="ai-feedback-text">{latest.text}</div>
        </div>
      )}

      {aiFeedbacks.length > 1 && (
        <div className="ai-feedback-history">
          <span className="ai-history-label">Histórico ({aiFeedbacks.length - 1} anterior{aiFeedbacks.length - 1 !== 1 ? 'es' : ''})</span>
          {aiFeedbacks.slice(1).map(fb => (
            <div key={fb.id} className="ai-feedback-card ai-feedback-old">
              <div className="ai-feedback-meta">Semana {fb.weekNumber}/{fb.year}</div>
              <div className="ai-feedback-text ai-feedback-collapsed">{fb.text.slice(0, 200)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TrainingNav ───────────────────────────────────────────────
const NAV_TABS = [
  { id: 'rotina',    label: 'Rotina' },
  { id: 'registrar', label: 'Registrar' },
  { id: 'historico', label: 'Histórico' },
  { id: 'avaliacao', label: 'Avaliação' },
]

// ── TrainingTab (main) ────────────────────────────────────────
export function TrainingTab() {
  const training = useTraining()
  const [activeNav, setActiveNav] = useState(() => training.todaySession ? 'registrar' : 'rotina')

  return (
    <div className="training-tab">
      <div className="training-nav">
        {NAV_TABS.map(t => (
          <button
            key={t.id}
            className={`training-nav-btn${activeNav === t.id ? ' training-nav-active' : ''}`}
            onClick={() => setActiveNav(t.id)}
          >
            {t.label}
            {t.id === 'registrar' && training.todaySession && (
              <span className="training-nav-dot" />
            )}
          </button>
        ))}
      </div>

      <div className="training-content">
        {activeNav === 'rotina'    && <RotinasScreen    training={training} />}
        {activeNav === 'registrar' && <RegistrarScreen  training={training} />}
        {activeNav === 'historico' && <HistoricoScreen  training={training} />}
        {activeNav === 'avaliacao' && <AIFeedbackPanel  training={training} />}
      </div>
    </div>
  )
}
