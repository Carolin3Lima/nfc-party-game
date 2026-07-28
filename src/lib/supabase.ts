import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidas.\n' +
      'Copie .env.example para .env e preencha com as credenciais do seu projeto Supabase.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Room = {
  id: string
  code: string
  current_round: number
  total_rounds: number
  current_restriction_id: string | null
  status: 'lobby' | 'playing'
  created_at: string
  restrictions?: { text: string } | null
}

export type Player = {
  id: string
  room_id: string
  name: string
  score: number
  is_creator: boolean
  created_at: string
}

export type DrawResult = {
  question_id: string
  question_text: string
  restriction_id: string
  restriction_text: string
  round_number: number
}
