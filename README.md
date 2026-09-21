# Inventory Management System

Multi-tenant inventory/storage management application.

## Local development

### 1. Start infrastructure
From the project root:

```powershell
docker compose up -d
```

### 2. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` from `.env.example` and set `SECRET_KEY`.

Start the API:

```powershell
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

### 3. Create development super admin
In another terminal, with the backend virtual environment active:

```powershell
cd backend
python seed.py
```

Development credentials:
- Email: `admin@example.com`
- Password: `ChangeMe123!`

Change this password before any real deployment.

### 4. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Deployment
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the step-by-step guide to deploying the frontend to Vercel and the backend + PostgreSQL (+ optional Redis) to Render.

## Important
This is a development foundation. Before production we will add Alembic migrations, stronger secret management, audit logging, stock movement transactions, automated tests, rate limiting, WebSockets/Redis, and production deployment configuration.

## Phase 1 complete

The current foundation includes authentication, role hierarchy, tenant isolation, company/user management, locations, and protected product endpoints. Use `/docs` to exercise the API.
