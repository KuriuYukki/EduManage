# 🎓 EduManage — Student Management System

A fully functional, frontend-only university management platform built with
**pure HTML5, CSS3 and vanilla JavaScript** — no frameworks, no build step,
no backend, no installs. Designed as a university project demo that runs
directly from `index.html` via VS Code Live Server.

---

## 1. Purpose

EduManage simulates a real university administration system: managing
students, teachers, courses, enrollments, grades, attendance, rankings and
notifications, with role-based access for **Admin**, **Teacher** and
**Student** users, full English/Russian localization, and light/dark themes.

---

## 2. Technologies

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, flexbox, grid, keyframe animations) |
| Logic | Vanilla JavaScript (ES6+, no frameworks, no libraries) |
| Data (design) | SQL (`database.sql`) — the official relational schema |
| Data (runtime demo) | Browser `localStorage`, wrapped by `StorageManager` |
| Charts | Hand-built SVG / CSS bar & donut charts (no chart libraries) |

No npm, no bundler, no external CDN dependency is required to run the app.

---

## 3. How localStorage Works Here

Because the project must run from a single `index.html` with **no backend**,
`js/storage.js` implements a small **data-access layer** (`StorageManager`)
that reads and writes JSON collections in `localStorage`, mimicking database
tables: `students`, `teachers`, `courses`, `enrollments`, `grades`,
`attendance`, `notifications`, `users`.

- On first load, `StorageManager.seedData()` populates realistic sample data
  (20 students, 8 teachers, 10 courses, 50+ enrollments, 100+ grades, 200+
  attendance records, 10+ notifications) **once**, and never overwrites
  existing data on subsequent visits.
- `Settings → Data → Reset Demo Data` lets you wipe and re-seed at any time.
- `Settings → Data → Export All Data` downloads everything as CSV or JSON.

`database.sql` is the **authoritative relational design** — it documents
exactly how the same data would live in a real SQL database (MySQL /
PostgreSQL compatible), with primary keys, foreign keys, `UNIQUE`
constraints (e.g. no duplicate enrollment, no duplicate attendance record
for the same student/course/date), `CHECK` constraints (e.g. grade between
0 and 20) and sample `INSERT` statements. In a production deployment, the
same `StorageManager` interface could be re-implemented to call a real API
backed by this schema, without any changes needed to the UI code.

---

## 4. Project Structure

```
/
├── index.html            ← the ONLY file you open — SPA shell
├── database.sql          ← official relational schema + sample data
├── README.md
│
├── css/
│   ├── main.css           (design tokens, layout, shared components)
│   ├── login.css
│   ├── dashboard.css
│   ├── students.css
│   ├── teachers.css
│   ├── courses.css
│   ├── grades.css
│   ├── attendance.css
│   └── animations.css
│
├── js/
│   ├── i18n.js             English / Russian translations
│   ├── storage.js          localStorage data-access layer + seed data
│   ├── utils.js             toasts, modals, CSV/JSON export, validation helpers
│   ├── auth.js              login/logout/session/role permissions
│   ├── theme.js             dark/light mode
│   ├── dashboard.js         dashboard stats + charts
│   ├── students.js          student CRUD, search/filter/sort, profile page
│   ├── teachers.js          teacher CRUD
│   ├── courses.js           course CRUD + student-to-course assignment
│   ├── grades.js            grade CRUD, average calculation, ranking
│   ├── attendance.js        attendance CRUD + statistics
│   ├── notifications.js     notification center
│   ├── export.js            global data export + settings page
│   └── app.js                application shell, router, navigation (loads last)
│
└── assets/icons/           (icons are inline SVG in app.js; folder kept for future assets)
```

### Why no separate `/pages/*.html` fragments?

The spec allows a fallback: under `file://` or some Live Server setups,
`fetch()`-ing local HTML fragments can be unreliable (CORS/mixed content
quirks). EduManage therefore uses **JavaScript template functions** that
render each view directly into `#main-content` — a standard, reliable
SPA pattern that guarantees `index.html` is the only file you ever open,
with instant, no-reload navigation via `location.hash`.

---

## 5. How to Run

1. Open the project folder in **VS Code**.
2. Install/enable the **Live Server** extension (if not already installed).
3. Right-click `index.html` → **"Open with Live Server"**.
4. Your browser opens `http://127.0.0.1:5500/index.html`.
5. Log in with one of the demo accounts below.

No terminal commands, no `npm install`, no build step, no database server.

---

## 6. Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@edumanage.com` | `admin123` |
| Teacher | `teacher@edumanage.com` | `teacher123` |
| Student | `student@edumanage.com` | `student123` |

Click the role chips on the login screen to autofill credentials instantly.

---

## 7. Architecture Overview

EduManage is a **frameworks-free SPA**:

- `index.html` contains a single `#app-root` mount point. Everything else —
  sidebar, topbar, modals, toasts, and every page — is rendered by
  JavaScript template functions.
- `App` (`app.js`) is the router: it listens to `hashchange`, checks role
  permissions per route, and swaps `#main-content` with the right module's
  `render()` output — no full page reload, ever.
- Each feature area (`students.js`, `teachers.js`, `courses.js`, `grades.js`,
  `attendance.js`, `notifications.js`) is a self-contained module that owns
  its own filter/sort/pagination state and talks to `StorageManager` for
  data — never to `localStorage` directly.
- `Auth` enforces role permissions **both** by hiding UI controls **and** by
  checking `Auth.can(permission)` before any mutating action executes.
- `I18N` swaps all visible text instantly (no reload) by re-rendering the
  current view whenever the language changes.

---

## 8. Implemented Functionalities (25+)

1. Login (with validation, show/hide password, loading state, demo accounts)
2. Logout
3. Session-based authentication (`sessionStorage` / `localStorage` "remember me")
4. Role-aware dashboard with live stats and charts
5. Add student
6. Edit student
7. Delete student (with confirmation modal)
8. Search students (instant, debounced)
9. Filter students (department, year, gender, status)
10. Student profile (personal + academic info, courses, grades, attendance)
11. Add teacher
12. Edit teacher
13. Delete teacher (with confirmation modal)
14. Add course
15. Assign student to course (duplicate/capacity guarded)
16. Add grade
17. Automatic average calculation (credit-weighted GPA)
18. Student ranking (with medal highlights, filters)
19. Attendance management (mark/edit, duplicate-guarded)
20. Attendance statistics (present/absent/late/excused %, per-student rate)
21. Search/filter grades (by student, course, grade range)
22. Export data (CSV & JSON, per-table and full export)
23. Dark/light mode (persisted, CSS-variable driven)
24. Notification system (mark read, mark all read, delete)
25. Admin/Teacher/Student roles with UI + logic-level permission checks

Plus: responsive layout, accessible modals/forms, empty states, toast
notifications, animated counters/bars, and full English/Russian
localization of every visible string.

---

## 9. Security Notes (Frontend-Only Academic Project)

- Passwords are never rendered into visible HTML; input fields use
  `type="password"` with an explicit show/hide toggle.
- Every mutating action checks `Auth.can(permission)` in JavaScript, not
  just hidden buttons — a user cannot invoke privileged actions from the
  console without a valid role in session.
- User-generated text (names, addresses, notification messages, etc.) is
  escaped via `Utils.escapeHtml()` before being inserted into the DOM.
- **This is a client-side demo.** In a production system, authentication,
  authorization and validation **must** be re-implemented server-side
  against the schema in `database.sql`, with hashed passwords, HTTPS,
  server sessions/JWTs, and query parameterization — none of which a
  browser-only app can provide on its own.

---

## 10. Limitations

- All data lives in the browser's `localStorage`; it is per-browser,
  per-device, and will be lost if the user clears site data.
- No real network requests, authentication tokens, or server-side
  validation — by design, for a no-backend demo.
- Concurrent multi-user editing is not simulated (single browser session).

## 11. Future Improvements

- Swap `StorageManager` for a REST/GraphQL client against a server
  implementing `database.sql`.
- Real password hashing + server sessions.
- File uploads for student/teacher photos.
- PDF report generation for transcripts and attendance sheets.
- More languages beyond English/Russian.

---

## 12. Presentation Script (suggested)

> "EduManage is a full student-management system built entirely with
> HTML, CSS and vanilla JavaScript — no frameworks. I'll log in as Admin
> to show the dashboard, which pulls live stats from our data layer and
> renders them with hand-built SVG charts. Let's add a student... search
> and filter the list... open a student's profile to see their courses,
> grades and attendance... Now switch to the Grades page to see how the
> system automatically calculates a credit-weighted average and updates
> the ranking board. Attendance works the same way, with live statistics
> and duplicate-record protection. Everything respects role permissions —
> if I log in as a Student, I only see my own data. The whole interface
> works in English and Russian, and in dark or light mode, all powered by
> a localStorage data layer that mirrors the relational schema in
> database.sql — the file that documents how this would plug into a real
> backend in production."
