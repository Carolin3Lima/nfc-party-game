import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveSession, loadSession } from '../lib/storage'

type Mode = 'menu' | 'create' | 'join'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Home() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('menu')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const session = loadSession()
    if (!session) return
    // Validate session is still active
    supabase
      .from('rooms')
      .select('id, status')
      .eq('id', session.roomId)
      .single()
      .then(({ data }) => {
        if (data && data.status !== 'finished') {
          navigate('/room', { replace: true })
        }
      })
  }, [navigate])

  async function handleCreate() {
    if (!name.trim()) { setError('Digite seu nome.'); return }
    setLoading(true)
    setError(null)
    try {
      const roomCode = generateCode()

      // Pick a random initial restriction
      const { data: restrictions, error: rErr } = await supabase
        .from('restrictions')
        .select('id')
        .order('id')
      if (rErr || !restrictions?.length) throw new Error('Erro ao carregar restrições.')

      const randomRestriction = restrictions[Math.floor(Math.random() * restrictions.length)]

      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          current_round: 1,
          total_rounds: 1,
          current_restriction_id: randomRestriction.id,
          status: 'playing',
        })
        .select()
        .single()
      if (roomErr || !room) throw new Error('Erro ao criar sala.')

      const { data: player, error: playerErr } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: name.trim(),
          is_creator: true,
          score: 0,
        })
        .select()
        .single()
      if (playerErr || !player) throw new Error('Erro ao criar jogador.')

      saveSession({ playerId: player.id, roomId: room.id, roomCode, playerName: name.trim() })
      navigate('/room')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!name.trim()) { setError('Digite seu nome.'); return }
    if (!code.trim() || code.trim().length !== 6) { setError('Digite o código de 6 letras.'); return }
    setLoading(true)
    setError(null)
    try {
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('code', code.trim().toUpperCase())
        .single()
      if (roomErr || !room) throw new Error('Sala não encontrada. Verifique o código.')
      if (room.status === 'finished') throw new Error('Esta sala já foi encerrada.')

      const { data: player, error: playerErr } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: name.trim(),
          is_creator: false,
          score: 0,
        })
        .select()
        .single()
      if (playerErr || !player) throw new Error('Erro ao entrar na sala.')

      saveSession({ playerId: player.id, roomId: room.id, roomCode: code.trim().toUpperCase(), playerName: name.trim() })
      navigate('/room')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  function back() {
    setMode('menu')
    setError(null)
    setName('')
    setCode('')
  }

  return (
    <div className="page">
      <div className="card">
        <div className="logo">🎲</div>
        <h1 className="title">NFC Party Game</h1>
        <p className="subtitle">Toque na peça NFC e receba sua pergunta</p>

        {error && <div className="error-msg">{error}</div>}

        {mode === 'menu' && (
          <div className="stack">
            <button className="btn btn-primary btn-lg" onClick={() => setMode('create')}>
              ✨ Criar sala
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => setMode('join')}>
              🔗 Entrar com código
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="stack">
            <div className="form-group">
              <label>Seu nome</label>
              <input
                className="input"
                placeholder="Como você quer ser chamado?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                maxLength={32}
                autoFocus
              />
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Criando...' : '✨ Criar sala'}
            </button>
            <button className="btn btn-secondary" onClick={back}>
              ← Voltar
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="stack">
            <div className="form-group">
              <label>Seu nome</label>
              <input
                className="input"
                placeholder="Como você quer ser chamado?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Código da sala</label>
              <input
                className="input code"
                placeholder="XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={6}
              />
            </div>
            <button className="btn btn-primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Entrando...' : '🔗 Entrar na sala'}
            </button>
            <button className="btn btn-secondary" onClick={back}>
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
