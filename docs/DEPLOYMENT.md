# Deployment Guide — Render + Vercel

This deploys the app so it's reachable at a public URL for a supervisor demo.
It is **not** a production hardening guide — see `README.md` for what's still
missing before real production use.

Target setup:
- Frontend (React/Vite) → **Vercel**
- Backend (FastAPI) → **Render Web Service**
- Database → **Render PostgreSQL**
- Redis → **Render Key Value** (optional — the app doesn't use Redis yet)

You'll need a GitHub account, a Render account, and a Vercel account. Nothing
below deploys anything automatically — every step is something you click or
type yourself.

---

## Part 1 — Push the project to GitHub

From the project root (`inventory_management_system_starter/inventory_app`):

```bash
git init
git add .
git commit -m "Initial commit"
```

Before pushing, sanity-check that nothing huge or secret got staged:

```bash
git status
```

You should **not** see `backend/venv`, `frontend/node_modules`, `backend/.env`,
or `backend/uploads` in the list — they're excluded by `.gitignore`.

Then on github.com: **New repository** → give it a name → do **not** check
"Add a README" (you already have one) → **Create repository**. GitHub will
show you commands like these — run them:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

---

## Part 2 — Render: PostgreSQL database

1. render.com → **Dashboard → New + → PostgreSQL**
2. Name it (e.g. `inventory-db`), pick a region, Free/Starter plan is fine for a demo.
3. **Create Database**, wait until status is "Available."
4. Open it and copy the **Internal Database URL**. It looks like:
   ```
   postgresql://inventory_user:somepassword@dpg-xxxxx/inventory_db
   ```

You can paste this URL in as-is — the backend automatically rewrites
`postgres://` / `postgresql://` to `postgresql+psycopg://` at startup (our
driver, `psycopg` v3, needs that exact prefix, but you don't have to edit
the URL by hand). Keep it — you'll paste it into `DATABASE_URL` in Part 4.

---

## Part 3 — Render: Key Value (Redis) — optional

The app doesn't call Redis anywhere yet (it's reserved for a future
real-time feature), so this step is entirely optional and the demo works
without it.

If you want it ready anyway: **Dashboard → New + → Key Value**, same region
as the database, **Create**, then copy its connection string for Part 4.

---

## Part 4 — Render: Backend web service

1. **Dashboard → New + → Web Service**, connect GitHub, pick your repo.
2. Settings:
   - **Name**: e.g. `inventory-backend`
   - **Region**: same as your database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python seed.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health` (optional but recommended)
   - **Instance Type**: Free
3. **Environment Variables** — add each of these:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Internal Database URL from Part 2, pasted as-is |
   | `SECRET_KEY` | a random string — generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
   | `CORS_ORIGINS` | your Vercel URL, e.g. `https://your-app.vercel.app` — you won't have this until Part 6, so put a placeholder like `https://placeholder.vercel.app` now and fix it in Part 7 |
   | `SEED_ADMIN_EMAIL` | an email you choose — don't leave this as `admin@example.com` for anything a supervisor can reach |
   | `SEED_ADMIN_PASSWORD` | a real password you choose |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` (optional, this is already the default) |
   | `REDIS_URL` | the Key Value connection string from Part 3 (optional) |
   | `UPLOAD_DIR` | `uploads` (optional, this is already the default) |
   | `PYTHON_VERSION` | `3.12.7` (optional — only needed if the default build fails) |

4. **Create Web Service**. Watch the **Logs** tab while it builds and starts.
5. Your backend URL will be something like `https://inventory-backend.onrender.com`.
6. Test it:
   - `https://inventory-backend.onrender.com/health` → should show `{"status":"ok"}`
   - `https://inventory-backend.onrender.com/docs` → interactive API docs

**Two things to know about Render's free plan:**
- The service "spins down" after 15 minutes of no traffic and takes
  30–60 seconds to wake up on the next request. Warn your supervisor the
  first click after idle time may be slow.
- The disk is **not persistent**. Any product/warehouse images uploaded
  through the app will be deleted whenever the service restarts or
  redeploys. Fine for a short demo. If you need uploaded images to survive,
  add a Render **Persistent Disk** (paid) mounted at, say, `/var/data/uploads`,
  and set `UPLOAD_DIR=/var/data/uploads`.

---

## Part 5 — Database schema (no manual migration needed)

You do not need to run any SQL or migration commands by hand. On a **fresh**
database:
- The backend creates every table automatically the first time it starts
  (`Base.metadata.create_all`, runs on import).
- The Start Command above also runs `python seed.py`, which creates your
  `super_admin` account using `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

Both are safe to run on every restart — they only create what's missing and
never touch existing data.

---

## Part 6 — Vercel: Frontend

1. vercel.com → **Add New → Project**, import the same GitHub repo.
2. Configure Project:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: click Edit → select `frontend`
   - **Build Command**: `npm run build` (default, leave as-is)
   - **Output Directory**: `dist` (default, leave as-is)
3. **Environment Variables**:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | your Render backend URL from Part 4, e.g. `https://inventory-backend.onrender.com` (no trailing slash, no `/api`) |
4. **Deploy**.
5. Vercel gives you a URL like `https://inventory-app-yourname.vercel.app` —
   this is the link for your supervisor.

---

## Part 7 — Connect the two (CORS)

Go back to **Render → your backend service → Environment**, edit
`CORS_ORIGINS` to your real Vercel URL from Part 6:

```
CORS_ORIGINS=https://inventory-app-yourname.vercel.app
```

Save — Render redeploys automatically. If you also want to keep using your
local frontend against the deployed backend, use a comma-separated list:

```
CORS_ORIGINS=https://inventory-app-yourname.vercel.app,http://localhost:5173
```

---

## Part 8 — Final check

1. Open your Vercel URL.
2. Log in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
3. Create a company, a company admin, a warehouse, a product, try stock
   in/out and a transfer — confirm it all works against the deployed backend.

---

## Environment variable summary

**Backend (Render):**

| Variable | Required | Example |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql+psycopg://user:pass@host/db` |
| `SECRET_KEY` | yes | (random string) |
| `CORS_ORIGINS` | yes | `https://your-app.vercel.app` |
| `SEED_ADMIN_EMAIL` | recommended | `you@yourcompany.com` |
| `SEED_ADMIN_PASSWORD` | recommended | a real password |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no | `30` |
| `REDIS_URL` | no | (Render Key Value URL) |
| `UPLOAD_DIR` | no | `uploads` |
| `PYTHON_VERSION` | no | `3.12.7` |

**Frontend (Vercel):**

| Variable | Required | Example |
|---|---|---|
| `VITE_API_URL` | yes | `https://your-backend.onrender.com` |

---

## Ongoing workflow

Both Render and Vercel are connected to your GitHub repo, so pushing new
commits to `main` triggers an automatic redeploy on both — no manual
redeploy steps needed after this initial setup.

## Local development is unaffected

None of this changes how you run the app locally: `docker compose up -d`,
then the backend and frontend exactly as in the main `README.md`. Every new
setting has a default that matches your current local setup, so `backend/.env`
and running without any frontend `.env` file both keep working exactly as
before.
