# Barangay Information Management System (BIMS)

## Subsystem 1: Resident Information Management

Tech stack:
- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- MySQL
- mysql2
- bcrypt
- multer
- express-session

## 1. Requirements

Install:
- Node.js LTS
- MySQL Server
- VS Code

## 2. Create the database

Open MySQL Workbench or the MySQL command line and run:

```sql
SOURCE database/bims.sql;
```

Or open `database/bims.sql` and execute it.

For an existing database created before admin account profile editing was added, run
`database/admin_profile_migration.sql` once to add the admin address and contact fields.

For an existing database, first run `database/normalization_migration.sql` if it has
not already been applied, then run `database/resident_registration_overhaul_migration.sql`
once. Before the registration migration, resolve duplicate resident contact numbers
(the migration includes a query to find them). Fresh databases already include the
updated resident-registration schema.

## 3. Configure environment variables

Copy `.env.example` to `.env`:

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bims
SESSION_SECRET=use-a-long-random-secret
```

## 4. Install dependencies

```bash
npm install
```

## 5. Create the first admin account

After the database is created:

```bash
npm run create-admin
```

Follow the prompts. Admin accounts are intentionally created from the admin-side setup rather than from the public resident registration page.

## 6. Start the server

Development:

```bash
npm run dev
```

Normal:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Live Server can preview the static frontend because the workspace config points
its root to `frontend/`. However, Live Server does not run the Express API, so
login, registration, and data-backed features require `npm run dev` or `npm start`
and the app at `http://localhost:3000`.

## Current Subsystem 1 features

### Public / Resident side
- Landing page
- Six-step resident registration with personal, contact, permanent/present address,
  household, account, and review sections
- Resident login using a unique Philippine mobile number as the username
- Optional email and preferred notification method
- Required proof-of-residency upload (JPG, PNG, or PDF, up to 5 MB), stored in MySQL
- Private proof-document download for the resident and authorized admins
- Resident dashboard
- View own resident profile
- View household information
- Logout

### Admin side
- Separate admin login
- Admin dashboard
- Resident Management
- Search residents by name, ID, address, or contact number
- Select a resident and view details
- View household members
- Update resident information
- Admin account management page
- Create additional admin/staff accounts

## Important architecture rule

Residents and admins are separate account types:

```text
resident_users -> resident_profiles -> households
                   -> resident_proof_documents
admin_users
```

Admin authentication is outside the Resident Portal.

## Notes

This is a development/academic starter. Before production deployment, add a persistent session store, HTTPS, CSRF protection, rate limiting, audit logging, stronger validation, and a formal authorization policy.

## Subsystem 2: Barangay Services and Request Management

Subsystem 2 adds resident document/service requests and separate admin processing.

### Resident Portal
- Submit a request for a barangay document/service.
- Select document type, purpose, copies, and payment method.
- Receive a generated tracking number.
- View all submitted requests.
- Search/track a request by tracking number.
- View status history.
- Receive notifications when an admin changes request status.

### Admin Portal
- View all resident requests.
- Search by tracking number or resident name.
- Filter requests by status.
- View resident/request details.
- Update request status and payment status.
- Add processing remarks.
- Status changes are recorded in a history table and create a resident notification.
- View monthly resident registrations, service requests, and community concerns
  for the last 12 months in the admin Analytics page, including month-over-month
  comparisons and the most requested service for the current month.

### Request status flow
`Pending -> Processing -> Ready for Pickup -> Completed`

Other terminal statuses available to staff are `Rejected` and `Cancelled`.

### Database setup
At the Terminal in VSC:
First, run `database/bims.sql`
Second, run `database/subsystem2.sql`
Lastly, run `database/subsystem3.sql`

For existing databases, apply the migrations in section 2 in order. See
`DATABASE_NORMALIZATION_REVIEW.txt` for the normalization review and
`RESIDENT_REGISTRATION_OVERHAUL.txt` for registration details.

### Database diagrams
See `docs/BIMS_DATABASE_DIAGRAMS.md` for:
- The complete database ERD
- An individual ERD for each of the 12 tables
- A data/process flowchart for each table
