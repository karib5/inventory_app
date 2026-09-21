# Database Foundation

## Tables

### companies
Stores each customer/company using the platform.

### users
Stores users and their role. Super admins have a null `company_id`; company users belong to exactly one company.

### locations
Storage locations belonging to a company. Location codes are unique per company.

### products
Inventory items belonging to a company and optionally assigned to a location. SKU and barcode are unique within a company.

## Security rule
A company user must never be able to read or modify another company's rows. Every company-scoped query must filter by the authenticated user's `company_id`.
