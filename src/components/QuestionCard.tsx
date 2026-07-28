import type { DrawResult } from '../lib/supabase'

type Props = {
  draw: DrawResult
  onNext?: () => void
  loading?: boolean
}

export default function QuestionCard({ draw, onNext, loading }: Props) {
  return (
    <div className="question-card">
      <div className="restriction-badge">
        <span className="restriction-label">Restrição da rodada</span>
        <p className="restriction-text">{draw.restriction_text}</p>
      </div>

      <div className="question-body">
        <span className="question-label">Sua pergunta</span>
        <p className="question-text">{draw.question_text}</p>
      </div>

      {onNext && (
        <button className="btn btn-secondary" onClick={onNext} disabled={loading}>
          {loading ? 'Sorteando...' : '🔀 Nova pergunta'}
        </button>
      )}
    </div>
  )
}
