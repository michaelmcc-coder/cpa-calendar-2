# CPA Staff Calendar

A deploy-ready Next.js app for a CPA faculty office screen. It includes:

- Full-screen staff deadline dashboard
- Large fonts and countdowns
- Urgency colour coding
- Admin PIN screen
- Add, edit and delete reminders
- Paste weekly SLT email text and extract likely deadline lines
- Auto-refresh every minute
- Local browser storage MVP
- API route placeholders for Google Sheets / Microsoft Graph integration

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

Default admin PIN is `2468`. Change `NEXT_PUBLIC_ADMIN_PIN` in `.env.local` or in Vercel environment variables.

## Deploy on Vercel

1. Upload this project to GitHub.
2. In Vercel, click Add New Project > Import Git Repository.
3. Add environment variable `NEXT_PUBLIC_ADMIN_PIN`.
4. Click Deploy.
5. Open the deployment URL on the office screen and press F11 for fullscreen.

## Production notes

The current version stores reminders in the browser so it is ideal for the first MVP. For multi-user editing and persistent central storage, connect the `/api/reminders` route to Google Sheets, Supabase, Airtable, or a school-approved database.
