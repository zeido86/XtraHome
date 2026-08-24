# XtraHome

Personlig hem-dashboard för varje familjemedlem. Separat från XtraCash.

Varje inloggning öppnar **det rummet** som tillhör användaren: TV, musik, ljus och veckolarm. Live-knappar går till `n8n`. Veckolarm sparas i Neon och **n8n läser databasen varje minut**.

## Stack

- Next.js (App Router)
- NextAuth
- Prisma + PostgreSQL (egen Neon-databas, inte XtraCash)
- n8n läser förfallna larm från databasen varje minut

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

3. Deploy. Ingen minut-cron behövs på Vercel.

## n8n

### Live-knappar
`home.command` skickas när någon trycker TV/musik/ljus.
Verifiera header `x-xtrahome-signature` med HMAC-SHA256 av hela body och `N8N_WEBHOOK_SECRET`.

### Veckolarm (polla databasen)
n8n Schedule **varje minut**:

1. HTTP GET `https://DIN-APP/api/alarms/due`  
   Header: `Authorization: Bearer N8N_WEBHOOK_SECRET`  
   (samma secret som i Vercel)
2. Om `alarms` är tomt: stoppa.
3. För varje larm: kör `routineSteps` mot Home Assistant / Telegram.
4. HTTP POST `https://DIN-APP/api/alarms/due`  
   Body: `{ "executionId": "...", "status": "SENT" }`  
   eller `"FAILED"` plus `errorMessage` om något gick fel.

GET läser Neon och lämnar bara larm vars tid är **den här minuten** och som inte redan körts.
