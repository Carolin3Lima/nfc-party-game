import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { loadSession, clearSession } from '../lib/storage'
import GameCard from '../components/GameCard'
import NfcListener from '../components/NfcListener'
import type { DrawResult } from '../lib/supabase'

export default function Room() {
  const navigate = useNavigate()
  const session = loadSession()
  const { room, restrictionText, players, currentPlayer, loading, error, joinToast, lastDrawnByName, drawQuestion, startNewRound } = useRoom(
    session?.roomId ?? null,
    session?.playerId ?? null
  )

  const [draw, setDraw] = useState<DrawResult | null>(null)
  const [drawLoading, setDrawLoading] = useState(false)
  const [drawError, setDrawError] = useState<string | null>(null)
  const [roundLoading, setRoundLoading] = useState(false)
  const [roundError, setRoundError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const lastDrawRef = useRef<number>(0)

  function handleCopyCode() {
    if (!room) return
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDraw = useCallback(async () => {
    const now = Date.now()
    if (now - lastDrawRef.current < 3000) return
    lastDrawRef.current = now

    for (const n of [3, 2, 1]) {
      setCountdown(n)
      await new Promise(r => setTimeout(r, 700))
    }
    setCountdown(null)

    setDrawLoading(true)
    setDrawError(null)
    try {
      const result = await drawQuestion()
      setDraw(result)
      navigator.vibrate?.(80)
    } catch (e: unknown) {
      setDrawError(e instanceof Error ? e.message : 'Erro ao sortear.')
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
        <div className="loading-spinner">Carregando sala...</div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="page">
        <div className="card">
          <div className="error-msg">{error ?? 'Sala não encontrada.'}</div>
          <button className="btn btn-secondary" onClick={handleLeave}>← Voltar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="room-page">
      <NfcListener onScan={handleDraw} active={!drawLoading && countdown === null} />

      {joinToast && (
        <div className="join-toast">{joinToast} entrou na sala 👋</div>
      )}

      <header className="room-header">
        <div className="room-meta">
          <span className="room-code-label">Sala</span>
          <div className="room-code-row">
            <span className="room-code">{room.code}</span>
            <button
              className="btn-copy"
              onClick={handleCopyCode}
              aria-label="Copiar código da sala"
              title="Copiar código"
            >
              {copied ? '✓' : '⎘'}
            </button>
          </div>
        </div>
        <span className="round-badge">Rodada {room.current_round}</span>
        <button className="btn-leave" onClick={handleLeave} aria-label="Sair">✕</button>
      </header>

      <main className="room-main">
        {drawError && <div className="error-msg room-error">{drawError}</div>}
        <GameCard
          restriction={restrictionText}
          draw={draw}
          loading={drawLoading}
          countdown={countdown}
          lastDrawnBy={lastDrawnByName}
          onClick={handleDraw}
        />
      </main>

      <footer className="room-footer">
        <div className="players-row">
          {players.map((p) => (
            <div
              key={p.id}
              className={`player-chip ${p.id === session?.playerId ? 'player-chip-me' : ''}`}
            >
              {p.is_creator && <span className="crown">👑</span>}
              {p.name}
              {p.id === session?.playerId && <span className="you-tag">você</span>}
            </div>
          ))}
        </div>

        {currentPlayer?.is_creator && (
          <div className="footer-actions">
            {roundError && <span className="footer-error">{roundError}</span>}
            <button
              className="new-round-btn"
              onClick={handleNewRound}
              disabled={roundLoading}
            >
              {roundLoading ? 'Aguarde...' : 'Nova rodada ⏭'}
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}
