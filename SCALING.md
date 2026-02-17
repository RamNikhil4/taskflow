# Scaling the Frontend-Backend Integration for Production

This document outlines strategies for taking the TaskFlow application from a local development setup to a production-ready, scalable architecture.

---

## Current Architecture (Development)

```
Browser → Next.js Dev Server (:3000)  ──rewrites──►  Express API (:5000)  ──►  PostgreSQL
```

In development, Next.js rewrites proxy `/api/*` to the Express backend. This works well locally but isn't suitable for production at scale.

---

## 1. API Layer — Replace Dev Proxy with a Reverse Proxy

**Problem**: Next.js rewrites add latency and a single point of failure.

**Solution**: Use a dedicated reverse proxy / API gateway.

| Option                                  | When to Use                                               |
| --------------------------------------- | --------------------------------------------------------- |
| **Nginx**                               | Self-hosted, simple routing, SSL termination              |
| **AWS ALB / Cloud Load Balancer**       | Cloud-native, auto-scaling, health checks                 |
| **API Gateway** (Kong, AWS API Gateway) | Rate limiting, API key management, request transformation |

**Production architecture:**

```
Browser  ──►  CDN (Vercel / CloudFront)  ──►  Next.js (SSR/SSG)
                                               │
Browser  ──►  Nginx / ALB  ──►  Express API  ──►  PostgreSQL
              (api.taskflow.com)    (cluster)      (managed)
```

- Frontend served from a CDN or Vercel
- API runs on a separate subdomain (e.g., `api.taskflow.com`)
- CORS configured to allow only the frontend origin

---

## 2. Backend — Horizontal Scaling

### Containerization

```
Dockerfile → Docker Image → Kubernetes Deployment (3+ replicas)
                            └── Horizontal Pod Autoscaler
```

- Containerize the Express server with Docker
- Deploy to Kubernetes or a managed container service (AWS ECS, Google Cloud Run)
- Use a **Horizontal Pod Autoscaler** to scale based on CPU/memory/request count

### Stateless Design

The API is already stateless (JWT-based auth, no server-side sessions), making horizontal scaling straightforward. Any instance can handle any request.

### Rate Limiting & Throttling

- Add `express-rate-limit` per IP and per user
- Consider a Redis-backed rate limiter for distributed deployments

---

## 3. Database — Optimization & Scaling

### Connection Pooling

- Use **PgBouncer** in front of PostgreSQL to manage connection pooling across multiple API instances
- Current: `pg.Pool` per server instance → Production: centralized pool with PgBouncer

### Read Replicas

- Route read-heavy queries (task listing, search, profile fetch) to read replicas
- Write operations (create, update, delete) go to the primary

### Indexing Strategy

```sql
-- Essential indexes for the tasks table
CREATE INDEX idx_tasks_user_id ON tasks (user_id);
CREATE INDEX idx_tasks_status ON tasks (user_id, status);
CREATE INDEX idx_tasks_priority ON tasks (user_id, priority);
CREATE INDEX idx_tasks_title_search ON tasks USING gin (title gin_trgm_ops);
```

### Managed Database

- Use a managed PostgreSQL service (AWS RDS, Supabase, Neon) for automatic backups, failover, and monitoring

---

## 4. Authentication — Hardening for Production

### Refresh Token Rotation

```
Current:  Single JWT (7-day expiry)
          ↓
Production:  Access Token (15 min) + Refresh Token (7 days, rotating)
```

- **Access tokens**: Short-lived (15 min), sent in `Authorization` header
- **Refresh tokens**: Long-lived, stored in httpOnly cookie, rotated on each use
- Revoke all refresh tokens on password change or logout-all

### Token Storage

- **Redis** as a token blacklist for immediate revocation
- Store refresh token family IDs to detect token reuse (replay attacks)

### Additional Hardening

- Enforce HTTPS only (HSTS headers)
- Add CSRF protection for cookie-based auth
- Implement account lockout after failed login attempts

---

## 5. Frontend — Performance & Caching

### SSR/SSG Optimization

- **Static pages** (login, signup): Use SSG (`generateStaticParams`) for instant loads
- **Dynamic pages** (dashboard): Use SSR with streaming for faster TTFB
- Consider **React Server Components** for data-fetching pages to reduce client JS bundle

### CDN & Static Assets

- Deploy the Next.js frontend to **Vercel** or behind **CloudFront**
- All static assets (CSS, JS, fonts) served from edge locations
- Use `next/image` for optimized image loading

### Code Splitting

- Next.js App Router already does route-based code splitting
- Lazy-load heavy components (modals, filters) with `React.lazy()` or `next/dynamic`

### Client-Side Data Management

- Use **React Query (TanStack Query)** or **SWR** for:
  - Automatic caching and revalidation
  - Optimistic updates on task CRUD
  - Background refetching
  - Pagination / infinite scroll

---

## 6. Monitoring & Observability

| Layer             | Tool                                | Purpose                                     |
| ----------------- | ----------------------------------- | ------------------------------------------- |
| **APM**           | Datadog, New Relic, Sentry          | Performance monitoring, error tracking      |
| **Logging**       | Winston + ELK / CloudWatch          | Structured, searchable logs                 |
| **Health Checks** | `/health` endpoint + uptime monitor | Detect downtime immediately                 |
| **Metrics**       | Prometheus + Grafana                | Request latency, DB query time, error rates |

---

## 7. CI/CD Pipeline

```
Push to main
  └──► GitHub Actions
        ├── Lint + Type check
        ├── Run unit/integration tests
        ├── Build Docker image
        ├── Push to Container Registry
        └── Deploy to staging → Run E2E tests → Promote to production
```

- **Feature flags** (LaunchDarkly, Unleash) for gradual rollouts
- **Blue-green deployments** for zero-downtime releases
- **Database migrations** run as a separate pre-deploy step

---

## Summary

| Area           | Dev (Current)          | Production (Recommended)                  |
| -------------- | ---------------------- | ----------------------------------------- |
| **API Proxy**  | Next.js rewrites       | Nginx / ALB + separate subdomain          |
| **Backend**    | Single Node.js process | Docker + K8s (3+ replicas)                |
| **Database**   | Local PostgreSQL       | Managed RDS + PgBouncer + read replicas   |
| **Auth**       | Single JWT (7d)        | Access + refresh tokens + Redis blacklist |
| **Frontend**   | `next dev`             | Vercel / CDN + SSR/SSG + React Query      |
| **Monitoring** | `console.log`          | Sentry + structured logging + Grafana     |
| **CI/CD**      | Manual                 | GitHub Actions + blue-green deploy        |

The key principle is to keep the architecture **stateless at the API layer** (already done via JWT) so that horizontal scaling is trivial, and push performance-critical concerns (caching, static serving, connection pooling) to specialized infrastructure.
