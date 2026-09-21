# Inventory Management System Architecture

## Stack
- Frontend: React + TypeScript
- Backend: Python + FastAPI
- Database: PostgreSQL
- Real-time/cache layer: Redis (later phase)
- Deployment: Docker

## Multi-tenant hierarchy
- Super Admin: application owner; can create companies and manage all tenants.
- Company Admin: company owner/admin; manages managers and staff inside one company.
- Manager: manages staff and inventory operations inside one company.
- Staff: day-to-day inventory user.

Every company-owned record carries `company_id`. API queries must always scope company data to the authenticated user's company.

## Current request flow
Browser/Desktop UI -> FastAPI -> authorization -> PostgreSQL

Later for real-time updates:
External events / inventory changes -> FastAPI -> Redis -> WebSocket -> connected clients
