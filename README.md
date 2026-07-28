# NFC Party Game

Jogo de mesa físico + digital. Uma etiqueta NFC no centro da mesa — cada jogador aproxima o celular para receber uma pergunta com restrição de narração. Sem app stores, funciona como PWA direto no browser.

---

## Stack

- React 19 + TypeScript + Vite
- PWA (`vite-plugin-pwa`)
- Supabase (banco PostgreSQL + Realtime + RPCs)
- Web NFC API (Android Chrome)

---

## Pré-requisitos

- Node 18+
- Conta no [Supabase](https://supabase.com) (gratuita)
- Android com Chrome 89+ (para NFC em campo)
- HTTPS ou `localhost` (exigido pela Web NFC API)

---

## Setup local

### 1. Clone e instale

```bash
git clone <repo>
cd nfc-party-game
npm install
```

### 2. Configure o Supabase

Copie o arquivo de exemplo e preencha com as credenciais do seu projeto:

```bash
cp .env.example .env
```

Edite `.env`:

```
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>
```

As credenciais ficam em **Supabase → Settings → API**.

### 3. Aplique o schema no banco

No painel do Supabase, vá em **SQL Editor** e execute em ordem:

1. `supabase/migrations/001_init.sql` — cria tabelas, RPCs e políticas RLS
2. `supabase/seed.sql` — insere as 40 perguntas e 40 restrições

### 4. Habilite o Realtime

No painel Supabase vá em **Database → Replication** e adicione as tabelas:

- `rooms`
- `players`

### 5. Rode localmente

```bash
npm run dev
```

Acesse `http://localhost:5173`.

> Para testar o NFC em Android, use um túnel HTTPS (ex: [ngrok](https://ngrok.com)):
> ```bash
> ngrok http 5173
> ```
> Abra a URL `https://...ngrok-free.app` no Chrome do Android.

---

## Build de produção

```bash
npm run build
npm run preview
```

Faça deploy em qualquer host estático com HTTPS (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Etiqueta NFC

A etiqueta NFC funciona apenas como **gatilho físico** — nenhum dado de jogo é armazenado nela. A identidade do jogador vem do `localStorage` do dispositivo.

### O que gravar na tag

Qualquer conteúdo NDEF funciona. O recomendado é gravar a URL do app:

```
https://seu-dominio.com/
```

### Como gravar (Android)

1. Instale o app **NFC Tools** (gratuito na Play Store).
2. Abra o app → **Write** → **Add a record** → **URL**.
3. Digite a URL do seu PWA.
4. Toque a etiqueta NFC no celular para gravar.

Pronto. Qualquer jogador que aproximar o celular (com o app aberto) vai sortear automaticamente.

---

## Como jogar

1. **Criador** abre o app e clica em **Criar sala** → digita o nome.
2. O app gera um **código de 6 letras** — compartilhe com os outros jogadores.
3. **Jogadores** clicam em **Entrar com código** → digitam nome e código.
4. Dentro da sala, todos veem a **restrição da rodada**.
5. Cada jogador **aproxima o celular da etiqueta NFC** (ou toca o botão **Sortear pergunta**) para receber sua pergunta.
6. A mesma pergunta nunca se repete para o mesmo jogador na mesma rodada.
7. Quando todos jogaram, o **criador** toca em **Nova rodada** — nova restrição sorteada, pool zerado.

---

## Estrutura do projeto

```
src/
  lib/
    supabase.ts    — cliente Supabase + tipos
    storage.ts     — persistência localStorage
    nfc.ts         — scan NFC + detecção de suporte
  hooks/
    useRoom.ts     — realtime sala + jogadores + RPCs
  pages/
    Home.tsx       — criar / entrar em sala
    Room.tsx       — sala de jogo principal
  components/
    QuestionCard.tsx   — exibição de pergunta + restrição
    NfcListener.tsx    — listener NFC com fallback
supabase/
  migrations/
    001_init.sql   — schema, RPCs, RLS
  seed.sql         — 40 perguntas + 40 restrições
```

---

## Compatibilidade NFC

| Plataforma | Suporte |
|------------|---------|
| Android + Chrome 89+ | Sim |
| iOS (Safari / Chrome) | Não — Web NFC não suportado |
| Desktop | Não |

Em dispositivos sem suporte, o botão **Sortear pergunta** funciona normalmente.

---

## Schema do banco

| Tabela | Descrição |
|--------|-----------|
| `rooms` | Salas de jogo (código, rodada, restrição ativa) |
| `players` | Jogadores de cada sala |
| `questions` | Banco de perguntas |
| `restrictions` | Banco de restrições de narração |
| `question_draws` | Histórico de sorteios por jogador/rodada (garante sem repetição) |

RPCs atômicas: `draw_question` e `start_new_round`.
