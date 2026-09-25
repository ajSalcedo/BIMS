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

## Current Subsystem 1 features

### Public / Resident side
- Landing page
- Resident registration
- Resident login
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
admin_users
```

Admin authentication is outside the Resident Portal.

## Notes

This is a development/academic starter. Before production deployment, add a persistent session store, HTTPS, CSRF protection, rate limiting, audit logging, stronger validation, and a formal authorization policy.
