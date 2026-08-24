# XtraHome

Personlig hem-dashboard för varje familjemedlem. Separat från XtraCash.

Varje inloggning öppnar **det rummet** som tillhör användaren: TV, musik, ljus och veckolarm. Kommandon går till `n8n`, som styr Home Assistant och Telegram.

## Stack

- Next.js (App Router)
- NextAuth
- Prisma + PostgreSQL (egen Neon-databas, inte XtraCash)
- GitHub Actions för minut-cron (Hobby på Vercel tillåter bara daglig cron)

## Kom igång

1. Skapa ett **nytt** Neon-projekt (inte samma databas som XtraCash).
2. Kopiera `.env.example` till `.env`.
3. Klistra in **Direct connection**-strängen från Neon i `DATABASE_URL` (utan `-pooler`, med `sslmode=require` och `connect_timeout=15`).
4. Om `npx prisma db push` från din PC ger P1001 (port 5432 blockeras ofta hemma):
   pusha koden till GitHub och kör workflowen **Database Sync** i stället. Den gör `db push` + seed från GitHubs servrar, precis som XtraCash.

Standardlösenord efter seed: `xtrahome123`

Användare: Anders, Sandra, Alexander, William, Oliver, Benjamin.

## Databas via GitHub (rekommenderat)

1. Lägg `DATABASE_URL` som GitHub Secret (Direct connection från Neon).
2. Actions → **Database Sync** → Run workflow.
3. Kryssa i **Kör seed efter db push** första gången.

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

3. Deploy.
4. Lägg även i **GitHub Secrets**: `APP_BASE_URL`, `CRON_SECRET` (samma som Vercel).
   Om Vercel Deployment Protection är på: lägg `VERCEL_BYPASS_TOKEN`.
5. Workflowen **Run Alarms** anropar `/api/cron/run-alarms` varje minut från GitHub
   (Hobby på Vercel klarar bara en cron per dygn).

## n8n

Webhooken tar emot två event:

- `home.command` när någon trycker TV/musik/ljus
- `alarm.triggered` när ett veckolarm går

Verifiera header `x-xtrahome-signature` med HMAC-SHA256 av hela body och `N8N_WEBHOOK_SECRET`.
