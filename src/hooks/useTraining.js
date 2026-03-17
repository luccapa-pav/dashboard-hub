import { useState, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'lucc-training-data'
const ANON_USER_ID = 'local-user'

export const FEATURES = {
  useSupabase: !!import.meta.env.VITE_SUPABASE_URL,
  aiEnabled: !!import.meta.env.VITE_AI_ENABLED,
  photosEnabled: false,
}

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps',
  'Antebraço', 'Abdômen', 'Quadríceps', 'Posteriores', 'Glúteos',
  'Panturrilha', 'Trapézio', 'Lombar', 'Cardio',
]

const EQUIPMENT = [
  'Barra', 'Haltere', 'Máquina', 'Cabo', 'Elástico', 'Peso Corporal', 'Kettlebell',
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
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultData()
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
  const addRoutine = useCallback((name, days = []) => {
    const routine = {
      id: makeId(),
      userId: ANON_USER_ID,
      name,
      days, // array of day indices [0-6]
      exercises: [],
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

  // ── Exercises ─────────────────────────────────────────────────
  const addExercise = useCallback((routineId, name, muscleGroup = '', equipment = '') => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        const ex = {
          id: makeId(),
          name,
          muscleGroup,
          equipment,
          order: r.exercises.length,
          defaultSets: 3,
          defaultReps: 12,
          defaultWeight: 0,
        }
        return { ...r, exercises: [...r.exercises, ex] }
      }),
    }))
  }, [save])

  const updateExercise = useCallback((routineId, exerciseId, patch) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return { ...r, exercises: r.exercises.map(e => e.id === exerciseId ? { ...e, ...patch } : e) }
      }),
    }))
  }, [save])

  const deleteExercise = useCallback((routineId, exerciseId) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        return { ...r, exercises: r.exercises.filter(e => e.id !== exerciseId) }
      }),
    }))
  }, [save])

  const reorderExercises = useCallback((routineId, fromIdx, toIdx) => {
    save(cur => ({
      ...cur,
      routines: cur.routines.map(r => {
        if (r.id !== routineId) return r
        const exs = [...r.exercises]
        const [moved] = exs.splice(fromIdx, 1)
        exs.splice(toIdx, 0, moved)
        return { ...r, exercises: exs.map((e, i) => ({ ...e, order: i })) }
      }),
    }))
  }, [save])

  // ── Sessions ──────────────────────────────────────────────────
  const startSession = useCallback((routineId) => {
    const session = {
      id: makeId(),
      userId: ANON_USER_ID,
      routineId,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      completed: false,
      sets: {}, // { exerciseId: [{ id, setNumber, reps, weightKg, completed }] }
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
