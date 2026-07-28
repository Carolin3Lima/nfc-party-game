import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRoom } from '../hooks/useRoom'
import { loadSession, clearSession } from '../lib/storage'
import GameCard from '../components/GameCard'
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
  const [restrictionText, setRestrictionText] = useState<string>('')

  useEffect(() => {
    if (!room?.current_restriction_id) return
    supabase
      .from('restrictions')
      .select('text')
      .eq('id', room.current_restriction_id)
      .single()
      .then(({ data }) => {
        if (data?.text) setRestrictionText(data.text)
      })
  }, [room?.current_restriction_id])

  const handleDraw = useCallback(async () => {
    setDrawLoading(true)
    setDrawError(null)
    try {
      const result = await drawQuestion()
      setDraw(result)
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
      const { data: roomData } = await supabase
        .from('rooms')
        .select('current_restriction_id')
        .eq('id', session!.roomId)
        .single()
      if (roomData?.current_restriction_id) {
        const { data: rData } = await supabase
          .from('restrictions')
          .select('text')
          .eq('id', roomData.current_restriction_id)
          .single()
        if (rData?.text) setRestrictionText(rData.text)
      }
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
      <NfcListener onScan={handleDraw} active={!drawLoading} />

      <header className="room-header">
        <div className="room-meta">
          <span className="room-code-label">Sala</span>
          <span className="room-code">{room.code}</span>
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
