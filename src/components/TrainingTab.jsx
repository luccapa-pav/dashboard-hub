import { useState, useEffect, useRef, useCallback } from 'react'
import { Dumbbell, Plus, Trash2, ChevronDown, ChevronUp, Play, Check, X, Clock, Flame, BarChart2, Edit2 } from 'lucide-react'
import { useTraining } from '../hooks/useTraining'

// ── Helpers ───────────────────────────────────────────────────
function parseDefaultReps(val) {
  if (typeof val === 'number') return val
  const n = parseInt(String(val), 10)
  return isNaN(n) ? 12 : n
}

// Converte [{count, reps}] → [{reps}, {reps}, ...]
function variationsToSets(variations) {
  return variations.flatMap(v =>
    Array.from({ length: Math.max(1, v.count || 1) }, () => ({ reps: String(v.reps || '12') }))
  )
}

// Converte [{reps}, {reps}, ...] → [{count, reps}] (agrupa consecutivos iguais)
function setsToVariations(sets) {
  if (!sets || sets.length === 0) return [{ count: 3, reps: '12' }]
  const result = []
  let cur = { count: 1, reps: sets[0].reps }
  for (let i = 1; i < sets.length; i++) {
    if (sets[i].reps === cur.reps) { cur.count++ }
    else { result.push(cur); cur = { count: 1, reps: sets[i].reps } }
  }
  result.push(cur)
  return result
}

const DRAFT_KEY = (id) => `training-draft-ex-${id}`

// Gets the meta description from exercise planned sets (e.g. "8-12" or "12 / 8-10")
function getExerciseMeta(sets) {
  if (!sets || sets.length === 0) return null
  const unique = [...new Set(sets.map(s => String(s.reps)))]
  return unique.join(' / ') + ' reps'
}

// Formats previous session summary for history banner
function formatPrevSummary(prevSessionSets) {
  if (!prevSessionSets || prevSessionSets.length === 0) return null
  const n = prevSessionSets.length
  const avgW = prevSessionSets.reduce((a, s) => a + (s.weightKg || 0), 0) / n
  const avgR = Math.round(prevSessionSets.reduce((a, s) => a + (s.reps || 0), 0) / n)
  return `${n}×${avgR} @ ${avgW.toFixed(1)}kg`
}

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

// Counts consecutive days with at least one completed session (going back from today)
function calcStreak(sessions) {
  const completed = sessions.filter(s => s.completed)
  if (completed.length === 0) return 0
  const trainingDays = new Set(completed.map(s => new Date(s.startedAt).toDateString()))
  let streak = 0
  const today = new Date()
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toDateString()
    if (trainingDays.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

function calcVolume(sets) {
  return Object.values(sets || {}).flat().reduce((acc, s) => acc + (s.reps * s.weightKg), 0)
}

const MUSCLE_COLORS = {
  'Peito': '#3b82f6',
  'Costas': '#06b6d4',
  'Latíssimo': '#06b6d4',
  'Ombros': '#a855f7',
  'Trapézio': '#8b5cf6',
  'Rombóide': '#0ea5e9',
  'Bíceps': '#f59e0b',
  'Tríceps': '#f97316',
  'Antebraço': '#fb923c',
  'Abdômen': '#10b981',
  'Oblíquos': '#34d399',
  'Lombar': '#6ee7b7',
  'Quadríceps': '#22c55e',
  'Isquiotibiais': '#16a34a',
  'Glúteos': '#15803d',
  'Panturrilha': '#4ade80',
  'Adutores': '#86efac',
  'Abdutores': '#bbf7d0',
  'Cardio': '#ef4444',
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

// ── Rest Timer Hook ───────────────────────────────────────────
function useRestTimer() {
  const [restSecs, setRestSecs] = useState(0)
  const [restRunning, setRestRunning] = useState(false)
  const ref = useRef(null)

  const start = useCallback((duration = 90) => {
    setRestSecs(duration)
    setRestRunning(true)
  }, [])

  const stop = useCallback(() => {
    setRestRunning(false)
    setRestSecs(0)
    clearInterval(ref.current)
  }, [])

  useEffect(() => {
    if (restRunning && restSecs > 0) {
      ref.current = setInterval(() => {
        setRestSecs(s => {
          if (s <= 1) { clearInterval(ref.current); setRestRunning(false); return 0 }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(ref.current)
  }, [restRunning])

  return { restSecs, restRunning, start, stop }
}

// ── Rest Timer Bar ────────────────────────────────────────────
const REST_PRESETS = [60, 90, 120]

function RestTimerBar({ restSecs, restRunning, onStop, onPreset }) {
  if (!restRunning && restSecs === 0) return null
  const pct = Math.round((restSecs / 120) * 100)
  return (
    <div className="rest-timer-bar">
      <div className="rest-timer-progress" style={{ width: `${Math.min(pct, 100)}%` }} />
      <div className="rest-timer-content">
        <span className="rest-timer-label">Descanso</span>
        <span className="rest-timer-count">{restSecs}s</span>
        <div className="rest-timer-presets">
          {REST_PRESETS.map(p => (
            <button key={p} className="rest-preset-btn" onClick={() => onPreset(p)}>{p}s</button>
          ))}
        </div>
        <button className="rest-skip-btn" onClick={onStop}>Pular</button>
      </div>
    </div>
  )
}

// ── Stepper ───────────────────────────────────────────────────
function Stepper({ value, onChange, step = 1, min = 0, decimals = 0 }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  if (editing) {
    return (
      <div className="training-stepper">
        <button className="stepper-btn" onClick={() => { onChange(Math.max(min, +(value - step).toFixed(decimals + 1))); setEditing(false) }}>−</button>
        <input
          className="stepper-input"
          type="number"
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={() => { const v = parseFloat(raw); if (!isNaN(v)) onChange(Math.max(min, +v.toFixed(decimals))); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { const v = parseFloat(raw); if (!isNaN(v)) onChange(Math.max(min, +v.toFixed(decimals))); setEditing(false) } }}
          autoFocus
        />
        <button className="stepper-btn" onClick={() => { onChange(+(value + step).toFixed(decimals + 1)); setEditing(false) }}>+</button>
      </div>
    )
  }
  return (
    <div className="training-stepper">
      <button className="stepper-btn" onClick={() => onChange(Math.max(min, +(value - step).toFixed(decimals + 1)))}>−</button>
      <span className="stepper-val" onClick={() => { setRaw(String(Number(value).toFixed(decimals))); setEditing(true) }} title="Clique para digitar">
        {Number(value).toFixed(decimals)}
      </span>
      <button className="stepper-btn" onClick={() => onChange(+(value + step).toFixed(decimals + 1))}>+</button>
    </div>
  )
}

// ── SetRow ────────────────────────────────────────────────────
// ── SetRow ────────────────────────────────────────────────────
function SetRow({ set, onUpdate, onDelete, plannedReps, prevSet, onCompleted, isPR, weightSuggestions = [] }) {
  const [justChecked, setJustChecked] = useState(false)
  return (
    <div className={`training-set-row${set.completed ? ' set-done' : ''}${justChecked ? ' set-just-checked' : ''}`}>
      <span className="set-num">{set.setNumber}ª SÉRIE</span>
      <div className="set-row-main-col">
        <div className="set-row-fields">
          <div className="set-field-wrap">
            {plannedReps && !set.completed && (
              <span className="set-ghost-hint">Meta: {plannedReps}</span>
            )}
            <div className="set-field-compact">
              <Stepper value={set.reps} onChange={v => onUpdate({ reps: v })} step={1} min={1} />
              <span className="set-unit-label">reps</span>
            </div>
          </div>
          <span className="set-sep">×</span>
          <div className="set-field-wrap">
            <div className="set-field-compact">
              <Stepper value={set.weightKg} onChange={v => onUpdate({ weightKg: v })} step={2.5} min={0} decimals={1} />
              <span className="set-unit-label">kg</span>
            </div>
          </div>
        </div>
        {weightSuggestions.length > 0 && !set.completed && (
          <div className="weight-chips">
            {weightSuggestions.map((w, i) => (
              <button key={i} className="weight-chip" onClick={() => onUpdate({ weightKg: w })}>
                {Number(w).toFixed(1)}
              </button>
            ))}
          </div>
        )}
      </div>
      {prevSet && !set.completed && (
        <div className="set-prev-panel">
          <span className="set-prev-panel-icon">↺</span>
          <div className="set-prev-panel-data">
            <span className="set-prev-panel-label">Anterior</span>
            <span className="set-prev-panel-values">{prevSet.reps} reps • {Number(prevSet.weightKg).toFixed(1)} kg</span>
          </div>
        </div>
      )}
      <div className="set-meta-col">
        {isPR && set.weightKg > 0 && (
          <span className="set-pr-badge" title="Personal Record!">🏆 PR</span>
        )}
        {set.completed && set.weightKg > 0 && set.reps > 1 && (
          <span className="set-1rm" title="1RM estimado (Epley)">
            ~{Math.round(set.weightKg * (1 + set.reps / 30))}kg
          </span>
        )}
      </div>
      <button
        className={`set-check-btn${set.completed ? ' checked' : ''}`}
        onClick={() => {
          const newCompleted = !set.completed
          onUpdate({ completed: newCompleted })
          if (newCompleted) {
            setJustChecked(true)
            setTimeout(() => setJustChecked(false), 400)
            if (onCompleted) onCompleted()
          }
        }}
      >
        {set.completed ? <Check size={14} /> : null}
      </button>
    </div>
  )
}

// ── ExerciseCard (during session) ─────────────────────────────
function ExerciseCard({ exercise, sets = [], onAddSet, onUpdateSet, onDeleteSet, history, restTimer, note = '', onNoteChange, isFirst = false }) {
  const [expanded, setExpanded] = useState(isFirst)
  const [showNote, setShowNote] = useState(false)
  const lastSet   = history[0]?.sets?.slice(-1)[0]
  const lastWeight = lastSet?.weightKg ?? 0
  const lastReps   = lastSet?.reps ?? parseDefaultReps(exercise.sets?.[0]?.reps ?? '12')
  const totalSets  = sets.length
  const doneSets   = sets.filter(s => s.completed).length
  const allDone = doneSets === totalSets && totalSets > 0
  // Auto-collapse when all sets are done
  const prevDoneRef = useRef(false)
  useEffect(() => {
    if (allDone && !prevDoneRef.current) {
      const t = setTimeout(() => setExpanded(false), 600)
      prevDoneRef.current = true
      return () => clearTimeout(t)
    }
    if (!allDone) prevDoneRef.current = false
  }, [allDone])

  // Best historical weight for PR detection
  const bestHistWeight = history.reduce((best, session) => {
    const maxW = (session.sets || []).reduce((m, s) => Math.max(m, s.weightKg || 0), 0)
    return Math.max(best, maxW)
  }, 0)

  const weightSuggestions = [...new Set(
    history.flatMap(h => (h.sets || []).map(s => s.weightKg))
      .filter(w => w > 0)
  )].slice(0, 3)

  const muscleColor = exercise.muscleGroup ? (MUSCLE_COLORS[exercise.muscleGroup] || 'var(--accent)') : null

  return (
    <div
      className={`training-exercise-card${allDone ? ' ex-card-done' : ''}`}
      style={muscleColor ? { borderLeft: `3px solid ${muscleColor}` } : undefined}
    >
      <div className="ex-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="ex-card-left-col" />
        <div className="ex-card-info">
          <span className="ex-card-name">{exercise.name}</span>
          {exercise.muscleGroup && <span className="muscle-badge">{exercise.muscleGroup}</span>}
        </div>
        <div className="ex-card-meta">
          <span className={`ex-sets-count${allDone ? ' ex-sets-done' : ''}`}>
            {allDone ? <Check size={12} /> : `${doneSets}/${totalSets}`}
          </span>
          {!allDone && (
            <button
              className="ex-header-add-btn"
              title="Série extra"
              onClick={e => { e.stopPropagation(); onAddSet(exercise.id, lastReps, lastWeight) }}
            >
              <Plus size={11} />
            </button>
          )}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      <div className={`ex-card-body-wrap${expanded ? ' ex-card-body-open' : ''}`}>
        <div className="ex-card-body">
          {sets.map((set, idx) => (
            <SetRow
              key={set.id}
              set={set}
              plannedReps={exercise.sets?.[idx]?.reps}
              prevSet={history[0]?.sets?.[idx]}
              onUpdate={patch => onUpdateSet(exercise.id, set.id, patch)}
              onDelete={() => onDeleteSet(exercise.id, set.id)}
              onCompleted={() => restTimer?.start(90)}
              isPR={set.completed && set.weightKg > 0 && set.weightKg > bestHistWeight}
              weightSuggestions={weightSuggestions}
            />
          ))}
          <div className="ex-note-row">
            <button className="ex-note-toggle" onClick={() => setShowNote(v => !v)}>
              {showNote ? '— Ocultar nota' : `+ Nota${note ? ' ✏️' : ''}`}
            </button>
            {showNote && (
              <textarea
                className="ex-note-textarea"
                placeholder="Observação para este exercício..."
                value={note}
                onChange={e => onNoteChange && onNoteChange(e.target.value)}
                rows={2}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SingleDayPicker ───────────────────────────────────────────
function SingleDayPicker({ value, onChange, days, usedDays = [] }) {
  return (
    <div className="day-selector">
      {days.map((day, idx) => {
        const taken = usedDays.includes(idx) && value !== idx
        return (
          <button
            key={day}
            className={`day-btn${value === idx ? ' day-active' : ''}${taken ? ' day-taken' : ''}`}
            onClick={() => onChange(idx)}
            title={taken ? 'Dia já em uso' : day}
          >
            {day}
          </button>
        )
      })}
    </div>
  )
}

// ── CustomSelect ──────────────────────────────────────────────
function CustomSelect({ value, onChange, options, placeholder = 'Selecionar', className = '' }) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const ref = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUp(spaceBelow < 260)
    }
    setOpen(v => !v)
  }

  return (
    <div className={`cs-wrap${className ? ' ' + className : ''}`} ref={ref}>
      <button type="button" className="add-select-btn" onClick={handleToggle}>
        <span className={value ? '' : 'cs-placeholder'}>{value || placeholder}</span>
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div className={`sf-dropdown${openUp ? ' sf-dropdown-up' : ''}`} ref={dropdownRef}>
          {options.map(opt => (
            <button key={opt} type="button"
              className={`sf-item${value === opt ? ' sf-item-active' : ''}`}
              onClick={() => { onChange(opt); setOpen(false) }}
            >
              {opt}
              {value === opt && <Check size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── AddExerciseForm ───────────────────────────────────────────
function AddExerciseForm({ onAdd, muscleGroups, equipment, draftKey }) {
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equip, setEquip] = useState('')
  const [variations, setVariations] = useState([{ count: 3, reps: '12' }])
  const [open, setOpen] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  // Auto-save draft while form is open
  useEffect(() => {
    if (!open || !draftKey) return
    localStorage.setItem(DRAFT_KEY(draftKey), JSON.stringify({ name, muscle, equip, variations }))
  }, [open, name, muscle, equip, variations, draftKey])

  const clearDraft = () => { if (draftKey) localStorage.removeItem(DRAFT_KEY(draftKey)) }

  const handleOpen = () => {
    if (draftKey) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY(draftKey))
        if (raw) {
          const d = JSON.parse(raw)
          if (d.name || d.muscle || d.equip || d.variations?.length) {
            setName(d.name || '')
            setMuscle(d.muscle || '')
            setEquip(d.equip || '')
            setVariations(d.variations?.length ? d.variations : [{ count: 3, reps: '12' }])
            setDraftRestored(true)
          }
        }
      } catch {
        // ignore malformed draft
      }
    }
    setOpen(true)
  }

  if (!open) {
    const hasDraft = draftKey && !!localStorage.getItem(DRAFT_KEY(draftKey))
    return (
      <button className={`training-add-set-btn routine-add-ex-btn${hasDraft ? ' has-draft' : ''}`} onClick={handleOpen}>
        <Plus size={14} /> Adicionar exercício{hasDraft ? ' 📋' : ''}
      </button>
    )
  }

  const updateVariation = (idx, field, val) =>
    setVariations(vs => vs.map((v, i) => i === idx ? { ...v, [field]: val } : v))
  const removeVariation = (idx) => setVariations(vs => vs.filter((_, i) => i !== idx))
  const addVariation = () => setVariations(vs => [...vs, { count: 1, reps: '12' }])

  return (
    <div className="add-exercise-form add-exercise-form-centered">
      {draftRestored && (
        <div className="draft-banner">
          <span>📋 Rascunho recuperado</span>
          <button className="set-del-btn" onClick={() => { clearDraft(); setName(''); setMuscle(''); setEquip(''); setVariations([{ count: 3, reps: '12' }]); setDraftRestored(false) }}><X size={10} /></button>
        </div>
      )}
      <input
        className="training-input"
        placeholder="Nome do exercício"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />
      <CustomSelect value={muscle} onChange={setMuscle} options={muscleGroups} placeholder="Grupo muscular" />
      <CustomSelect value={equip} onChange={setEquip} options={equipment} placeholder="Equipamento" />
      <div className="ex-sets-editor">
        <span className="add-ex-field-label" style={{ display: 'block', textAlign: 'center', marginBottom: '6px' }}>Séries e repetições</span>
        {variations.map((v, idx) => (
          <div key={idx} className="ex-variation-row">
            <input
              type="number"
              className="training-input ex-count-input"
              min={1} max={20}
              value={v.count}
              onChange={e => updateVariation(idx, 'count', +e.target.value || 1)}
            />
            <span className="ex-set-sep">×</span>
            <input
              type="text"
              className="training-input ex-set-reps-input"
              placeholder="12"
              value={v.reps}
              onChange={e => updateVariation(idx, 'reps', e.target.value)}
            />
            <span className="ex-set-unit">reps</span>
            {variations.length > 1 && (
              <button className="set-del-btn" onClick={() => removeVariation(idx)}><X size={10} /></button>
            )}
          </div>
        ))}
        <button className="ex-add-set-row-btn" onClick={addVariation}>
          <Plus size={12} /> Adicionar variação
        </button>
      </div>
      <div className="add-ex-actions centered-actions">
        <button className="training-add-set-btn" onClick={() => {
          if (!name.trim()) return
          clearDraft()
          onAdd(name.trim(), muscle, equip, variationsToSets(variations))
          setName(''); setMuscle(''); setEquip('')
          setVariations([{ count: 3, reps: '12' }])
          setDraftRestored(false)
          setOpen(false)
        }}>
          Salvar
        </button>
        <button className="set-del-btn" onClick={() => { clearDraft(); setDraftRestored(false); setOpen(false) }}><X size={14} /></button>
      </div>
    </div>
  )
}

// ── AddTrainingDayForm ────────────────────────────────────────
function AddTrainingDayForm({ onAdd, onCancel, DAYS, usedDays = [] }) {
  const getNextDay = () => {
    for (let i = 1; i <= 6; i++) { if (!usedDays.includes(i)) return i }
    return 0
  }
  const [label, setLabel] = useState('')
  const [weekDay, setWeekDay] = useState(getNextDay)

  return (
    <div className="add-training-day-form">
      <input
        className="training-input"
        placeholder="Nome do dia (ex: Peito + Tríceps)"
        value={label}
        onChange={e => setLabel(e.target.value)}
        autoFocus
      />
      <SingleDayPicker value={weekDay} onChange={setWeekDay} days={DAYS} usedDays={usedDays} />
      <div className="add-ex-actions">
        <button
          className="training-add-set-btn"
          disabled={!label.trim()}
          onClick={() => { if (label.trim()) onAdd(label.trim(), weekDay) }}
        >
          Salvar
        </button>
        <button className="set-del-btn" onClick={onCancel}><X size={14} /></button>
      </div>
    </div>
  )
}

// ── ExerciseRowInRoutine ──────────────────────────────────────
function ExerciseRowInRoutine({ exercise, onDelete, onUpdate, muscleGroups, equipment }) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMuscle, setEditMuscle] = useState('')
  const [editEquip, setEditEquip] = useState('')
  const [editVariations, setEditVariations] = useState([{ count: 3, reps: '12' }])

  const startEdit = () => {
    setEditName(exercise.name)
    setEditMuscle(exercise.muscleGroup || '')
    setEditEquip(exercise.equipment || '')
    setEditVariations(setsToVariations(exercise.sets))
    setEditing(true)
  }

  const saveEdit = () => {
    if (!editName.trim()) return
    onUpdate({
      name: editName.trim(),
      muscleGroup: editMuscle,
      equipment: editEquip,
      sets: variationsToSets(editVariations),
    })
    setEditing(false)
  }

  const updateVariation = (idx, field, val) =>
    setEditVariations(vs => vs.map((v, i) => i === idx ? { ...v, [field]: val } : v))
  const removeVariation = (idx) => setEditVariations(vs => vs.filter((_, i) => i !== idx))

  if (editing) {
    return (
      <div className="routine-exercise-edit-form">
        <input className="training-input" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
        <div className="ex-edit-selects">
          <CustomSelect value={editMuscle} onChange={setEditMuscle} options={muscleGroups} placeholder="Músculo" />
          <CustomSelect value={editEquip} onChange={setEditEquip} options={equipment} placeholder="Equipamento" />
        </div>
        <div className="ex-sets-editor">
          <span className="add-ex-field-label">Séries e repetições</span>
          {editVariations.map((v, idx) => (
            <div key={idx} className="ex-variation-row">
              <input
                type="number"
                className="training-input ex-count-input"
                min={1} max={20}
                value={v.count}
                onChange={e => updateVariation(idx, 'count', +e.target.value || 1)}
              />
              <span className="ex-set-sep">×</span>
              <input
                type="text"
                className="training-input ex-set-reps-input"
                placeholder="12"
                value={v.reps}
                onChange={e => updateVariation(idx, 'reps', e.target.value)}
              />
              <span className="ex-set-unit">reps</span>
              {editVariations.length > 1 && (
                <button className="set-del-btn" onClick={() => removeVariation(idx)}><X size={10} /></button>
              )}
            </div>
          ))}
          <button className="ex-add-set-row-btn" onClick={() => setEditVariations(vs => [...vs, { count: 1, reps: '12' }])}>
            <Plus size={12} /> Adicionar variação
          </button>
        </div>
        <div className="add-ex-actions" style={{ justifyContent: 'center' }}>
          <button className="training-add-set-btn" onClick={saveEdit}>Salvar</button>
          <button className="set-del-btn" onClick={() => setEditing(false)}><X size={14} /></button>
        </div>
      </div>
    )
  }

  const displayVariations = setsToVariations(Array.isArray(exercise.sets) ? exercise.sets : [])

  return (
    <div className="routine-exercise-row">
      <div className="routine-ex-info">
        <span className="routine-ex-name">{exercise.name}</span>
        <div className="routine-ex-tags">
          {exercise.muscleGroup && <span className="muscle-badge">{exercise.muscleGroup}</span>}
          {exercise.equipment && <span className="equip-badge">{exercise.equipment}</span>}
        </div>
      </div>
      <div className="routine-ex-sets-display">
        {displayVariations.map((v, i) => (
          <span key={i} className="routine-ex-set-chip">{v.count}×{v.reps}</span>
        ))}
      </div>
      <div className="routine-ex-actions">
        <button className="routine-edit-btn" onClick={startEdit}><Edit2 size={12} /></button>
        <button className="set-del-btn" onClick={onDelete}><Trash2 size={12} /></button>
      </div>
    </div>
  )
}

// ── TrainingDayCard ───────────────────────────────────────────
const CARDIO_TYPES = ['Bike', 'Caminhada', 'Corrida', 'Esteira', 'Natação', 'Surf']

function TrainingDayCard({ day, onUpdate, onDelete, onAddExercise, onDeleteExercise, onUpdateExercise, onAddPlannedCardio, onUpdatePlannedCardio, onDeletePlannedCardio, MUSCLE_GROUPS, EQUIPMENT, DAYS }) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const [editLabel, setEditLabel] = useState('')
  const [editWeekDay, setEditWeekDay] = useState(day.weekDay ?? 1)
  const [showCardioForm, setShowCardioForm] = useState(false)
  const [editingCardioId, setEditingCardioId] = useState(null)
  const [cardioType, setCardioType] = useState('Corrida')
  const [cardioHrs, setCardioHrs] = useState(0)
  const [cardioDur, setCardioDur] = useState(30)
  const [cardioSpeed, setCardioSpeed] = useState(0)
  const [cardioDist, setCardioDist] = useState(0)

  const resetCardioForm = () => {
    setCardioType('Corrida'); setCardioHrs(0); setCardioDur(30)
    setCardioSpeed(0); setCardioDist(0); setEditingCardioId(null)
  }

  const openEditCardio = (c) => {
    setCardioType(c.type); setCardioHrs(c.durationHrs ?? 0); setCardioDur(c.durationMin ?? 30)
    setCardioSpeed(c.speedKmh ?? 0); setCardioDist(c.distanceKm ?? 0)
    setEditingCardioId(c.id); setShowCardioForm(true)
  }

  // Triangular calculation: T (hrs) ↔ V (km/h) ↔ D (km)
  const handleHrsChange = (v) => {
    setCardioHrs(v)
    const t = v + cardioDur / 60
    if (t > 0 && cardioSpeed > 0) setCardioDist(+(t * cardioSpeed).toFixed(2))
    else if (t > 0 && cardioDist > 0 && cardioSpeed === 0) setCardioSpeed(+(cardioDist / t).toFixed(1))
  }
  const handleMinChange = (v) => {
    setCardioDur(v)
    const t = cardioHrs + v / 60
    if (t > 0 && cardioSpeed > 0) setCardioDist(+(t * cardioSpeed).toFixed(2))
    else if (t > 0 && cardioDist > 0 && cardioSpeed === 0) setCardioSpeed(+(cardioDist / t).toFixed(1))
  }
  const handleSpeedChange = (v) => {
    setCardioSpeed(v)
    const t = cardioHrs + cardioDur / 60
    if (t > 0 && v > 0) setCardioDist(+(t * v).toFixed(2))
    else if (v > 0 && cardioDist > 0) {
      const newT = cardioDist / v
      setCardioHrs(Math.floor(newT)); setCardioDur(Math.round((newT % 1) * 60))
    }
  }
  const handleDistChange = (v) => {
    setCardioDist(v)
    const t = cardioHrs + cardioDur / 60
    if (v > 0 && t > 0) setCardioSpeed(+(v / t).toFixed(1))
    else if (v > 0 && cardioSpeed > 0) {
      const newT = v / cardioSpeed
      setCardioHrs(Math.floor(newT)); setCardioDur(Math.round((newT % 1) * 60))
    }
  }

  const saveCardio = () => {
    const payload = { type: cardioType, durationHrs: cardioHrs, durationMin: cardioDur, speedKmh: cardioSpeed, distanceKm: cardioDist }
    if (editingCardioId) onUpdatePlannedCardio(editingCardioId, payload)
    else onAddPlannedCardio(payload)
    setShowCardioForm(false); resetCardioForm()
  }

  const startEdit = () => {
    setEditLabel(day.label)
    setEditWeekDay(day.weekDay ?? 1)
    setEditingLabel(true)
  }

  const saveEdit = () => {
    onUpdate({ label: editLabel.trim(), weekDay: editWeekDay })
    setEditingLabel(false)
  }

  return (
    <div className="training-day-card">
      <div className="training-day-header">
        {editingLabel ? (
          <div className="training-day-edit-form">
            <input
              className="training-input"
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
              autoFocus
            />
            <SingleDayPicker value={editWeekDay} onChange={setEditWeekDay} days={DAYS} />
            <div className="add-ex-actions">
              <button className="training-add-set-btn" onClick={saveEdit}>OK</button>
              <button className="set-del-btn" onClick={() => setEditingLabel(false)}><X size={14} /></button>
            </div>
          </div>
        ) : (
          <div className="training-day-title-row">
            <div className="training-day-actions">
              <button className="routine-edit-btn" onClick={startEdit}>
                <Edit2 size={12} />
              </button>
              <button className="routine-edit-btn" onClick={() => setCollapsed(v => !v)}>
                {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </button>
              <button className="set-del-btn" onClick={onDelete}>
                <Trash2 size={12} />
              </button>
            </div>
            <span className="training-day-label">{day.label}</span>
            {day.weekDay !== undefined && (
              <span className="day-badge-week">{DAYS[day.weekDay]}</span>
            )}
          </div>
        )}
      </div>
      <div className={`training-day-exercises${collapsed ? ' day-exercises-hidden' : ''}`}>
        {(day.exercises || []).sort((a, b) => a.order - b.order).map(ex => (
          <ExerciseRowInRoutine
            key={ex.id}
            exercise={ex}
            onDelete={() => onDeleteExercise(ex.id)}
            onUpdate={patch => onUpdateExercise(ex.id, patch)}
            muscleGroups={MUSCLE_GROUPS}
            equipment={EQUIPMENT}
          />
        ))}
      </div>
      <div className="training-day-footer">
        <AddExerciseForm
          onAdd={(name, muscle, equip, sets) => onAddExercise(name, muscle, equip, sets)}
          muscleGroups={MUSCLE_GROUPS}
          equipment={EQUIPMENT}
          draftKey={day.id}
        />
        {/* Planned Cardio */}
        <div className="training-day-cardio">
          <div className="day-cardio-header">
            <Flame size={13} />
            <span>Cardio planejado</span>
            <button className="routine-edit-btn" onClick={() => setShowCardioForm(v => !v)}>
              <Plus size={12} />
            </button>
          </div>
          {(day.plannedCardio || []).map(c => {
            const details = [
              c.durationHrs > 0 ? `${c.durationHrs}h` : null,
              c.durationMin > 0 ? `${c.durationMin} min` : null,
              c.speedKmh > 0 ? `${c.speedKmh} km/h` : null,
              c.distanceKm > 0 ? `${Number(c.distanceKm).toFixed(1)} km` : null,
            ].filter(Boolean).join(' • ')
            return (
              <div key={c.id} className="planned-cardio-row">
                <span className="planned-cardio-type">{c.type}</span>
                {details && <span className="planned-cardio-details">{details}</span>}
                <button className="routine-edit-btn" title="Editar" onClick={() => openEditCardio(c)}><Edit2 size={10} /></button>
                <button className="set-del-btn" onClick={() => onDeletePlannedCardio(c.id)}><X size={10} /></button>
              </div>
            )
          })}
          {showCardioForm && (
            <div className="cardio-add-form planned-cardio-form">
              <CustomSelect value={cardioType} onChange={setCardioType} options={CARDIO_TYPES} placeholder="Tipo" className="cardio-type-select" />
              <div className="cardio-form-row">
                <div className="cardio-field">
                  <label className="add-ex-field-label">Horas</label>
                  <div className="cardio-input-unit">
                    <input type="number" className="training-input ex-count-input" min={0} step={1} value={cardioHrs || ''} onChange={e => handleHrsChange(+e.target.value || 0)} />
                    <span className="cardio-unit-badge">h</span>
                  </div>
                </div>
                <div className="cardio-field">
                  <label className="add-ex-field-label">Min</label>
                  <div className="cardio-input-unit">
                    <input type="number" className="training-input ex-count-input" min={0} step={5} value={cardioDur || ''} onChange={e => handleMinChange(+e.target.value || 0)} />
                    <span className="cardio-unit-badge">min</span>
                  </div>
                </div>
                <div className="cardio-field">
                  <label className="add-ex-field-label">km/h</label>
                  <div className="cardio-input-unit">
                    <input type="number" className="training-input ex-count-input" min={0} step={0.5} value={cardioSpeed || ''} onChange={e => handleSpeedChange(+e.target.value || 0)} />
                    <span className="cardio-unit-badge">km/h</span>
                  </div>
                </div>
                <div className="cardio-field">
                  <label className="add-ex-field-label">km</label>
                  <div className="cardio-input-unit">
                    <input type="number" className="training-input ex-count-input" min={0} step={0.1} value={cardioDist || ''} onChange={e => handleDistChange(+e.target.value || 0)} />
                    <span className="cardio-unit-badge">km</span>
                  </div>
                </div>
              </div>
              <div className="add-ex-actions">
                <button className="training-add-set-btn" onClick={saveCardio}>
                  {editingCardioId ? 'Atualizar' : 'Salvar'}
                </button>
                <button className="set-del-btn" onClick={() => { setShowCardioForm(false); resetCardioForm() }}><X size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── RoutineCard ───────────────────────────────────────────────
function RoutineCard({
  routine, expanded, onToggle, onSetActive, isActive,
  onUpdate, onDelete,
  onAddDay, onUpdateDay, onDeleteDay,
  onAddExercise, onDeleteExercise, onUpdateExercise,
  onAddPlannedCardio, onUpdatePlannedCardio, onDeletePlannedCardio,
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
            <div className="routine-card-title-centered">
              <span className="routine-card-name">{routine.name}</span>
              {isActive && <span className="routine-active-badge">ativa</span>}
            </div>
            <div className="routine-card-actions routine-card-actions-abs" onClick={e => e.stopPropagation()}>
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

      <div className={`routine-card-body-wrap${expanded ? ' routine-body-open' : ''}`}>
        <div className="routine-card-body">
          {trainingDays.length === 0 && (
            <p className="routine-empty-hint">Nenhum dia de treino. Adicione abaixo.</p>
          )}
          <div className="training-days-grid" data-count={trainingDays.length}>
            {trainingDays.map(day => (
              <TrainingDayCard
                key={day.id}
                day={day}
                onUpdate={patch => onUpdateDay(day.id, patch)}
                onDelete={() => { if (confirm(`Excluir dia "${day.label}"?`)) onDeleteDay(day.id) }}
                onAddExercise={(name, muscle, equip, sets) => onAddExercise(day.id, name, muscle, equip, sets)}
                onDeleteExercise={(exId) => onDeleteExercise(day.id, exId)}
                onUpdateExercise={(exId, patch) => onUpdateExercise(day.id, exId, patch)}
                onAddPlannedCardio={(item) => onAddPlannedCardio(day.id, item)}
                onUpdatePlannedCardio={(cardioId, patch) => onUpdatePlannedCardio(day.id, cardioId, patch)}
                onDeletePlannedCardio={(cardioId) => onDeletePlannedCardio(day.id, cardioId)}
                MUSCLE_GROUPS={MUSCLE_GROUPS}
                EQUIPMENT={EQUIPMENT}
                DAYS={DAYS}
              />
            ))}
            {showAddDay ? (
              <div className="training-day-card add-day-form-card">
                <AddTrainingDayForm
                  onAdd={(label, weekDay) => { onAddDay(label, weekDay); setShowAddDay(false) }}
                  onCancel={() => setShowAddDay(false)}
                  DAYS={DAYS}
                  usedDays={trainingDays.map(d => d.weekDay).filter(d => d !== undefined)}
                />
              </div>
            ) : (
              <button className="add-day-ghost-card" onClick={() => setShowAddDay(true)}>
                <Plus size={22} />
                <span>Adicionar dia de treino</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RotinasScreen ─────────────────────────────────────────────
function RotinasScreen({ training }) {
  const {
    routines, activeRoutine, setActiveRoutineId,
    addRoutine, updateRoutine, deleteRoutine,
    addTrainingDay, updateTrainingDay, deleteTrainingDay,
    addExercise, updateExercise, deleteExercise,
    addPlannedCardio, updatePlannedCardio, deletePlannedCardio,
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
        <div className="add-routine-form add-routine-form-centered">
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
        <div className="new-routine-btn-wrap">
          <button className="new-routine-btn" onClick={() => setShowNewRoutine(true)}>
            <Plus size={16} /> Nova Rotina
          </button>
        </div>
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
          onAddDay={(label, weekDay) => addTrainingDay(routine.id, label, weekDay)}
          onUpdateDay={(dayId, patch) => updateTrainingDay(routine.id, dayId, patch)}
          onDeleteDay={(dayId) => deleteTrainingDay(routine.id, dayId)}
          onAddExercise={(dayId, name, muscle, equip, sets) => addExercise(routine.id, dayId, name, muscle, equip, sets)}
          onDeleteExercise={(dayId, exId) => deleteExercise(routine.id, dayId, exId)}
          onUpdateExercise={(dayId, exId, patch) => updateExercise(routine.id, dayId, exId, patch)}
          onAddPlannedCardio={(dayId, item) => addPlannedCardio(routine.id, dayId, item)}
          onUpdatePlannedCardio={(dayId, cardioId, patch) => updatePlannedCardio(routine.id, dayId, cardioId, patch)}
          onDeletePlannedCardio={(dayId, cardioId) => deletePlannedCardio(routine.id, dayId, cardioId)}
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
    updateCardio,
    exerciseHistory,
    updateSession,
    sessions,
  } = training

  const startScreenStreak = calcStreak(sessions || [])

  const [manualDay, setManualDay] = useState(null)
  const session = todaySession
  const elapsed = useTimer(!!session && !session?.completed)
  const restTimer = useRestTimer()
  const [showSummary, setShowSummary] = useState(false)
  const [summarySession, setSummarySession] = useState(null)
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

    // Pesos do último treino deste dia
    const lastDaySession = sessions
      .filter(s => s.completed && s.trainingDayId === activeDay.id)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0]
    const lastWeights = lastDaySession
      ? Object.fromEntries(Object.entries(lastDaySession.sets).map(([exId, sets]) => [exId, sets.map(s => s.weightKg)]))
      : {}
    const hasLastWeights = lastDaySession && Object.values(lastWeights).some(ws => ws.some(w => w > 0))

    return (
      <div className="training-start-screen">
        {startScreenStreak > 1 && (
          <div className="start-streak-pill">🔥 {startScreenStreak} dias seguidos</div>
        )}
        <div className="training-start-info">
          <Dumbbell size={32} strokeWidth={1.2} />
          <h3>{activeRoutine.name}</h3>
          <p className="training-day-subtitle">{activeDay.label}</p>
          <p>{activeDay.exercises.length} exercício{activeDay.exercises.length !== 1 ? 's' : ''} · {activeDay.exercises.reduce((a, e) => a + (e.sets?.length || 0), 0)} séries planejadas</p>
        </div>
        <button className="session-start-btn" onClick={() => startSession(activeRoutine.id, activeDay.id, activeDay.exercises || [], activeDay.plannedCardio || [])}>
          <Play size={18} /> Iniciar {activeDay.label}
        </button>
        {hasLastWeights && (
          <button className="session-repeat-btn" onClick={() => startSession(activeRoutine.id, activeDay.id, activeDay.exercises || [], activeDay.plannedCardio || [], lastWeights)}>
            🔄 Repetir pesos anteriores
          </button>
        )}
      </div>
    )
  }

  const sessionExercises = activeDay?.exercises || []
  const completedSets = Object.values(session.sets).flat().filter(s => s.completed).length
  const totalSets     = Object.values(session.sets).flat().length
  const liveVolume = Object.values(session.sets).flat()
    .filter(s => s.completed && s.weightKg > 0)
    .reduce((a, s) => a + (s.reps || 0) * (s.weightKg || 0), 0)

  return (
    <div className="training-registrar">
      <div className="registrar-inner">
      {/* Timer Hero */}
      <div className="session-timer-hero">
        <button
          className="session-abort-icon"
          title="Cancelar treino"
          onClick={() => { if (confirm('Cancelar treino?')) deleteSession(session.id) }}
        >
          <X size={14} />
        </button>
        <div className="timer-hero-clock">
          <span className="timer-hero-time">{formatDuration(elapsed)}</span>
        </div>
        <div className="timer-hero-info">
          {activeDay && <span className="timer-hero-day">{activeDay.label}</span>}
          <span className="timer-hero-sets">{completedSets}/{totalSets} séries concluídas</span>
          {liveVolume > 0 && (
            <span className="timer-hero-volume">{liveVolume.toFixed(0)} kg vol.</span>
          )}
        </div>
        {totalSets > 0 && (
          <div className="session-progress-track">
            <div
              className={`session-progress-fill${completedSets === totalSets ? ' progress-done' : ''}`}
              style={{ width: `${Math.round((completedSets / totalSets) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <RestTimerBar
        restSecs={restTimer.restSecs}
        restRunning={restTimer.restRunning}
        onStop={restTimer.stop}
        onPreset={restTimer.start}
      />

      {/* Exercises */}
      {sessionExercises.map((ex, idx) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          sets={session.sets[ex.id] || []}
          onAddSet={(exId, reps, weight) => addSet(session.id, exId, reps, weight)}
          onUpdateSet={(exId, setId, patch) => updateSet(session.id, exId, setId, patch)}
          onDeleteSet={(exId, setId) => deleteSet(session.id, exId, setId)}
          history={exerciseHistory(ex.id)}
          restTimer={restTimer}
          note={session.exerciseNotes?.[ex.id] || ''}
          onNoteChange={text => updateSession(session.id, { exerciseNotes: { ...(session.exerciseNotes || {}), [ex.id]: text } })}
          isFirst={idx === 0}
        />
      ))}

      {sessionExercises.length === 0 && (
        <div className="training-empty" style={{ padding: '20px 0' }}>
          <p>Este dia não tem exercícios cadastrados.</p>
        </div>
      )}

      {/* Cardio — only if day has planned cardio */}
      {(activeDay?.plannedCardio?.length > 0) && (
        <div className="training-cardio-section">
          <div className="cardio-section-header-centered">
            <Flame size={14} />
            <span>Cardio</span>
          </div>
          {session.cardio.map(c => {
            const h = c.durationHrs ?? 0
            const m = c.durationMin ?? 30
            const s = c.speedKmh ?? 0
            return (
              <div key={c.id} className="cardio-row cardio-row-centered">
                <span className="cardio-type">{c.type}</span>
                <div className="cardio-row-fields">
                  <Stepper value={h} onChange={v => updateCardio(session.id, c.id, { durationHrs: v, distanceKm: +((v + m / 60) * s).toFixed(2) })} step={1} min={0} />
                  <span className="cardio-unit">h</span>
                  <Stepper value={m} onChange={v => updateCardio(session.id, c.id, { durationMin: v, distanceKm: +((h + v / 60) * s).toFixed(2) })} step={5} min={0} />
                  <span className="cardio-unit">min</span>
                  <Stepper value={s} onChange={v => updateCardio(session.id, c.id, { speedKmh: v, distanceKm: +((h + m / 60) * v).toFixed(2) })} step={0.5} min={0} decimals={1} />
                  <span className="cardio-unit">km/h</span>
                  {c.distanceKm > 0 && <span className="cardio-dist-auto">{Number(c.distanceKm).toFixed(1)} km</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Notes */}
      <textarea
        className="session-notes"
        placeholder="Observações do treino..."
        value={session.notes || ''}
        onChange={e => updateSession(session.id, { notes: e.target.value })}
        rows={2}
      />

      {/* Finish */}
      <button className="session-finish-btn" onClick={() => {
        completeSession(session.id)
        setSummarySession({ ...session, finishedAt: new Date().toISOString() })
        setShowSummary(true)
      }}>
        <Check size={18} /> Finalizar treino
      </button>
      </div>{/* end registrar-inner */}
      {showSummary && summarySession && (
        <WorkoutSummary
          session={summarySession}
          routine={activeRoutine}
          trainingDay={activeDay}
          sessions={sessions}
          onClose={() => { setShowSummary(false); setSummarySession(null) }}
        />
      )}
    </div>
  )
}

// ── WorkoutSummary ────────────────────────────────────────────
function WorkoutSummary({ session, routine, trainingDay, onClose, sessions = [] }) {
  const start = new Date(session.startedAt)
  const end   = session.finishedAt ? new Date(session.finishedAt) : new Date()
  const durationSec = Math.round((end - start) / 1000)
  const allSets = Object.values(session.sets || {}).flat()
  const totalSets = allSets.length
  const volume = allSets.reduce((a, s) => a + (s.reps || 0) * (s.weightKg || 0), 0)
  const cardioMin = (session.cardio || []).reduce((a, c) => a + (c.durationMin || 0), 0)

  // Progressão: comparar com sessão anterior do mesmo dia
  const prevSession = sessions
    .filter(s => s.completed && s.id !== session.id && s.trainingDayId === session.trainingDayId)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0]
  const prevVolume = prevSession ? calcVolume(prevSession.sets) : 0
  const volumeDiff = volume - prevVolume
  let overloadHint = null
  if (prevSession && volume > 0) {
    if (volumeDiff > 50) overloadHint = { icon: '📈', msg: `+${volumeDiff.toFixed(0)}kg vs último treino — evolução real!`, color: '#22c55e' }
    else if (volumeDiff >= -50) overloadHint = { icon: '⚡', msg: 'Volume similar ao último treino. Que tal +2.5kg próxima vez?', color: '#f59e0b' }
    else overloadHint = { icon: '💤', msg: 'Volume menor hoje — recupere bem para o próximo!', color: '#60a5fa' }
  }

  return (
    <div className="workout-summary-overlay">
      <div className="workout-summary-card">
        <div className="summary-emoji">🏋️</div>
        <h2 className="summary-title">Treino Concluído!</h2>
        {trainingDay && <p className="summary-day">{trainingDay.label}</p>}
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-val">{formatDuration(durationSec)}</span>
            <span className="summary-stat-label">Duração</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-val">{totalSets}</span>
            <span className="summary-stat-label">Séries</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-val">{volume > 0 ? `${volume.toFixed(0)}kg` : '—'}</span>
            <span className="summary-stat-label">Volume</span>
          </div>
          {cardioMin > 0 && (
            <div className="summary-stat">
              <span className="summary-stat-val">{cardioMin}min</span>
              <span className="summary-stat-label">Cardio</span>
            </div>
          )}
        </div>
        {overloadHint && (
          <div className="summary-overload-hint" style={{ borderColor: overloadHint.color + '44', color: overloadHint.color }}>
            <span>{overloadHint.icon}</span>
            <span>{overloadHint.msg}</span>
          </div>
        )}
        <button className="summary-close-btn" onClick={onClose}>
          <Check size={18} /> Fechar
        </button>
      </div>
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

  const streak = calcStreak(sessions)

  return (
    <div className="training-historico">
      {streak > 0 && (
        <div className="streak-banner">
          <span className="streak-fire">🔥</span>
          <div className="streak-info">
            <span className="streak-count">{streak}</span>
            <span className="streak-label">dia{streak !== 1 ? 's' : ''} seguido{streak !== 1 ? 's' : ''}</span>
          </div>
          {streak >= 7 && <span className="streak-badge">Semana completa!</span>}
          {streak >= 30 && <span className="streak-badge streak-badge-gold">Mês épico! 🏆</span>}
        </div>
      )}
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
        <div className="training-nav-inner">
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
