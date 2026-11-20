# Store Stock Management System (SSMS)

Laravel 11 API + React (Vite, TypeScript, Tailwind v4) front end, built from your Figma Make design
and your Role Permissions / ER-diagram documents.

```
ssms/
├── backend/    Laravel app code (overlay) + setup.sh that builds the full project
└── frontend/   React app (your Figma screens, wired to the API)
```

## 1. Run it

**Requirements:** PHP 8.2+, Composer, Node 20+. (SQLite is the default DB, so nothing else is needed to try it.)

```bash
# API  -> http://localhost:8000
cd backend
./setup.sh                      # creates ../ssms-api, installs Sanctum + DomPDF, migrates, seeds
cd ../ssms-api && php artisan serve

# Front end -> http://localhost:5173   (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Run the API tests with `php artisan test` inside `ssms-api`.

### Stock catalogue and demo accounts

The real stock-item catalogue is seeded from `database/seeders/data/stock_items.csv` in every environment.
It adds item definitions and minimum-stock levels only; receive stock batches before issuing items.
Demo accounts below are local only and come from the Figma mock data.

| Role | Username | Password |
|---|---|---|
| District Head (any of the 24, e.g. Colombo) | `colombo.head`, `kandy.head`, `galle.head`, … | `dist123` |
| Department Head (e.g. IT) | `it.head`, `finance.head`, `admin.head`, … | `dept123` |
| Head of District Coordinator | `coordinator` | `coord123` |
| Head of Accounts | `accounts` | `acc123` |
| Store Officer | `store` | `store123` |
| Admin | `admin` | `ChangeMe#12345` (`ADMIN_PASSWORD` in `.env`) |

Sign in as `colombo.head` to raise a request, then sign in as `coordinator` → `accounts` → `store` to follow the
approval flow. Receive stock batches before issuing items; no sample stock, batches, or requests are seeded.
If an existing local database has stale demo credentials, run `php artisan db:seed` from `ssms-api` to refresh them.
`VITE_SHOW_DEMO` only displays the sign-in buttons; demo users are seeded by the API only in local environments
or when `SEED_DEMO=true`.

### Using MySQL instead of SQLite
In `ssms-api/.env`:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ssms
DB_USERNAME=root
DB_PASSWORD=
```
Create the `ssms` database, then `php artisan migrate:fresh --seed`.

## 2. How the rules are implemented

**Approval chain** (`app/Services/RequestWorkflow.php`)
- District request: `pending → coord_approved → accounts_approved → issued`
- Department request: `pending → accounts_approved → issued`
- Any acting step can reject. Each step is stored in `request_approvals`.
- Who may act is decided on the server from permissions (`approve_coordinator`, `approve_accounts`, `issue_stock`) and
  the request's current status. The API sends a `canAct` flag; the UI just obeys it.

**Own department / district only**
- A District Head's account is tied to one district, a Department Head's to one department. The request's
  organisation is taken from the account, never from the form, so nobody can request for another district.
- Requesters can only list/open their own organisation's requests; the Coordinator only sees district requests.

**FIFO** (`RequestWorkflow::issue`)
- On issue, each requested item drains its oldest batch first (`received_date`, then `id`), moves to the next batch
  when one runs out, and records every draw in `stock_issues` and the `stock_transactions` ledger.
- Runs inside one DB transaction with row locks; if any item is short, **nothing** is issued (422 with a clear message).

**Permissions** are data (`roles`, `permissions`, `permission_role`) seeded in `database/seeders/BaseSeeder.php`
from your Role Permissions document. Routes are guarded by `permission:` middleware, and the React sidebar/buttons
are driven by the permission list returned from `/api/me`.

## 2b. Passwords: sign in, forgot, reset, change

- **Forgot password** (sign-in page → "Forgot password?"): enter a username or email. If the account has an email,
  a link `…/?reset=<token>` is sent. The link works **once** and expires after 60 minutes
  (`RESET_LINK_MINUTES`); asking again cancels the older link. The page gives the same answer whether or not the account
  exists, so it can't be used to find usernames. Only a hash of the token is stored.
- **Reset**: opening the link shows "Choose a new password" (min 8 characters, typed twice). On success every
  existing session for that user is signed out.
- **Change password** (sidebar → "Change Password"): needs the current password; other devices are signed out.
- **Admin reset**: Users page → "Reset password" (for people with no email on file).
- **Mail in development**: `MAIL_MAILER=log` is Laravel's default, so no mail server is needed. In local mode the
  "Forgot password" page shows the reset link on screen, and it is also written to `ssms-api/storage/logs/laravel.log`.
- **Mail in production**: set `MAIL_MAILER=smtp` with `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`,
  `MAIL_FROM_ADDRESS` in `.env`, set `FRONTEND_URL` to the public address of the website, and give users an email
  address in the Users page. The on-screen dev link is never shown outside local mode.

## 2c. Create account (account requests)

- On the sign-in page click **Request one** (or open `/?register=1`). Fields: full name, employee ID, official email,
  username, role, district (District Heads) or department (Department Heads), password typed twice.
- The account is saved as **Pending** and cannot sign in. Trying to sign in shows
  "Your account request is waiting for administrator approval."
- Every admin gets a notification. In **Users**, pending requests are listed first with **Approve** / **Reject**.
  Use **Edit** first if the requested role or organisation needs correcting. Approving emails the person (if mail is set up).
- The Admin role can never be requested. Admins are only created by another admin.
- The form is rate-limited (5 per minute per IP). Username and email must be unique.

## 3. Where this differs from the Figma prototype (and why)

| Figma prototype | This build |
|---|---|
| Store Officer manages items, departments, districts | Follows your **Role Permissions** document: Items → Admin + Accounts; Receive stock → Admin + Store Officer; Departments/Districts → Admin. Change who can do what in `BaseSeeder::ROLES`. |
| No Admin role | Admin added (Users, Departments, Districts, Settings, read-only oversight). |
| Create-account page that signs you straight in | Kept, but it only **requests** an account: the new user is locked until an Admin approves it (section 2c). Otherwise anyone could register as Store Officer or Head of Accounts. The password reset is real: emailed single-use link (section 2b). |
| Request has items inside it | Real `stock_request_items` table (the earlier ER diagram had one item per request). |
| PDFs built in the browser | Built on the server with DomPDF so numbers come from the database. |
| Browser state only | Real database, bearer-token login (Sanctum, 8 h expiry), notifications, system settings. |

"Download PDF Reports" is not a separate permission: a report can be downloaded by whoever may generate it
(`generate_stock_report`, `generate_annual_report`).

## 4. API summary (all under `/api`, Bearer token)

| | |
|---|---|
| `POST /login`, `POST /logout`, `GET /me` | Auth |
| `GET /items`, `/categories`, `/departments`, `/districts`, `/dashboard`, `/notifications` | Any signed-in user |
| `POST/PUT/DELETE /items`, `POST /categories` | `manage_items` / `manage_item_categories` |
| `POST /items/{id}/batches` | `receive_stock` |
| `GET /requests`, `GET /requests/{id}`, `POST /requests` | scoped by role; create needs `create_request` |
| `POST /requests/{id}/approve`, `/reject` | `approve_coordinator`, `approve_accounts`, `issue_stock` |
| `GET /transactions` | `view_transactions` |
| `GET /reports/current-stock`, `/reports/annual?year=` | PDF; `generate_stock_report` / `generate_annual_report` |
| `GET /register/options`, `POST /register`, `POST /forgot-password`, `POST /reset-password` | Public (rate-limited) |
| `POST /change-password` | Any signed-in user |
| `/users`, `/users/{id}/approve`, `/reject`, `/roles`, `/settings`, `POST/PUT/DELETE /departments`, `/districts` | Admin |

## 5. Before real use

- `APP_ENV=production`, `APP_DEBUG=false`, and `SEED_DEMO=false` (no demo users/passwords).
- Set a strong `ADMIN_PASSWORD` **before** the first seed, then create real accounts in the Users page.
- Serve over HTTPS; set `CORS_ALLOWED_ORIGINS` and the front end's `VITE_API_URL` if they are on different hosts.
- `npm run build` for the front end; serve `dist/` from any web server.
- Back up the database; stock history lives in `stock_batches`, `stock_issues` and `stock_transactions`.

## 6. What has and hasn't been verified

- **Front end:** type-checked (against React type stubs) and every page was rendered with sample data without errors.
  I could not run `npm install`/`vite build` or click through it in a browser.
- **Back end:** written for Laravel 11 but **never executed** — no PHP/Composer was available where it was written.
  `php artisan test` (20 feature tests covering the approval chain, FIFO across batches, rollback on short stock,
  visibility rules, the forgot/reset/change-password flow, and account requests with admin approval) is the first thing to run; expect to fix the odd small error on first boot.
- Not built: Districts editing screen (read-only, as in Figma), email/SMS notifications (in-app only).
