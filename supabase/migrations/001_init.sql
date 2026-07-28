-- ╔══════════════════════════════════════════════════════╗
-- ║           NFC Party Game — Schema inicial            ║
-- ╚══════════════════════════════════════════════════════╝

-- ── Extensions ──────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Restrictions ────────────────────────────────────────
create table if not exists restrictions (
  id   uuid primary key default gen_random_uuid(),
  text text not null
);

-- ── Questions ───────────────────────────────────────────
create table if not exists questions (
  id   uuid primary key default gen_random_uuid(),
  text text not null
);

-- ── Rooms ───────────────────────────────────────────────
create table if not exists rooms (
  id                      uuid primary key default gen_random_uuid(),
  code                    char(6)      not null unique,
  current_round           int          not null default 1,
  total_rounds            int          not null default 1,
  current_restriction_id  uuid         references restrictions(id) on delete set null,
  status                  text         not null default 'playing' check (status in ('lobby','playing','finished')),
  created_at              timestamptz  not null default now()
);

-- ── Players ─────────────────────────────────────────────
create table if not exists players (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid        not null references rooms(id) on delete cascade,
  name       text        not null,
  score      int         not null default 0,
  is_creator boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ── Question Draws ──────────────────────────────────────
create table if not exists question_draws (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid        not null references rooms(id) on delete cascade,
  player_id    uuid        not null references players(id) on delete cascade,
  round_number int         not null,
  question_id  uuid        not null references questions(id) on delete cascade,
  created_at   timestamptz not null default now(),
  -- garantia: mesmo jogador não recebe a mesma pergunta na mesma rodada
  unique (player_id, round_number, question_id)
);

-- ── Indexes ─────────────────────────────────────────────
create index if not exists idx_players_room     on players(room_id);
create index if not exists idx_draws_player     on question_draws(player_id, round_number);
create index if not exists idx_rooms_code       on rooms(code);

-- ════════════════════════════════════════════════════════
-- RPC: draw_question(p_room_id, p_player_id)
-- Sorteia uma pergunta não repetida para o jogador na rodada atual
-- ════════════════════════════════════════════════════════
create or replace function draw_question(
  p_room_id   uuid,
  p_player_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round        int;
  v_restriction  uuid;
  v_question_id  uuid;
  v_question_txt text;
  v_restrict_txt text;
begin
  -- Obtém a rodada atual e restrição da sala
  select current_round, current_restriction_id
  into   v_round, v_restriction
  from   rooms
  where  id = p_room_id;

  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  -- Sorteia uma pergunta ainda não recebida pelo jogador nesta rodada
  select q.id, q.text
  into   v_question_id, v_question_txt
  from   questions q
  where  q.id not in (
           select question_id
           from   question_draws
           where  player_id    = p_player_id
             and  round_number = v_round
         )
  order  by random()
  limit  1;

  if not found then
    raise exception 'NO_QUESTIONS_LEFT';
  end if;

  -- Registra o sorteio (constraint UNIQUE evita race conditions)
  insert into question_draws (room_id, player_id, round_number, question_id)
  values (p_room_id, p_player_id, v_round, v_question_id)
  on conflict do nothing;

  -- Obtém o texto da restrição
  select text into v_restrict_txt
  from   restrictions
  where  id = v_restriction;

  return json_build_object(
    'question_id',       v_question_id,
    'question_text',     v_question_txt,
    'restriction_id',    v_restriction,
    'restriction_text',  coalesce(v_restrict_txt, ''),
    'round_number',      v_round
  );
end;
$$;

-- ════════════════════════════════════════════════════════
-- RPC: start_new_round(p_room_id, p_player_id)
-- Inicia uma nova rodada (somente o criador da sala)
-- ════════════════════════════════════════════════════════
create or replace function start_new_round(
  p_room_id   uuid,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_creator          boolean;
  v_current_restriction uuid;
  v_new_restriction     uuid;
begin
  -- Valida que o jogador é criador da sala
  select is_creator into v_is_creator
  from   players
  where  id = p_player_id and room_id = p_room_id;

  if not found or not v_is_creator then
    raise exception 'NOT_CREATOR';
  end if;

  -- Obtém restrição atual para evitar repetir
  select current_restriction_id into v_current_restriction
  from   rooms where id = p_room_id;

  -- Sorteia nova restrição diferente da atual (se houver mais de uma)
  select id into v_new_restriction
  from   restrictions
  where  id is distinct from v_current_restriction
  order  by random()
  limit  1;

  -- Fallback: se só existe uma restrição, mantém ela
  if not found then
    v_new_restriction := v_current_restriction;
  end if;

  -- Incrementa rodada e atualiza restrição
  update rooms
  set    current_round          = current_round + 1,
         total_rounds           = total_rounds + 1,
         current_restriction_id = v_new_restriction
  where  id = p_room_id;
end;
$$;

-- ════════════════════════════════════════════════════════
-- RLS — permissões para anon (sem login)
-- ════════════════════════════════════════════════════════
alter table restrictions    enable row level security;
alter table questions       enable row level security;
alter table rooms           enable row level security;
alter table players         enable row level security;
alter table question_draws  enable row level security;

-- Leitura pública para restrictions e questions (dados estáticos de seed)
create policy "anon_read_restrictions" on restrictions for select using (true);
create policy "anon_read_questions"    on questions    for select using (true);

-- Rooms: leitura e criação livres para anon
create policy "anon_read_rooms"   on rooms for select using (true);
create policy "anon_insert_rooms" on rooms for insert with check (true);

-- Players: leitura livre; inserção livre; sem update/delete no MVP
create policy "anon_read_players"   on players for select using (true);
create policy "anon_insert_players" on players for insert with check (true);

-- Question draws: leitura e inserção via RPC (SECURITY DEFINER bypass RLS)
create policy "anon_read_draws"   on question_draws for select using (true);
create policy "anon_insert_draws" on question_draws for insert with check (true);

-- Realtime: habilitar publicação nas tabelas relevantes
-- (execute no dashboard Supabase: Database > Replication > add tables)
-- alter publication supabase_realtime add table rooms;
-- alter publication supabase_realtime add table players;
