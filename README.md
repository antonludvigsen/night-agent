# Night Agent

Netværksapplikation til eksamensprojektet i Computernetværker og Distribuerede Systemer (BA-BINTO2067U), CBS.

En hotelgæst skriver på **SMS eller WhatsApp** om **sen ankomst** og får et svar fra **Claude Sonnet 5.5** ud fra hotellets godkendte viden. Hotellets medarbejdere bruger et **webdashboard** til at overvåge, overtage og besvare samtaler.

- Domæne: `night-agent.me` (A-record til dropletten 164.90.215.85)
- Plan: `plan.md` og `plan_netværksapplikation.md` i Exam Project-mappen

## Flow

```
Gæst ──SMS/WhatsApp──> Twilio ──HTTPS POST──> Nginx ──> Express webhook
Express ──> 200 straks + besked og job i DB (kø)
Worker ──> hotelviden fra DB ──> Claude API (HTTPS) ──> Twilio REST API ──> gæst
Twilio ──statusCallback──> Express
```

## Struktur (SoC fra Øvelse 1)

| Mappe | Indhold | Øvelse |
|---|---|---|
| `frontend/` | Dashboard: login, samtaler, én samtale, hotelviden, drift | 1, 3 |
| `backend/routes/` | Webhooks, auth, samtaler, hotelviden, health | 3, 9 |
| `backend/middleware/` | `requireUser`, `twilioSignature`, `errorHandler`, `notFound` | 3, 9, 11 |
| `backend/services/` | Twilio, AI, mail, kryptering | 4, 9, 11 |
| `backend/data/` | Database, `schema.sql`, `seed.sql` (fiktivt hotel) | 3 |
| `worker/` | Henter jobs, kalder AI, sender svar | 5 |
| `server-config/` | Nginx (reverse proxy, load balancer, TLS) og pm2 | 2, 7, 10 |
| `tests/` | Loadtest og RTT-målinger | 5, 7 |

Workeren genbruger `backend/config.js` og `backend/services/`, så alle npm-pakker ligger i `backend/node_modules`.

## Kom i gang (fase 1)

```
cd backend
npm install
cp ../.env.example ../.env   # udfyld værdierne
npm run db:init              # opretter tabeller og seed-data
npm run dev                  # web på http://localhost:3000
npm run worker               # i en ny terminal
```

## Faser

| Fase | Uge | Indhold |
|---|---|---|
| 0 | 44 | Repo, struktur, konti, domæne, seed-data |
| 1 | 45 | Kerneflow: webhook, kø, worker, AI, svar, HTTPS |
| 2 | 46 | Dashboard og mail |
| 3 | 47 | Sikkerhed (feature freeze fredag) |
| 4 | 48 | Drift, load balancing og målinger |
| 5 og 6 | 49 og 50 | Kun fejlrettelser og README |

## Regler

- `.env` ligger aldrig i repo. Kun `.env.example` med navne på nøgler.
- Kun teknologier fra øvelserne, medmindre Øvelse 8 til 11 introducerer nye.
- Alt, der bygges, skal kunne måles, optages eller vises som figur i rapporten.
