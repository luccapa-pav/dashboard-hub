import { useState, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'lucc-training-data'
const ANON_USER_ID = 'local-user'

export const FEATURES = {
  useSupabase: !!import.meta.env.VITE_SUPABASE_URL,
  aiEnabled: !!import.meta.env.VITE_AI_ENABLED,
  photosEnabled: false,
}

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Latíssimo', 'Ombros', 'Trapézio', 'Rombóide',
  'Bíceps', 'Tríceps', 'Antebraço',
  'Abdômen', 'Oblíquos', 'Lombar',
  'Quadríceps', 'Isquiotibiais', 'Glúteos', 'Panturrilha', 'Adutores', 'Abdutores',
  'Cardio',
]

const EQUIPMENT = [
  'Barra', 'Halter', 'Máquina', 'Polia', 'Nenhum', 'Elástico', 'Kettlebell',
]

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const defaultData = () => ({
  routines: [],
  activeRoutineId: null,
  sessions: [],
  measurements: [],
  aiFeedbacks: [],
})

function loadData() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultData()
    // Migrate old format: exercises[] + days[] → trainingDays[]
    let migrated = false
    raw.routines = (raw.routines || []).map(r => {
      if (r.exercises !== undefined) {
        const migrated_r = {
          ...r,
          trainingDays: [{
            id: makeId(),
            label: 'Treino A',
            weekDays: r.days || [],
            exercises: r.exercises,
          }],
        }
        delete migrated_r.exercises
        delete migrated_r.days
        migrated = true
        return migrated_r
      }
      return r
    })
    // Migração: weekDays[] → weekDay; defaultSets/defaultReps → sets[]
    raw.routines = raw.routines.map(r => ({
      ...r,
      trainingDays: (r.trainingDays || []).map((d, i) => ({
        ...d,
        weekDay: d.weekDay !== undefined
          ? d.weekDay
          : (Array.isArray(d.weekDays) && d.weekDays.length > 0 ? d.weekDays[0] : ((i % 6) + 1)),
        plannedCardio: d.plannedCardio || [],
        exercises: (d.exercises || []).map(e => {
          if (e.sets) return e
          const n = e.defaultSets || 3
          const r = String(e.defaultReps !== undefined ? e.defaultReps : '12')
          return { ...e, sets: Array.from({ length: n }, () => ({ reps: r })) }
        }),
      })),
    }))
    if (migrated) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(raw)) } catch { /* quota exceeded */ }
    }
    return raw
  } catch {
    return defaultData()
  }
}

export function useTraining() {
  const [data, setData] = useState(loadData)

  const save = useCallback((updater) => {
    setData(cur => {
      const next = typeof updater === 'function' ? updater(cur) : updater
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* quota exceeded */ }
      return next
    })
  }, [])

  // ── Routines ──────────────────────────────────────────────────
  const addRoutine = useCallback((name) => {
    const routine = {
      id: makeId(),
      userId: ANON_USER_ID,
      name,
      trainingDays: [],
      createdAt: new Date().toISOString(),
    }
    save(cur => ({
      ...cur,
      routines: [...cur.routines, routine],
      activeRoutineId: cur.activeRoutineId || routine.id,
    }))
    return routine.id
  }, [save])

  const updateRoutine = useCallback((id, patch) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => r.id === id ? { ...r, ...patch } : r),
    }))
  }, [save])

  const deleteRoutine = useCallback((id) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.filter(r => r.id !== id),
      activeRoutineId: cur.activeRoutineId === id
        ? (cur.routines.find(r => r.id !== id)?.id || null)
        : cur.activeRoutineId,
    }))
  }, [save])

  const setActiveRoutineId = useCallback((id) => {
    save(cur => ({ ...cur, activeRoutineId: id }))
  }, [save])

  // ── Training Days ──────────────────────────────────────────────
  const addTrainingDay = useCallback((routineId, label, weekDay = 1) => {
    const day = { id: makeId(), label, weekDay, exercises: [] }
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return { ...r, trainingDays: [...(r.trainingDays || []), day] }
      }),
    }))
    return day.id
  }, [save])

  const updateTrainingDay = useCallback((routineId, dayId, patch) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return {
          ...r,
          trainingDays: (r.trainingDays || []).map(d => d.id === dayId ? { ...d, ...patch } : d),
        }
      }),
    }))
  }, [save])

  const deleteTrainingDay = useCallback((routineId, dayId) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return { ...r, trainingDays: (r.trainingDays || []).filter(d => d.id !== dayId) }
      }),
    }))
  }, [save])

  const addPlannedCardio = useCallback((routineId, dayId, item) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return {
          ...r,
          trainingDays: (r.trainingDays || []).map(d => {
            if (d.id !== dayId) return d
            const entry = { id: makeId(), ...item }
            return { ...d, plannedCardio: [...(d.plannedCardio || []), entry] }
          }),
        }
      }),
    }))
  }, [save])

  const deletePlannedCardio = useCallback((routineId, dayId, cardioId) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return {
          ...r,
          trainingDays: (r.trainingDays || []).map(d => {
            if (d.id !== dayId) return d
            return { ...d, plannedCardio: (d.plannedCardio || []).filter(c => c.id !== cardioId) }
          }),
        }
      }),
    }))
  }, [save])

  // ── Exercises ─────────────────────────────────────────────────
  const addExercise = useCallback((
    routineId, trainingDayId, name,
    muscleGroup = '', equipment = '',
    sets = [{ reps: '12' }, { reps: '12' }, { reps: '12' }],
  ) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return {
          ...r,
          trainingDays: (r.trainingDays || []).map(d => {
            if (d.id !== trainingDayId) return d
            const ex = {
              id: makeId(),
              name,
              muscleGroup,
              equipment,
              order: d.exercises.length,
              sets,
            }
            return { ...d, exercises: [...d.exercises, ex] }
          }),
        }
      }),
    }))
  }, [save])

  const updateExercise = useCallback((routineId, trainingDayId, exerciseId, patch) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return {
          ...r,
          trainingDays: (r.trainingDays || []).map(d => {
            if (d.id !== trainingDayId) return d
            return { ...d, exercises: d.exercises.map(e => e.id === exerciseId ? { ...e, ...patch } : e) }
          }),
        }
      }),
    }))
  }, [save])

  const deleteExercise = useCallback((routineId, trainingDayId, exerciseId) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return {
          ...r,
          trainingDays: (r.trainingDays || []).map(d => {
            if (d.id !== trainingDayId) return d
            return { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) }
          }),
        }
      }),
    }))
  }, [save])

  const reorderExercises = useCallback((routineId, trainingDayId, fromIdx, toIdx) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return {
          ...r,
          trainingDays: (r.trainingDays || []).map(d => {
            if (d.id !== trainingDayId) return d
            const exs = [...d.exercises]
            const [moved] = exs.splice(fromIdx, 1)
            exs.splice(toIdx, 0, moved)
            return { ...d, exercises: exs.map((e, i) => ({ ...e, order: i })) }
          }),
        }
      }),
    }))
  }, [save])

  // ── Sessions ──────────────────────────────────────────────────
  const startSession = useCallback((routineId, trainingDayId = null, exercises = []) => {
    const initialSets = {}
    exercises.forEach(ex => {
      if (Array.isArray(ex.sets) && ex.sets.length > 0) {
        initialSets[ex.id] = ex.sets.map((s, i) => {
          const repsNum = parseInt(String(s.reps), 10)
          return {
            id: makeId(),
            setNumber: i + 1,
            reps: isNaN(repsNum) ? 12 : repsNum,
            weightKg: 0,
            completed: false,
          }
        })
      }
    })
    const session = {
      id: makeId(),
      userId: ANON_USER_ID,
      routineId,
      trainingDayId,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      completed: false,
      sets: initialSets,
      cardio: [],
      notes: '',
    }
    save(cur => ({ ...cur, sessions: [...cur.sessions, session] }))
    return session.id
  }, [save])

  const completeSession = useCallback((sessionId) => {
    save(cur => ({
      ...cur,
      sessions: cur.sessions.map(s =>
        s.id === sessionId
          ? { ...s, finishedAt: new Date().toISOString(), completed: true }
          : s
      ),
    }))
  }, [save])

  const updateSession = useCallback((sessionId, patch) => {
    save(cur => ({
      ...cur,
      sessions: cur.sessions.map(s => s.id === sessionId ? { ...s, ...patch } : s),
    }))
  }, [save])

  const deleteSession = useCallback((sessionId) => {
    save(cur => ({ ...cur, sessions: cur.sessions.filter(s => s.id !== sessionId) }))
  }, [save])

  // ── Sets ──────────────────────────────────────────────────────
  const addSet = useCallback((sessionId, exerciseId, reps = 12, weightKg = 0) => {
    save(cur => ({
      ...cur,
      sessions: cur.sessions.map(s => {
        if (s.id !== sessionId) return s
        const prev = s.sets[exerciseId] || []
        const set = {
          id: makeId(),
          setNumber: prev.length + 1,
          reps,
          weightKg,
          completed: false,
        }
        return { ...s, sets: { ...s.sets, [exerciseId]: [...prev, set] } }
      }),
    }))
  }, [save])

  const updateSet = useCallback((sessionId, exerciseId, setId, patch) => {
    save(cur => ({
      ...cur,
      sessions: cur.sessions.map(s => {
        if (s.id !== sessionId) return s
        return {
          ...s,
          sets: {
            ...s.sets,
            [exerciseId]: (s.sets[exerciseId] || []).map(set =>
              set.id === setId ? { ...set, ...patch } : set
            ),
          },
        }
      }),
    }))
  }, [save])

  const deleteSet = useCallback((sessionId, exerciseId, setId) => {
    save(cur => ({
      ...cur,
      sessions: cur.sessions.map(s => {
        if (s.id !== sessionId) return s
        return {
          ...s,
          sets: {
            ...s.sets,
            [exerciseId]: (s.sets[exerciseId] || []).filter(set => set.id !== setId),
          },
        }
      }),
    }))
  }, [save])

  // ── Cardio ────────────────────────────────────────────────────
  const addCardio = useCallback((sessionId, type = 'Corrida', durationMin = 30, distanceKm = 0) => {
    save(cur => ({
      ...cur,
      sessions: cur.sessions.map(s => {
        if (s.id !== sessionId) return s
        return {
          ...s,
          cardio: [...s.cardio, { id: makeId(), type, durationMin, distanceKm }],
        }
      }),
    }))
  }, [save])

  const updateCardio = useCallback((sessionId, cardioId, patch) => {
    save(cur => ({
      ...cur,
      sessions: cur.sessions.map(s => {
        if (s.id !== sessionId) return s
        return {
          ...s,
          cardio: s.cardio.map(c => c.id === cardioId ? { ...c, ...patch } : c),
        }
      }),
    }))
  }, [save])

  const deleteCardio = useCallback((sessionId, cardioId) => {
    save(cur => ({
      ...cur,
      sessions: cur.sessions.map(s => {
        if (s.id !== sessionId) return s
        return { ...s, cardio: s.cardio.filter(c => c.id !== cardioId) }
      }),
    }))
  }, [save])

  // ── AI Feedback ───────────────────────────────────────────────
  const saveAIFeedback = useCallback((text, snapshot) => {
    const feedback = {
      id: makeId(),
      weekNumber: getISOWeek(new Date()),
      year: new Date().getFullYear(),
      text,
      snapshot,
      createdAt: new Date().toISOString(),
    }
    save(cur => ({ ...cur, aiFeedbacks: [feedback, ...cur.aiFeedbacks] }))
    return feedback.id
  }, [save])

  // ── Computed ──────────────────────────────────────────────────
  const routines = data.routines
  const activeRoutine = useMemo(
    () => data.routines.find(r => r.id === data.activeRoutineId) || data.routines[0] || null,
    [data.routines, data.activeRoutineId]
  )

  const todaySession = useMemo(() => {
    const today = new Date().toDateString()
    return data.sessions.find(s => !s.completed && new Date(s.startedAt).toDateString() === today) || null
  }, [data.sessions])

  const todayTrainingDay = useMemo(() => {
    const dayIdx = new Date().getDay() // 0=Dom ... 6=Sáb
    return activeRoutine?.trainingDays?.find(d => d.weekDay === dayIdx) || null
  }, [activeRoutine])

  const currentWeekSessions = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    return data.sessions.filter(s => new Date(s.startedAt) >= startOfWeek && s.completed)
  }, [data.sessions])

  const exerciseHistory = useCallback((exerciseId) => {
    const result = []
    for (const session of [...data.sessions].reverse()) {
      const sets = session.sets[exerciseId]
      if (sets && sets.length > 0) {
        result.push({ date: session.startedAt, sets })
        if (result.length >= 5) break
      }
    }
    return result
  }, [data.sessions])

  return {
    // Data
    routines,
    activeRoutine,
    setActiveRoutineId,
    sessions: data.sessions,
    aiFeedbacks: data.aiFeedbacks,
    // Routines
    addRoutine, updateRoutine, deleteRoutine,
    // Training Days
    addTrainingDay, updateTrainingDay, deleteTrainingDay,
    addPlannedCardio, deletePlannedCardio,
    // Exercises
    addExercise, updateExercise, deleteExercise, reorderExercises,
    // Sessions
    startSession, completeSession, updateSession, deleteSession,
    // Sets
    addSet, updateSet, deleteSet,
    // Cardio
    addCardio, updateCardio, deleteCardio,
    // AI
    saveAIFeedback,
    // Computed
    todaySession,
    todayTrainingDay,
    currentWeekSessions,
    exerciseHistory,
    // Constants
    MUSCLE_GROUPS,
    EQUIPMENT,
    DAYS,
    FEATURES,
  }
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}
