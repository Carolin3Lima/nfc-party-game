import type { DrawResult } from '../lib/supabase'

type Props = {
  restriction: string
  draw: DrawResult | null
  loading: boolean
  onClick: () => void
}

export default function GameCard({ restriction, draw, loading, onClick }: Props) {
  return (
    <div
      className={`game-card ${draw ? 'game-card--has-question' : 'game-card--idle'} ${loading ? 'game-card--loading' : ''}`}
      onClick={!loading ? onClick : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !loading && onClick()}
      aria-label={draw ? 'Sortear nova pergunta' : 'Sortear pergunta'}
    >
      {/* Restrição — sempre visível no topo da carta */}
      <div className="gc-restriction">
        <span className="gc-restriction-label">Restrição</span>
        <p className="gc-restriction-text">{restriction || '—'}</p>
      </div>

      {/* Corpo central */}
      <div className="gc-body">
        {loading ? (
          <div className="gc-loading">
            <div className="gc-dice-roll">🎲</div>
          </div>
        ) : draw ? (
          <>
            <p className="gc-question">{draw.question_text}</p>
            <span className="gc-tap-hint">toque para nova pergunta</span>
          </>
        ) : (
          <>
            <div className="gc-idle-icon">🎲</div>
            <p className="gc-idle-text">Toque no NFC ou aqui para sortear</p>
          </>
        )}
      </div>
    </div>
  )
}
