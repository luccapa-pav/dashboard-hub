export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' })

  const { session, prevSession, trainingDayLabel, exercises } = req.body || {}
  if (!session) return res.status(400).json({ error: 'session ausente no body.' })

  const prompt = buildPrompt({ session, prevSession, trainingDayLabel, exercises })

  let geminiRes
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 600,
          },
        }),
      }
    )
  } catch (err) {
    return res.status(502).json({ error: `Falha ao conectar ao Gemini: ${err.message}` })
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text()
    return res.status(502).json({ error: `Gemini retornou erro ${geminiRes.status}: ${errText}` })
  }

  const data = await geminiRes.json()
  const feedback = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!feedback) return res.status(502).json({ error: 'Gemini não retornou texto.' })

  return res.status(200).json({ feedback })
}

// ─────────────────────────────────────────────────────────────
function buildSessionLines(session, exercises = []) {
  const exMap = Object.fromEntries((exercises || []).map(e => [e.id, e.name]))
  const lines = []

  for (const [exId, sets] of Object.entries(session.sets || {})) {
    const name = exMap[exId] || `Exercício ${exId}`
    const done = (sets || []).filter(s => s.completed)
    if (done.length === 0) continue
    const setsStr = done.map(s => `${s.reps}x${s.weightKg > 0 ? s.weightKg + 'kg' : 'peso corporal'}`).join(', ')
    const vol = done.filter(s => s.weightKg > 0).reduce((a, s) => a + (s.reps || 0) * (s.weightKg || 0), 0)
    lines.push(`  • ${name}: ${setsStr}${vol > 0 ? ` (vol: ${vol.toFixed(0)}kg)` : ''}`)
  }

  const allSets = Object.values(session.sets || {}).flat().filter(s => s.completed)
  const totalVol = allSets.filter(s => s.weightKg > 0).reduce((a, s) => a + (s.reps || 0) * (s.weightKg || 0), 0)
  const duration = session.finishedAt && session.startedAt
    ? Math.round((new Date(session.finishedAt) - new Date(session.startedAt)) / 60000)
    : null

  return { lines, totalVol, duration, totalSets: allSets.length }
}

function buildPrompt({ session, prevSession, trainingDayLabel, exercises }) {
  const today = buildSessionLines(session, exercises)
  const todayDate = new Date(session.startedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })

  let prevBlock = ''
  if (prevSession) {
    const prev = buildSessionLines(prevSession, exercises)
    const prevDate = new Date(prevSession.startedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
    const volDiff = today.totalVol > 0 && prev.totalVol > 0
      ? `${today.totalVol > prev.totalVol ? '+' : ''}${(((today.totalVol - prev.totalVol) / prev.totalVol) * 100).toFixed(0)}% volume`
      : null
    prevBlock = `
=== TREINO ANTERIOR (mesmo dia — ${prevDate}) ===
${prev.lines.length > 0 ? prev.lines.join('\n') : '  (sem dados)'}
Volume total: ${prev.totalVol.toFixed(0)} kg | Séries: ${prev.totalSets}${prev.duration ? ` | Duração: ${prev.duration} min` : ''}
${volDiff ? `\nVariação de volume: ${volDiff}` : ''}`
  }

  return `Você é um personal trainer especialista e motivador. Analise o treino de hoje e forneça um feedback personalizado em português brasileiro.

=== TREINO DE HOJE — ${trainingDayLabel || 'Treino'} (${todayDate}) ===
${today.lines.length > 0 ? today.lines.join('\n') : '  (sem exercícios registrados)'}
Volume total: ${today.totalVol.toFixed(0)} kg | Séries: ${today.totalSets}${today.duration ? ` | Duração: ${today.duration} min` : ''}
${prevBlock}

=== INSTRUÇÕES ===
Responda com exatamente 3 blocos separados por linha em branco:

**Como foi o treino**
[2-3 frases avaliando o desempenho de hoje: volume, séries, intensidade]

**Comparação com o último**
[${prevSession ? '2 frases comparando com o treino anterior do mesmo dia — seja específico com números' : 'Primeiro registro deste treino — comente sobre a base estabelecida'}]

**Foco para a próxima vez**
[1-2 sugestões concretas e acionáveis: exercício específico para aumentar carga, série adicional, etc.]

Seja direto, técnico e encorajador. Use os dados concretos. Não repita os dados brutos — interprete-os.`
}
