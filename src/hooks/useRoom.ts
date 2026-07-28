import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, type Room, type Player, type DrawResult } from '../lib/supabase'

export function useRoom(roomId: string | null, playerId: string | null) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchRoom = useCallback(async () => {
    if (!roomId) return
    const { data, error } = await supabase
      .from('rooms')
      .select('*, restrictions(text)')
      .eq('id', roomId)
      .single()
    if (error) {
      setError(error.message)
    } else {
      setRoom(data as Room)
    }
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => {
        fetchRoom()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, () => {
        fetchPlayers()
      })
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
  }, [roomId, playerId])

  const currentPlayer = players.find((p) => p.id === playerId) ?? null

  return { room, players, currentPlayer, loading, error, drawQuestion, startNewRound }
}
