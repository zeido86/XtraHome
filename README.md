# XtraHome

Personlig hem-dashboard för varje familjemedlem. Separat från XtraCash.

Varje inloggning öppnar **det rummet** som tillhör användaren: TV, musik, ljus och veckolarm. Kommandon går till `n8n`, som styr Home Assistant och Telegram.

## Stack

- Next.js (App Router)
- NextAuth
- Prisma + PostgreSQL (egen Neon-databas, inte XtraCash)
- Vercel Cron för veckolarm

## Kom igång

1. Skapa ett **nytt** Neon-projekt (inte samma databas som XtraCash).
2. Kopiera `.env.example` till `.env`.
3. Klistra in **Direct connection**-strängen från Neon i `DATABASE_URL` (utan `-pooler`, med `sslmode=require` och `connect_timeout=15`).
4. Kör:

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Standardlösenord efter seed: `xtrahome123`

Användare: Anders, Sandra, Alexander, William, Oliver, Benjamin.

## Vercel

1. Skapa ett nytt Vercel-projekt från detta repo.
2. Sätt env:

```
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
CRON_SECRET
APP_BASE_URL
N8N_HOME_WEBHOOK_URL
N8N_WEBHOOK_SECRET
```

3. Deploy. Cron anropar `/api/cron/run-alarms` varje minut (kräver Vercel Pro för minut-precision).

## n8n

Webhooken tar emot två event:

- `home.command` när någon trycker TV/musik/ljus
- `alarm.triggered` när ett veckolarm går

Verifiera header `x-xtrahome-signature` med HMAC-SHA256 av hela body och `N8N_WEBHOOK_SECRET`.
