# Podium Arena — Sistema de Gestão

Sistema web completo para arenas esportivas: reserva de quadras, inscrição em eventos, ranking por temporada e pagamentos integrados via Mercado Pago (PIX e cartão de crédito).

---

## Índice

1. [Visão geral da arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de pastas](#2-estrutura-de-pastas)
3. [Pré-requisitos](#3-pré-requisitos)
4. [Variáveis de ambiente](#4-variáveis-de-ambiente)
5. [Como rodar localmente](#5-como-rodar-localmente)
6. [Banco de dados (MongoDB Atlas)](#6-banco-de-dados-mongodb-atlas)
7. [Autenticação](#7-autenticação)
8. [Pagamentos (Mercado Pago)](#8-pagamentos-mercado-pago)
9. [Notificações automáticas](#9-notificações-automáticas)
10. [Páginas e rotas do frontend](#10-páginas-e-rotas-do-frontend)
11. [API — rotas do backend](#11-api--rotas-do-backend)
12. [Modelos do banco de dados](#12-modelos-do-banco-de-dados)
13. [Deploy em produção](#13-deploy-em-produção)
14. [Troca de ambiente (teste → produção)](#14-troca-de-ambiente-teste--produção)
15. [Dependências completas](#15-dependências-completas)

---

## 1. Visão geral da arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)          Backend (Node.js + Express)│
│  Hospedagem: Vercel               Hospedagem: Render         │
│                                                             │
│  /reservas ──────── POST /api/bookings ────────────────────►│
│  /eventos  ──────── POST /api/events   ────────────────────►│
│  /ranking  ──────── GET  /api/ranking  ────────────────────►│
│  /painel   ──────── GET  /api/bookings/me ─────────────────►│
│  /admin    ──────── rotas restritas (adminOnly) ───────────►│
│                                          │                  │
│                                    MongoDB Atlas            │
│                                    (banco na nuvem)         │
│                                          │                  │
│                                    Mercado Pago API         │
│                                    (PIX + cartão)           │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend**: SPA React (sem Next.js). Comunicação com o backend via axios para `/api/*`, que o Vite proxy redireciona para `localhost:5000` em desenvolvimento.
- **Backend**: API REST Express. Autenticação por JWT Bearer token. Todas as rotas protegidas exigem o header `Authorization: Bearer <token>`.
- **Banco**: MongoDB Atlas (cloud). Conexão via Mongoose.
- **Pagamentos**: Mercado Pago. O Brick do frontend tokeniza o cartão (nunca passa pelo backend). O backend cria o pagamento via SDK MP com o token.

---

## 2. Estrutura de pastas

```
prototipo-podium/
├── backend/
│   └── src/
│       ├── app.js              # Express app (middlewares + rotas)
│       ├── server.js           # Entry point: conecta DB, inicia scheduler, sobe servidor
│       ├── config/
│       │   └── db.js           # Conexão Mongoose com o Atlas
│       ├── controllers/        # Lógica de negócio de cada recurso
│       │   ├── auth.controller.js
│       │   ├── booking.controller.js
│       │   ├── event.controller.js
│       │   ├── registration.controller.js
│       │   ├── ranking.controller.js
│       │   ├── season.controller.js
│       │   ├── settings.controller.js
│       │   ├── user.controller.js
│       │   └── blockedSlot.controller.js
│       ├── models/             # Schemas do Mongoose
│       │   ├── User.js
│       │   ├── Booking.js
│       │   ├── Event.js
│       │   ├── Registration.js
│       │   ├── Season.js
│       │   ├── Settings.js
│       │   ├── Ranking.js
│       │   └── BlockedSlot.js
│       ├── routes/             # Definição das rotas + middlewares por recurso
│       ├── middleware/
│       │   └── auth.js         # protect (JWT) + adminOnly
│       └── utils/
│           ├── email.js        # Nodemailer (confirmação, lembrete, reset de senha)
│           ├── scheduler.js    # Lembretes 2h antes + resumo semanal (setInterval 5min)
│           ├── whatsapp.js     # Envio via Twilio (opcional)
│           ├── upload.js       # Multer (upload de imagens base64 nos eventos)
│           ├── season.js       # Geração de ocorrências de temporada
│           └── live.js         # SSE para conexão viva (keepalive no Render free)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── main.jsx            # Entry point: GoogleOAuthProvider + importa todos os CSS
│   │   ├── App.jsx             # BrowserRouter + providers (Auth, Settings, Toast) + rotas
│   │   ├── pages/
│   │   │   ├── Home.jsx        # Landing page com seções (hero, sobre, quadras, etc.)
│   │   │   ├── Eventos.jsx     # Lista de eventos + inscrição + pagamento
│   │   │   ├── Ranking.jsx     # Ranking por esporte/gênero/nível/temporada
│   │   │   ├── Reservas.jsx    # Agendamento de quadra + pagamento
│   │   │   ├── Painel.jsx      # Painel do usuário (reservas, inscrições, pagamentos)
│   │   │   ├── Admin.jsx       # Painel administrativo completo
│   │   │   ├── Privacidade.jsx # Política de privacidade
│   │   │   └── RedefinirSenha.jsx # Redefinição de senha via token de e-mail
│   │   ├── components/
│   │   │   ├── Nav.jsx         # Barra de navegação + drawer mobile
│   │   │   ├── AuthModal.jsx   # Modal de login/cadastro (e-mail ou Google)
│   │   │   ├── PagamentoModal.jsx  # Modal de pagamento (PIX + cartão Bricks)
│   │   │   ├── CompletePerfilModal.jsx # Força preenchimento de CPF ao logar pelo Google
│   │   │   ├── AdminSeason.jsx # Gestão de temporadas (subcomponente do Admin)
│   │   │   ├── Toast.jsx       # Sistema de notificações toast (contexto global)
│   │   │   ├── LogoutModal.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── Podium*.jsx     # Inputs customizados: DatePicker, TimePicker, Select, NumberInput
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx     # user, login, register, loginWithGoogle, logout, updateUser
│   │   │   └── SettingsContext.jsx # Configurações da arena (nome, horários, contato)
│   │   ├── services/
│   │   │   └── api.js          # Instância axios com baseURL + interceptor de token JWT
│   │   └── styles/             # CSS global (vars, base, nav, auth, painel, admin, etc.)
│   └── vite.config.js          # Plugin React + proxy /api → localhost:5000
```

---

## 3. Pré-requisitos

| Ferramenta | Versão mínima | Para que serve |
|---|---|---|
| Node.js | 18+ | Rodar backend e frontend |
| npm | 9+ | Instalar dependências |
| Conta MongoDB Atlas | — | Banco de dados na nuvem |
| Conta Mercado Pago | — | Processar pagamentos |
| Conta Google Cloud | — | OAuth "Entrar com Google" |
| Conta Gmail | — | Envio de e-mails (SMTP) |

---

## 4. Variáveis de ambiente

### `backend/.env`

```env
# Servidor
PORT=5000
NODE_ENV=development          # ou production

# Banco de dados
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/nome_banco

# JWT
JWT_SECRET=chave_secreta_longa_e_aleatoria
JWT_EXPIRES_IN=7d

# URLs (necessário para links de redefinição de senha e CORS)
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=788087763759-xxxx.apps.googleusercontent.com

# E-mail (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu@gmail.com
EMAIL_PASS=senha_de_app_google   # Gerar em: Conta Google → Segurança → Senhas de app

# Mercado Pago
MP_ACCESS_TOKEN=TEST-...   # Em teste: TEST- do irmão / Em produção: APP_USR- do cliente
MP_WEBHOOK_SECRET=         # Assinatura do webhook (gerada no painel MP, para produção)
```

### `frontend/.env`

```env
# Usado no build de produção (Vercel)
VITE_GOOGLE_CLIENT_ID=788087763759-xxxx.apps.googleusercontent.com
VITE_MP_PUBLIC_KEY=APP_USR-ed452dab-...   # Public key de produção
VITE_API_URL=https://url-do-backend-no-render.onrender.com
```

### `frontend/.env.local` (sobrepõe `.env` apenas localmente — não commitar)

```env
VITE_MP_PUBLIC_KEY="TEST-84733def-..."   # Public key de teste (conta do irmão)
VITE_GOOGLE_CLIENT_ID=788087763759-xxxx.apps.googleusercontent.com
```

> **Regra do Vite**: `.env.local` tem prioridade sobre `.env`. Sempre reiniciar o `npm run dev` do frontend ao trocar variáveis de ambiente — elas são embutidas no bundle na inicialização, não em runtime.

---

## 5. Como rodar localmente

```bash
# 1. Clonar o repositório
git clone https://github.com/pedrolcmendes/prototipo-podium.git
cd prototipo-podium

# 2. Instalar dependências do backend
cd backend
npm install

# 3. Criar backend/.env com as variáveis da seção anterior
# (copie o modelo acima e preencha com os valores reais)

# 4. Rodar o backend (porta 5000)
npm run dev
# Deve aparecer: "Servidor rodando na porta 5000 [development]"
# e: "Conectado ao MongoDB"

# Em outro terminal:

# 5. Instalar dependências do frontend
cd ../frontend
npm install

# 6. Criar frontend/.env.local com as variáveis locais

# 7. Rodar o frontend (porta 5173)
npm run dev
# Acesse: http://localhost:5173
```

O Vite está configurado com proxy: qualquer chamada para `/api/*` é redirecionada automaticamente para `http://localhost:5000`. Não é necessário configurar CORS manualmente em desenvolvimento.

---

## 6. Banco de dados (MongoDB Atlas)

### Conexão

A string de conexão fica em `MONGO_URI`. Formato Atlas:

```
mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/<nome_banco>?retryWrites=true&w=majority
```

Para liberar acesso local: no painel do Atlas, vá em **Network Access → Add IP Address** e adicione seu IP (ou `0.0.0.0/0` para aceitar qualquer IP — usado no Render).

### Collections (criadas automaticamente pelo Mongoose)

| Collection | Model | Descrição |
|---|---|---|
| `users` | `User` | Usuários cadastrados (e-mail/senha ou Google OAuth) |
| `bookings` | `Booking` | Reservas de quadra |
| `events` | `Event` | Eventos e torneios criados pelo admin |
| `registrations` | `Registration` | Inscrições de usuários em eventos |
| `seasons` | `Season` | Temporadas recorrentes (reservas em série) |
| `settings` | `Settings` | Configurações da arena (único documento, `_id: 'global'`) |
| `rankings` | `Ranking` | Ranking por esporte/gênero/nível/ano/semestre |
| `blockedslots` | `BlockedSlot` | Horários bloqueados pelo admin |

### Criar o primeiro usuário administrador

O campo `admin: true` no modelo `User` controla o acesso ao painel `/admin`. O primeiro admin precisa ser criado manualmente pelo MongoDB Atlas (ou Compass):

1. No Atlas, abra a collection `users`
2. Encontre o documento do usuário que será admin
3. Edite e adicione `"admin": true`

Todos os usuários subsequentes criados pelo painel admin dentro do sistema já podem receber permissão pela interface.

### Índice do CPF

O `server.js` executa `fixCpfIndex()` na inicialização: garante que o índice `cpf` seja `unique + sparse` (permite vários documentos com CPF nulo, como usuários cadastrados pelo Google que ainda não preencheram o CPF).

---

## 7. Autenticação

### Fluxo e-mail/senha

1. Usuário posta `POST /api/auth/register` ou `POST /api/auth/login`
2. Backend retorna `{ token, user }` — JWT assinado com `JWT_SECRET`, expira em `JWT_EXPIRES_IN`
3. Frontend salva em `localStorage` (`podium_token` e `podium_user`)
4. O interceptor do axios (`services/api.js`) injeta `Authorization: Bearer <token>` em toda requisição automaticamente

### Fluxo Google OAuth

1. `@react-oauth/google` retorna um `access_token` após o usuário clicar em "Entrar com Google"
2. Frontend posta esse token para `POST /api/auth/google`
3. Backend valida com `google-auth-library`, cria/atualiza o usuário no banco e retorna JWT próprio
4. Se o usuário for novo e não tiver CPF, o `CompletePerfilModal` abre automaticamente para preenchimento

### Redefinição de senha

1. `POST /api/auth/forgot-password` — gera um token aleatório com 1h de validade e envia por e-mail
2. O link no e-mail aponta para `/redefinir-senha/:token`
3. `POST /api/auth/reset-password` — valida o token e salva a nova senha com bcrypt

### Middleware

```js
// Protege rota para qualquer usuário logado
router.get('/rota', protect, controller);

// Protege rota somente para admin
router.post('/rota-admin', protect, adminOnly, controller);
```

---

## 8. Pagamentos (Mercado Pago)

### Credenciais e ambientes

| Ambiente | MP_ACCESS_TOKEN | VITE_MP_PUBLIC_KEY |
|---|---|---|
| Desenvolvimento | `TEST-` da conta de um desenvolvedor com conta MP estabelecida (verificada) | `TEST-` correspondente da mesma aplicação |
| Produção | `APP_USR-` da conta do cliente (precisa ter identidade verificada no MP) | `APP_USR-` correspondente |

> Contas de teste criadas via painel MP ("Contas de teste") com credenciais `APP_USR-` retornam `401 Unauthorized use of live credentials` no endpoint `/v1/payments` — é um problema conhecido do MP. A solução é usar credenciais `TEST-` de uma aplicação criada em uma conta MP pessoal verificada.

### Fluxo PIX

```
Frontend                     Backend                    Mercado Pago
   │                            │                            │
   ├── POST /api/pagamentos/pix ►│                            │
   │                            ├── MP.create (payment_method_id: 'pix') ►│
   │                            │◄── { id, qr_code, status: 'pending' } ──│
   │◄── { pixCode, qrBase64, expiresAt, mpPaymentId } ───────│
   │                            │                            │
   │  [polling a cada 3s]       │                            │
   ├── GET /api/pagamentos/sync?mpPaymentId=xxx ────────────►│
   │                            ├── MP.get(id) ──────────────►│
   │                            │◄── { status: 'approved' } ─│
   │◄── { status: 'aprovado' } ──                            │
   │                            │                            │
   [redirect para /pagamento/retorno]
```

### Fluxo Cartão de Crédito

```
Frontend (Checkout Bricks)    Backend                    Mercado Pago
   │                            │                            │
   │  Usuário digita o cartão   │                            │
   ├── tokenizar cartão ────────────────────────────────────►│
   │◄── { token } ─────────────────────────────────────────────────│
   │                            │                            │
   ├── POST /api/pagamentos/cartao (token, paymentMethodId, installments:1) ►│
   │                            ├── MP.create (token, installments: 1) ──►│
   │                            │◄── { id, status: 'approved'/'rejected' } ┤
   │◄── { status, declineMessage } ──────────────────────────│
```

- O cartão só permite **1 parcela** (configurado no Brick e validado no backend)
- Somente **cartão de crédito** é aceito (filtrado pelo Brick e pela API de métodos de pagamento do MP)
- **Recusa não cancela a reserva** — o usuário pode tentar outro cartão
- Idempotência: a chave de idempotência é o SHA-256 do token MP + referência — garante que quedas de rede não gerem cobrança dupla

### Webhook (produção)

Para que o backend receba confirmações assíncronas do MP (ex.: PIX pago):

1. No painel MP, na aplicação do cliente: **Webhooks → Adicionar URL**
2. URL: `https://<backend-no-render>.onrender.com/api/pagamentos/webhook`
3. Eventos: `payment`
4. Copie a **chave de assinatura** gerada e coloque em `MP_WEBHOOK_SECRET` no Render

---

## 9. Notificações automáticas

O `scheduler.js` executa a cada **5 minutos** via `setInterval`. Funcionalidades ativas se configuradas em `Settings`:

| Notificação | Campo em Settings | Quando dispara |
|---|---|---|
| Confirmação de reserva | `notifEmailConfirm` | Ao criar a reserva |
| Lembrete 2h antes | `notifReminder` | Quando faltam ≤120 min para o horário |
| Alerta de cancelamento | `notifCancelAlert` | Ao cancelar uma reserva |
| Resumo semanal | `notifWeeklySummary` | Toda segunda-feira (uma vez) |

O servidor do Render roda em **UTC**. Todos os cálculos de horário usam o fuso `America/Sao_Paulo` via `Intl.DateTimeFormat`.

### Configuração do Gmail (SMTP)

1. Ative a verificação em 2 etapas na conta Google
2. Acesse **Conta Google → Segurança → Senhas de app**
3. Crie uma senha para "Outro (nome personalizado)" → copie e coloque em `EMAIL_PASS`

---

## 10. Páginas e rotas do frontend

| Rota | Componente | Descrição |
|---|---|---|
| `/` | `Home` | Landing page: hero, sobre, quadras, contato, agenda rápida |
| `/eventos` | `Eventos` | Lista de eventos abertos, inscrição com pagamento |
| `/ranking` | `Ranking` | Ranking público por esporte/gênero/nível/temporada |
| `/reservas` | `Reservas` | Agenda de quadras + reserva + pagamento (requer login) |
| `/painel` | `Painel` | Área do usuário: minhas reservas, inscrições, pagamentos pendentes |
| `/admin` | `Admin` | Painel administrativo (requer `admin: true`) |
| `/privacidade` | `Privacidade` | Política de privacidade |
| `/redefinir-senha/:token` | `RedefinirSenha` | Redefinição de senha via link do e-mail |

### Contextos globais

- **`AuthContext`**: `user`, `login()`, `register()`, `loginWithGoogle()`, `logout()`, `updateUser()`. Estado salvo em `localStorage` (`podium_token`, `podium_user`).
- **`SettingsContext`**: Carrega as configurações da arena (`/api/settings`) uma vez e disponibiliza para todos os componentes. Inclui helpers `fmtHour()`, `hourOf()`, `waLink()`.
- **`ToastProvider`**: Sistema de notificações temporárias (sucesso, erro, aviso) acessível via hook `useToast()`.

---

## 11. API — rotas do backend

Todas as rotas começam com `/api`.

### Auth (`/api/auth`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/register` | — | Cadastro com e-mail e senha |
| POST | `/login` | — | Login, retorna JWT |
| POST | `/google` | — | Login/cadastro via Google OAuth |
| POST | `/forgot-password` | — | Envia e-mail de redefinição de senha |
| POST | `/reset-password` | — | Redefine senha com token do e-mail |

### Usuários (`/api/users`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/me` | protect | Retorna dados do usuário logado |
| PUT | `/me` | protect | Atualiza perfil (nome, CPF, tel, etc.) |
| GET | `/` | admin | Lista todos os usuários |
| PUT | `/:id/status` | admin | Ativa/bloqueia usuário |
| PUT | `/:id/creditos` | admin | Ajusta créditos do usuário |

### Reservas (`/api/bookings`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | admin | Lista todas as reservas |
| POST | `/` | protect | Cria reserva (verifica conflito de horário) |
| GET | `/me` | protect | Lista reservas do usuário logado |
| GET | `/disponibilidade` | protect | Retorna slots disponíveis por quadra/data |
| PUT | `/:id/cancelar` | protect | Cancela reserva (respeita `cancelWindow`) |
| PUT | `/:id` | admin | Edita reserva |
| DELETE | `/:id` | admin | Remove reserva |

### Eventos (`/api/events`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | — | Lista eventos públicos |
| POST | `/` | admin | Cria evento |
| PUT | `/:id` | admin | Edita evento |
| DELETE | `/:id` | admin | Remove evento |

### Inscrições (`/api/registrations`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/` | protect | Inscreve usuário em evento |
| GET | `/me` | protect | Lista inscrições do usuário |
| GET | `/` | admin | Lista todas as inscrições |
| DELETE | `/:id` | admin | Remove inscrição |

### Ranking (`/api/ranking`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | — | Lista rankings (filtros: esporte, gênero, nível, ano, semestre) |
| POST | `/` | admin | Cria ranking |
| PUT | `/:id` | admin | Atualiza ranking (entries, etapas) |
| DELETE | `/:id` | admin | Remove ranking |

### Temporadas (`/api/seasons`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | admin | Lista temporadas |
| POST | `/` | admin | Cria temporada (gera reservas recorrentes) |
| PUT | `/:id/cancelar` | admin | Cancela temporada e todas as reservas futuras |

### Horários bloqueados (`/api/blocked-slots`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | protect | Lista bloqueios (usada ao montar a agenda) |
| POST | `/` | admin | Bloqueia horário |
| DELETE | `/:id` | admin | Remove bloqueio |

### Configurações (`/api/settings`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | — | Retorna configurações públicas da arena |
| PUT | `/` | admin | Atualiza configurações |

### Pagamentos (`/api/pagamentos`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/pix` | protect | Cria pagamento PIX, retorna QR code |
| POST | `/cartao` | protect | Cria pagamento por cartão de crédito |
| GET | `/sync` | protect | Sincroniza status de um pagamento (`?mpPaymentId=`) |
| POST | `/webhook` | — | Recebe notificações do Mercado Pago |

### SSE
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/live` | — | Server-Sent Events (keepalive do Render) |

---

## 12. Modelos do banco de dados

### User
```
nome, email (unique), senha (bcrypt), googleId,
cpf (unique sparse), nasc, tel, genero,
status (ativo/pendente/bloqueado/inativo),
creditos, admin (bool), resetToken, resetTokenExpires
```

### Booking
```
userId → User, userName, modalidade (beach-tennis/futevolei/volei/pickleball),
quadra (coberta/descoberta/areia/pickleball), quadraId,
date (YYYY-MM-DD), slots ([Number] — horas do dia, ex.: [9, 10]),
dayUse (bool), payment (pix/credito/debito/dinheiro),
total, seasonId → Season, seasonCode,
status (confirmada/cancelada/concluida), reminderSent
```

### Event
```
nome, data (YYYY-MM-DD), hora, local, vagas,
categoria (beachtennis/futevolei/volei/pickleball/taekwondo/geral),
preco, status (aberto/encerrado/breve),
nivel, desc, imagem (base64 ou URL)
```

### Registration
```
userId → User, userName,
eventId → Event, eventNome,
preco, status (confirmada/cancelada)
```
Índice único em `{ userId, eventId }` — impede dupla inscrição.

### Season
```
code (unique), userId → User, userName,
courtId, courtName, courtType, modalidade,
startDate, endDate, startHour, endHour,
slots ([Number]), recurrence { type (daily/weekly), dailyInterval, weeklyInterval, weekdays },
ignoreHolidays, payment,
grossTotal, coupon, manualDiscount, discountTotal, finalTotal,
occurrencesGenerated, conflictsCount, skippedHolidays,
bookingIds ([ObjectId]), status (active/cancelled), cancelledAt
```

### Settings
```
_id: 'global' (documento único),
arenaName, cnpj, phone, address, email,
openWeek, closeWeek, openWeekend, closeWeekend,
cancelWindow (horas), maxAdvanceDays (dias),
notifEmailConfirm, notifReminder, notifCancelAlert, notifWeeklySummary (bools),
lastWeeklySummary (data do último envio)
```

### Ranking
```
esporte (futevolei/beachtennis), genero (masculino/feminino/misto),
nivel (A/B/C/D), ano, semestre (1/2), etapas ([String]),
entries [{ pos, nome, userId, clube, pts, pontosPorEtapa, v, d, pj }]
```
Índice único em `{ esporte, genero, nivel, ano, semestre }`.

### BlockedSlot
```
quadraId, date (YYYY-MM-DD), slots ([Number]), motivo
```

---

## 13. Deploy em produção

### Backend — Render

O arquivo `render.yaml` na raiz configura o serviço. Configurações relevantes no painel do Render:

- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Variáveis de ambiente**: adicionar todas as variáveis do `backend/.env` no painel do Render (Environment → Add Environment Variable)

O Render free "dorme" após 15 min de inatividade. O `live.js` implementa SSE para o frontend manter a conexão viva. Para eliminar o cold start completamente, use o plano pago (US$ 7/mês).

### Frontend — Vercel

```bash
cd frontend
npx vercel --prod
```

Ou conectar o repositório GitHub na Vercel e configurar:

- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Variáveis de ambiente**: adicionar `VITE_MP_PUBLIC_KEY`, `VITE_GOOGLE_CLIENT_ID`, `VITE_API_URL` no painel da Vercel

### Google OAuth — origens autorizadas

No Google Cloud Console, na aplicação OAuth (`788087763759-...`), adicionar em **Origens JavaScript autorizadas**:
- `https://frontend-five-vert-72.vercel.app` (URL de produção da Vercel)
- `http://localhost:5173` (desenvolvimento)

---

## 14. Troca de ambiente (teste → produção)

Quando a conta Mercado Pago do cliente estiver verificada (identidade + telefone validados):

1. **No painel MP do cliente**: criar uma aplicação (Pagamentos online → CheckoutBricks) → copiar **Public Key** e **Access Token** de **Produção** (`APP_USR-`)
2. **No Render**: atualizar `MP_ACCESS_TOKEN` com o `APP_USR-` do cliente
3. **Na Vercel**: atualizar `VITE_MP_PUBLIC_KEY` com a Public Key `APP_USR-` do cliente
4. **Webhook**: na aplicação MP do cliente, adicionar a URL `https://<backend>.onrender.com/api/pagamentos/webhook` e copiar a assinatura secreta para `MP_WEBHOOK_SECRET` no Render
5. Fazer um **pagamento real pequeno** (PIX de R$ 1) para validar o ciclo completo

> Se a conta MP do cliente for nova, validar a identidade antes — contas novas sem verificação são bloqueadas pelo PolicyAgent do MP (mesmo com cadastro completo).

---

## 15. Dependências completas

### Backend (`backend/package.json`)

| Pacote | Versão | Para que serve |
|---|---|---|
| `express` | ^4.19.2 | Framework HTTP — roteamento, middlewares |
| `mongoose` | ^8.4.0 | ODM para MongoDB — schemas, queries, conexão |
| `bcryptjs` | ^2.4.3 | Hash de senhas (salt rounds: 10) |
| `jsonwebtoken` | ^9.0.2 | Geração e verificação de JWT |
| `dotenv` | ^16.4.5 | Carrega `.env` no `process.env` |
| `cors` | ^2.8.5 | Habilita CORS (cross-origin) no Express |
| `nodemailer` | ^9.0.1 | Envio de e-mails via SMTP (Gmail) |
| `google-auth-library` | ^10.9.0 | Verificação do token Google OAuth |
| `multer` | ^2.2.0 | Upload de arquivos (imagens de eventos) |
| `nodemon` | ^3.1.3 | (dev) Reinicia o servidor ao salvar arquivos |

### Frontend (`frontend/package.json`)

| Pacote | Versão | Para que serve |
|---|---|---|
| `react` | ^18.3.1 | Biblioteca de UI |
| `react-dom` | ^18.3.1 | Renderização no DOM |
| `react-router-dom` | ^6.24.0 | Roteamento SPA (BrowserRouter, Routes, Link) |
| `axios` | ^1.7.2 | Requisições HTTP com interceptors (token JWT) |
| `@react-oauth/google` | ^0.13.5 | Componente e hook de login com Google |
| `@mercadopago/sdk-react` | ^1.0.7 | Checkout Bricks (CardPayment, initMercadoPago) |
| `xlsx` | ^0.18.5 | Exportação de relatórios para Excel (painel admin) |
| `vite` | ^5.3.1 | (dev) Bundler + servidor de desenvolvimento |
| `@vitejs/plugin-react` | ^4.3.1 | (dev) Plugin Vite para React (Fast Refresh) |

---

> **Dúvidas de manutenção?** Os comentários no código explicam decisões não-óbvias (ex.: `sparse: true` no índice do CPF, `fixCpfIndex` no boot, `ignoreHolidays` na temporada, idempotência do cartão pelo hash do token). Para qualquer alteração nos modelos do Mongoose, atenção aos índices existentes — o Atlas não atualiza índices automaticamente, pode ser necessário dropar e recriar via script ou pelo Atlas UI.
