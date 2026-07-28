import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, type Room, type Player, type DrawResult } from '../lib/supabase'

async function fetchRestrictionText(restrictionId: string | null): Promise<string> {
  if (!restrictionId) return ''
  const { data } = await supabase
    .from('restrictions')
    .select('text')
    .eq('id', restrictionId)
    .single()
  return data?.text ?? ''
}

export function useRoom(roomId: string | null, playerId: string | null) {
  const [room, setRoom] = useState<Room | null>(null)
  const [restrictionText, setRestrictionText] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joinToast, setJoinToast] = useState<string | null>(null)
  const [lastDrawnByName, setLastDrawnByName] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const joinToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRoom = useCallback(async () => {
    if (!roomId) return

    const { data: roomData, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomErr || !roomData) {
      setError(roomErr?.message ?? 'Sala não encontrada.')
      return
    }

    setRoom(roomData as Room)

    const text = await fetchRestrictionText(roomData.current_restriction_id)
    setRestrictionText(text)
  }, [roomId])

  const fetchPlayers = useCallback(async () => {
    if (!roomId) return
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at')
    if (!error && data) setPlayers(data as Player[])
  }, [roomId])

  useEffect(() => {
    if (!roomId) return

    setLoading(true)
    Promise.all([fetchRoom(), fetchPlayers()]).finally(() => setLoading(false))

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const newRoom = payload.new as Room
          setRoom(newRoom)
          fetchRestrictionText(newRoom.current_restriction_id ?? null).then(setRestrictionText)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newPlayer = payload.new as Player
          if (newPlayer.id !== playerId) {
            if (joinToastTimerRef.current) clearTimeout(joinToastTimerRef.current)
            setJoinToast(newPlayer.name)
            joinToastTimerRef.current = setTimeout(() => setJoinToast(null), 3000)
          }
          fetchPlayers()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        () => { fetchPlayers() }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'question_draws', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const draw = payload.new as { player_id: string }
          setPlayers(prev => {
            const p = prev.find(pl => pl.id === draw.player_id)
            if (p) setLastDrawnByName(p.name)
            return prev
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, fetchRoom, fetchPlayers])

  const drawQuestion = useCallback(async (): Promise<DrawResult> => {
    if (!roomId || !playerId) throw new Error('Sessão inválida.')
    const { data, error } = await supabase.rpc('draw_question', {
      p_room_id: roomId,
      p_player_id: playerId,
    })
    if (error) throw new Error(error.message)
    return data as DrawResult
  }, [roomId, playerId])

  const startNewRound = useCallback(async (): Promise<void> => {
    if (!roomId || !playerId) throw new Error('Sessão inválida.')
    const { error } = await supabase.rpc('start_new_round', {
      p_room_id: roomId,
      p_player_id: playerId,
    })
    if (error) throw new Error(error.message)
    // Força re-fetch completo após RPC
    await fetchRoom()
  }, [roomId, playerId, fetchRoom])

  const currentPlayer = players.find((p) => p.id === playerId) ?? null

  return { room, restrictionText, players, currentPlayer, loading, error, joinToast, lastDrawnByName, drawQuestion, startNewRound }
}
