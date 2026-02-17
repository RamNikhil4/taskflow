# ⚡ TaskFlow — Smart Task Manager

A full-stack task management application with JWT authentication, a CRUD-enabled dashboard with search & filtering, and a modern dark-themed UI.

> **Frontend**: Next.js 16 (React 19) · TypeScript · Tailwind CSS 4  
> **Backend**: Node.js · Express 5 · Drizzle ORM · PostgreSQL  
> **Auth**: JWT (httpOnly cookie + Bearer token) · bcrypt password hashing

---

## ✨ Features

| Area               | Details                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Authentication** | Register, login, logout with JWT · Zod validation · httpOnly cookie + localStorage token |
| **Dashboard**      | Full CRUD on tasks · Search by title/description · Filter by status & priority           |
| **Task Entity**    | Title, description, status (pending/in-progress/completed), priority (low/medium/high)   |
| **Profile**        | View & update user profile (name, email)                                                 |
| **UX**             | Dark mode UI · Loading spinners · Toast notifications · Password visibility toggle       |

---

## 📁 Project Structure

```
task/
├── client/                   # Next.js frontend
│   ├── app/
│   │   ├── login/page.tsx    # Login page
│   │   ├── signup/page.tsx   # Signup page
│   │   ├── dashboard/page.tsx # Tasks dashboard (CRUD)
│   │   ├── layout.tsx        # Root layout + Toaster
│   │   ├── page.tsx          # Redirect based on auth
│   │   └── globals.css       # Design tokens & base styles
│   ├── lib/api.ts            # Fetch wrapper with JWT
│   ├── next.config.ts        # API proxy rewrites
│   └── package.json
│
├── server/                   # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts       # Signup, login, logout
│   │   │   ├── tasks.ts      # CRUD + search + filter
│   │   │   └── user.ts       # Profile get/update
│   │   ├── middleware/auth.ts # JWT verification middleware
│   │   ├── config/db.ts      # PostgreSQL connection pool
│   │   └── db/schema/        # Drizzle ORM schemas
│   │       ├── users.ts
│   │       └── tasks.ts
│   ├── drizzle.config.ts
│   ├── .env.example
│   └── package.json
│
├── postman_collection.json   # Importable Postman collection
├── API_DOCS.md               # Full REST API reference
├── SCALING.md                # Production scaling strategy
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** (running locally or remote)
- **npm**

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/taskflow.git
cd taskflow
```

### 2. Set up the backend

```bash
cd server
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.
npm install
npm run db:push      # Push schema to PostgreSQL
npm run dev          # Starts on http://localhost:5000
```

**Environment variables** (see `.env.example`):

| Variable       | Description                  | Default                                                |
| -------------- | ---------------------------- | ------------------------------------------------------ |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/taskdb` |
| `JWT_SECRET`   | Secret key for signing JWTs  | —                                                      |
| `PORT`         | Server port                  | `5000`                                                 |
| `CLIENT_URL`   | Frontend origin for CORS     | `http://localhost:3000`                                |

### 3. Set up the frontend

```bash
cd client
npm install
npm run dev          # Starts on http://localhost:3000
```

The frontend proxies `/api/*` requests to the backend via Next.js rewrites — no CORS issues during development.

---

## 🔐 Authentication Flow

```
┌──────────┐     POST /auth/signup     ┌──────────┐     JWT + httpOnly cookie
│  Client   │ ───────────────────────► │  Server   │ ──────────────────────────►
│ (Next.js) │     POST /auth/login     │ (Express) │
│           │ ◄─────────────────────── │           │  { user, token }
│           │                          │           │
│           │   Authorization: Bearer  │           │
│           │ ───────────────────────► │           │  Middleware validates JWT
│           │      GET /tasks          │           │  before protected routes
│           │ ◄─────────────────────── │           │
└──────────┘                          └──────────┘
```

- On login/signup, the JWT is stored in both an **httpOnly cookie** and **localStorage**
- The `apiFetch` wrapper in `lib/api.ts` automatically attaches the `Authorization: Bearer` header
- The auth middleware checks cookies first, then the `Authorization` header

---

## 📖 API Reference

See [API_DOCS.md](./API_DOCS.md) for the full REST API documentation with request/response examples.

**Quick overview:**

| Method | Endpoint        | Auth | Description                 |
| ------ | --------------- | ---- | --------------------------- |
| POST   | `/auth/signup`  | ✗    | Register a new user         |
| POST   | `/auth/login`   | ✗    | Login with email & password |
| POST   | `/auth/logout`  | ✗    | Clear auth cookie           |
| GET    | `/user/profile` | ✓    | Get current user's profile  |
| PUT    | `/user/profile` | ✓    | Update name/email           |
| GET    | `/tasks`        | ✓    | List tasks (search, filter) |
| POST   | `/tasks`        | ✓    | Create a new task           |
| PUT    | `/tasks/:id`    | ✓    | Update a task               |
| DELETE | `/tasks/:id`    | ✓    | Delete a task               |
| GET    | `/health`       | ✗    | Server health check         |

---

## 📬 Postman Collection

Import `postman_collection.json` into Postman:

1. Open Postman → Import → Upload File → select `postman_collection.json`
2. The **Login** request automatically saves the JWT token for subsequent requests
3. All authenticated requests use the `{{token}}` variable

---

## 🏗️ Scaling for Production

See [SCALING.md](./SCALING.md) for a detailed note on how to scale the frontend-backend integration for production, covering:

- API gateway & reverse proxy
- Horizontal scaling with Docker/Kubernetes
- Database optimization (read replicas, connection pooling)
- Auth hardening (refresh tokens, token rotation)
- CDN, SSR/SSG, and caching strategies

---

## 🛠️ Tech Stack

| Layer              | Technology                             |
| ------------------ | -------------------------------------- |
| Frontend framework | Next.js 16 (App Router)                |
| UI library         | React 19                               |
| Styling            | Tailwind CSS 4 + CSS custom properties |
| Form handling      | React Hook Form + Zod                  |
| Icons              | Lucide React                           |
| Notifications      | React Hot Toast                        |
| Backend framework  | Express 5                              |
| ORM                | Drizzle ORM                            |
| Database           | PostgreSQL                             |
| Auth               | JSON Web Tokens (jsonwebtoken)         |
| Password hashing   | bcrypt                                 |
| Validation         | Zod                                    |
| Security           | Helmet, CORS                           |

---

## 📄 License

This project was built as part of a Frontend Developer Intern assignment.
