export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' })

  const { snapshot } = req.body || {}
  if (!snapshot) return res.status(400).json({ error: 'snapshot ausente no body.' })

  const prompt = buildPrompt(snapshot)

  let geminiRes
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 700,
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
// Monta o prompt com base no snapshot de treinos
// ─────────────────────────────────────────────────────────────
function buildPrompt({ currentWeek = [], allSessions = [] }) {
  const weekLines = currentWeek.map(s => {
    const allSets = Object.values(s.sets || {}).flat()
    const done = allSets.filter(x => x.completed)
    const volume = done
      .filter(x => x.weightKg > 0)
      .reduce((acc, x) => acc + (x.reps || 0) * (x.weightKg || 0), 0)
    const duration =
      s.finishedAt && s.startedAt
        ? Math.round((new Date(s.finishedAt) - new Date(s.startedAt)) / 60000)
        : null
    const date = new Date(s.startedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
    return `  • ${date}: ${done.length} séries concluídas${volume > 0 ? `, volume ${volume.toFixed(0)} kg` : ''}${duration ? `, ${duration} min` : ''}`
  })

  // Compara volume médio desta semana vs semana anterior
  const totalVol = (sessions) =>
    sessions.reduce((acc, s) => {
      const v = Object.values(s.sets || {}).flat()
        .filter(x => x.completed && x.weightKg > 0)
        .reduce((a, x) => a + (x.reps || 0) * (x.weightKg || 0), 0)
      return acc + v
    }, 0)

  const prevWeekSessions = allSessions.filter(s => {
    const d = new Date(s.startedAt)
    const now = new Date()
    const diff = (now - d) / (1000 * 60 * 60 * 24)
    return diff >= 7 && diff < 14
  })

  const currVol = totalVol(currentWeek)
  const prevVol = totalVol(prevWeekSessions)
  const volDiff =
    prevVol > 0
      ? `${currVol > prevVol ? '+' : ''}${(((currVol - prevVol) / prevVol) * 100).toFixed(0)}% vs semana passada`
      : null

  const totalHistorico = allSessions.filter(s => s.completed).length

  return `Você é um personal trainer especialista e motivador. Analise os dados de treino abaixo e forneça um feedback semanal personalizado em português brasileiro.

=== DADOS DESTA SEMANA (${currentWeek.length} treino${currentWeek.length !== 1 ? 's' : ''}) ===
${weekLines.length > 0 ? weekLines.join('\n') : '  (nenhum treino registrado)'}
${volDiff ? `\nVolume total desta semana: ${currVol.toFixed(0)} kg (${volDiff})` : ''}

=== CONTEXTO HISTÓRICO ===
Total de treinos registrados: ${totalHistorico}
Sessões analisadas: últimas ${allSessions.length}

=== INSTRUÇÕES ===
Responda com exatamente 3 blocos separados por linha em branco:

**Análise da semana**
[2-3 frases avaliando consistência, volume e esforço com base nos dados acima]

**Pontos de atenção**
[1-2 sugestões específicas e acionáveis para melhorar: descanso, progressão de carga, frequência, etc.]

**Para a próxima semana**
[1-2 frases de orientação e motivação concreta]

Seja direto, técnico e encorajador. Use dados concretos dos treinos. Não repita os dados brutos — interprete-os.`
}
