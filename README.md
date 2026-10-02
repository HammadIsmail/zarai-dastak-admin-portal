# Zarai Dastak Admin Portal

Modern, responsive web application for Zarai Dastak Admin, built with **Vite**, **HTMX 4**, **Alpine.js**, and **Tailwind CSS (shadcn UI design system)**, backed by a FastAPI admin module and Neo4j database.

---

## Technology Stack

- **Framework & Bundler:** [Vite](https://vitejs.dev/)
- **Dynamic Partial Updates:** [HTMX 4.0.0](https://htmx.org/)
  - Native `fetch()` engine (replacing XMLHttpRequest)
  - Built-in Idiomorph morphing (`hx-swap="morph"`)
  - Standardized lifecycle events (`htmx:phase:action`)
  - Explicit attribute inheritance support
- **Client Reactivity & State:** [Alpine.js](https://alpinejs.dev/)
- **Styling & Components:** [Tailwind CSS](https://tailwindcss.com/) with **shadcn UI** tokens
- **Icons:** [Lucide Icons](https://lucide.dev/) (no emojis)
- **Charts:** [ApexCharts](https://apexcharts.com/) (dark-mode styled)
- **Backend:** FastAPI `backend/app/admin/` module mounted at `/api/admin`

---

## Features Converted from Legacy Streamlit

| Feature | Description |
| :--- | :--- |
| **Authentication** | JWT-based auth with username/email login, admin signup with setup code (`haulistry-setup-2025`), Firebase Auth fallback, and session security. |
| **Dashboard** | KPI summary cards (Users, Providers, Seekers, Verifications, Bookings, Completed, Revenue, Take Rate), trend period selector (7d, 14d, 30d, 60d, 90d), 4 interactive charts, and live activity feed. |
| **Verifications** | Pending provider application queue, applicant dossier, document preview lightbox (CNIC Front/Back, Driving License, Vehicle image), 1-click Approve with push notification, Reject modal with custom reason, and post-verification vehicle additions monitor. |
| **Providers** | Search, filter by verification and active status, full operator drawer with performance KPIs (completed/cancelled jobs, gross earnings, review rating), vehicles list, and cascade deletion. |
| **Seekers** | Customer directory with search, active/inactive filters, status toggle, and account deletion. |
| **Services Catalogue** | Listing of all machinery and towing services, category breakdown chart, base/per-km/per-hour pricing, and active status toggle. |
| **Fleet Registry** | Fleet management with search by license plate, vehicle model, type filter, availability filter, and verification state. |
| **Bookings** | Live tracker with status filter tabs (pending, accepted, active, in_progress, completed, cancelled, rejected), booking detail modal, and administrative cancellation. |
| **Transactions & Earnings** | Financial overview (gross revenue, 10% platform fee, 90% net provider payouts), daily revenue timeline, completed booking ledger, and provider earnings breakdown with monthly trend charts. |
| **Analytics** | Deep-dive reports with booking timelines, status donut distribution, category volume share, and top-performing providers. |
| **Notifications** | Push notification log, filter by category/read state, and custom push notification dispatcher modal. |
| **Complaints & Disputes** | Filtered review queue for low-rated reviews (≤ 2 stars) with comments and reviewer metadata, plus cancelled and rejected bookings trackers. |
| **Audit Logs** | Immutable platform activity stream with event categorization and limit selectors. |
| **Admin Accounts & Settings** | Admin user management (activate, deactivate, delete with safety checks), profile details, and password update form. |

---

## Key Differences in HTMX 4

1. **Native `fetch()` API Engine:**
   - HTMX 4 drops `XMLHttpRequest` in favor of standard `fetch()`, enabling native response streaming, smaller bundle sizes, and clean promise chains.
2. **Built-in Morphing (`Idiomorph`):**
   - No external extension required. `hx-swap="morph"` is native to HTMX 4, preventing loss of input focus or scroll position during live DOM swaps.
3. **Standardized Event Naming:**
   - Events now follow the `htmx:phase:action` naming convention (e.g. `htmx:config:request`, `htmx:after:swap`).
4. **Explicit Attribute Inheritance:**
   - In HTMX 4, attributes no longer automatically inherit down the DOM tree unless specified via `:inherited` or configured with `htmx.config.implicitInheritance = true`.
5. **Default Response Swapping:**
   - Swaps all HTTP responses (including 4xx and 5xx error responses) into the target element by default.

---

## Running the Application

### 1. Start the FastAPI Backend
```powershell
cd c:\Users\ranah\Desktop\FYP\Haulistry-App\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:combined_app --host 0.0.0.0 --port 4000 --reload
```

### 2. Start the Vite Admin Portal
```powershell
cd c:\Users\ranah\Desktop\FYP\Haulistry-App\admin_portal
npm run dev
```

The portal will be live at:
**http://localhost:5173**

### Default Admin Credentials
- **Username:** `admin`
- **Password:** `admin123` or `AdminPassword123!`
- **Setup Code (for new admins):** `haulistry-setup-2025`
