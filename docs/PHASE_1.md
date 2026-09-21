# Phase 1: Database + Authentication Foundation

Implemented:

- Multi-tenant companies
- Super admin, company admin, manager, and staff roles
- JWT login
- Password hashing with Argon2
- Current-user endpoint
- Role-based authorization dependencies
- Company-level data isolation
- Company management endpoints for super admins
- User management endpoints with role hierarchy
- Storage locations scoped to company
- Products scoped to company
- Unique SKU/barcode per company
- CORS configuration
- Development bootstrap admin

## API flow

1. `POST /api/auth/login` with email/password.
2. API returns a JWT bearer token.
3. Send `Authorization: Bearer <token>` on protected requests.
4. FastAPI resolves the current user and checks their role.
5. Company users are automatically restricted to their own `company_id`.

## Development bootstrap

Run `python seed.py` from `backend` once. It creates:

- Email: `admin@example.com`
- Password: `ChangeMe123!`
- Role: `super_admin`

Change this password before using the application outside local development.
