import type { DrawResult } from '../lib/supabase'

type Props = {
  restriction: string
  draw: DrawResult | null
  loading: boolean
  countdown: number | null
  lastDrawnBy: string | null
  onClick: () => void
}

export default function GameCard({ restriction, draw, loading, countdown, lastDrawnBy, onClick }: Props) {
  return (
    <div
      className={`game-card ${draw ? 'game-card--has-question' : 'game-card--idle'} ${loading || countdown !== null ? 'game-card--loading' : ''}`}
      onClick={!loading && countdown === null ? onClick : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !loading && countdown === null && onClick()}
      aria-label={draw ? 'Sortear nova pergunta' : 'Sortear pergunta'}
    >
      <div className="gc-restriction">
        <span className="gc-restriction-label">Restrição</span>
        <p className="gc-restriction-text">{restriction || '—'}</p>
      </div>

      <div className="gc-body">
        {countdown !== null ? (
          <div className="gc-countdown" key={countdown}>{countdown}</div>
        ) : loading ? (
          <div className="gc-loading">
            <div className="gc-dice-roll">🎲</div>
          </div>
        ) : draw ? (
          <>
            <p className="gc-question" key={draw.question_id}>{draw.question_text}</p>
            {lastDrawnBy && (
              <span className="gc-drawn-by">com {lastDrawnBy}</span>
            )}
            <span className="gc-tap-hint">toque para nova pergunta</span>
          </>
        ) : (
          <>
            <div className="gc-dice-roll">🎲</div>
            <p className="gc-idle-text">Toque no NFC ou aqui para sortear</p>
          </>
        )}
      </div>
    </div>
  )
}
