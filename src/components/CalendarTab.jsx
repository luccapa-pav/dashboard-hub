import { useState } from 'react'
import { Calendar, Settings } from 'lucide-react'

export function CalendarTab() {
  const [url, setUrl] = useState(
    () => localStorage.getItem('lucc-calendar-url') || ''
  )
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)

  const handleConnect = () => {
    if (!input.trim()) return
    const stored = input.trim()
    localStorage.setItem('lucc-calendar-url', stored)
    setUrl(stored)
    setInput('')
    setEditing(false)
  }

  if (url && !editing) {
    return (
      <div className="calendar-tab">
        <div className="calendar-header">
          <span className="calendar-title">Agenda</span>
          <button
            className="calendar-settings-btn"
            onClick={() => setEditing(true)}
          >
            <Settings size={13} />
            Trocar calendário
          </button>
        </div>
        <iframe
          src={url}
          className="calendar-iframe"
          frameBorder="0"
          scrolling="no"
          title="Google Calendar"
        />
      </div>
    )
  }

  return (
    <div className="calendar-tab">
      <div className="calendar-setup">
        <div className="calendar-setup-icon">
          <Calendar size={32} strokeWidth={1.2} />
        </div>
        <h2>Conectar Calendário</h2>
        <p>Para conectar, copie o link de incorporação do Google Calendar:</p>
        <ol className="calendar-setup-steps">
          <li>Abra Google Calendar → Configurações</li>
          <li>Selecione um calendário → "Integrar agenda"</li>
          <li>Copie o "URL do iframe" e cole abaixo</li>
        </ol>
        <div className="calendar-setup-form">
          <input
            type="text"
            className="calendar-url-input"
            placeholder="Cole o URL de incorporação..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
          />
          <button
            className="calendar-connect-btn"
            onClick={handleConnect}
            disabled={!input.trim()}
          >
            Conectar
          </button>
        </div>
        {editing && (
          <button
            className="calendar-cancel-btn"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
