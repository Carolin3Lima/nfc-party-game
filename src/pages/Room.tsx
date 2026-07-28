import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { loadSession, clearSession } from '../lib/storage'
import QuestionCard from '../components/QuestionCard'
import NfcListener from '../components/NfcListener'
import type { DrawResult } from '../lib/supabase'

export default function Room() {
  const navigate = useNavigate()
  const session = loadSession()
  const { room, players, currentPlayer, loading, error, drawQuestion, startNewRound } = useRoom(
    session?.roomId ?? null,
    session?.playerId ?? null
  )

  const [draw, setDraw] = useState<DrawResult | null>(null)
  const [drawLoading, setDrawLoading] = useState(false)
  const [drawError, setDrawError] = useState<string | null>(null)
  const [roundLoading, setRoundLoading] = useState(false)
  const [roundError, setRoundError] = useState<string | null>(null)

  const handleDraw = useCallback(async () => {
    setDrawLoading(true)
    setDrawError(null)
    try {
      const result = await drawQuestion()
      setDraw(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao sortear.'
      setDrawError(msg)
    } finally {
      setDrawLoading(false)
    }
  }, [drawQuestion])

  async function handleNewRound() {
    setRoundLoading(true)
    setRoundError(null)
    setDraw(null)
    setDrawError(null)
    try {
      await startNewRound()
    } catch (e: unknown) {
      setRoundError(e instanceof Error ? e.message : 'Erro ao iniciar nova rodada.')
    } finally {
      setRoundLoading(false)
    }
  }

  function handleLeave() {
    clearSession()
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-spinner">⏳ Carregando sala...</div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="page">
        <div className="card">
          <div className="error-msg">{error ?? 'Sala não encontrada.'}</div>
          <button className="btn btn-secondary" onClick={handleLeave}>← Voltar ao início</button>
        </div>
      </div>
    )
  }

  const restriction = (room.restrictions as unknown as { text: string } | null)?.text ?? '—'

  return (
    <div className="room-page">
      {/* Header */}
      <div className="room-header">
        <div className="room-meta">
          <span className="room-code-label">Sala</span>
          <span className="room-code">{room.code}</span>
        </div>
        <div className="round-badge">Rodada {room.current_round}</div>
        <button className="btn-leave" onClick={handleLeave} title="Sair da sala">✕</button>
      </div>

      <div className="room-content">
        {/* Restriction banner */}
        <div className="restriction-banner">
          <span className="restriction-banner-label">Restrição desta rodada</span>
          <p className="restriction-banner-text">{restriction}</p>
        </div>

        {/* Players list */}
        <div className="players-section">
          <span className="section-label">Jogadores ({players.length})</span>
          <div className="players-list">
            {players.map((p) => (
              <div key={p.id} className={`player-chip ${p.id === session?.playerId ? 'player-chip-me' : ''}`}>
                {p.is_creator && <span className="crown">👑</span>}
                {p.name}
                {p.id === session?.playerId && <span className="you-tag">você</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Draw area */}
        <div className="draw-section">
          <NfcListener onScan={handleDraw} active={!drawLoading} />

          {drawError && <div className="error-msg">{drawError}</div>}

          <button
            className="btn btn-primary btn-lg"
            onClick={handleDraw}
            disabled={drawLoading}
          >
            {drawLoading ? '⏳ Sorteando...' : '🎲 Sortear pergunta'}
          </button>
        </div>

        {/* Question card */}
        {draw && (
          <QuestionCard draw={draw} onNext={handleDraw} loading={drawLoading} />
        )}

        {/* New round (creator only) */}
        {currentPlayer?.is_creator && (
          <div className="new-round-section">
            {roundError && <div className="error-msg">{roundError}</div>}
            <button
              className="btn btn-danger"
              onClick={handleNewRound}
              disabled={roundLoading}
            >
              {roundLoading ? 'Iniciando...' : '⏭ Nova rodada'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
