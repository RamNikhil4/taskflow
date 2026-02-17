# TaskFlow API Documentation

**Base URL**: `http://localhost:5000`

All authenticated endpoints require either:

- An `Authorization: Bearer <token>` header, **or**
- An `httpOnly` cookie named `token`

---

## Authentication

### POST `/auth/signup`

Register a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

| Field      | Type   | Validation             |
| ---------- | ------ | ---------------------- |
| `name`     | string | Required · min 2 chars |
| `email`    | string | Required · valid email |
| `password` | string | Required · min 6 chars |

**Success Response** — `201 Created`:

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Also sets an `httpOnly` cookie named `token` (7-day expiry).

**Error Responses:**

| Status | Body                                                 | Condition       |
| ------ | ---------------------------------------------------- | --------------- |
| `400`  | `{ "message": "Validation error", "errors": {...} }` | Invalid input   |
| `409`  | `{ "message": "Email already registered" }`          | Duplicate email |
| `500`  | `{ "message": "Internal server error" }`             | Server error    |

---

### POST `/auth/login`

Authenticate an existing user.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

| Field      | Type   | Validation             |
| ---------- | ------ | ---------------------- |
| `email`    | string | Required · valid email |
| `password` | string | Required · min 1 char  |

**Success Response** — `200 OK`:

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

| Status | Body                                                 | Condition         |
| ------ | ---------------------------------------------------- | ----------------- |
| `400`  | `{ "message": "Validation error", "errors": {...} }` | Invalid input     |
| `401`  | `{ "message": "Invalid email or password" }`         | Wrong credentials |
| `500`  | `{ "message": "Internal server error" }`             | Server error      |

---

### POST `/auth/logout`

Clear the auth cookie.

**Request Body:** None

**Success Response** — `200 OK`:

```json
{
  "message": "Logged out successfully"
}
```

---

## User Profile

> All user endpoints require authentication.

### GET `/user/profile`

Get the authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Success Response** — `200 OK`:

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2026-02-17T05:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Body                                       | Condition             |
| ------ | ------------------------------------------ | --------------------- |
| `401`  | `{ "message": "Authentication required" }` | Missing/invalid token |
| `404`  | `{ "message": "User not found" }`          | User deleted          |

---

### PUT `/user/profile`

Update the authenticated user's name and/or email.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

Both fields are optional — send only what you want to update.

**Success Response** — `200 OK`:

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

**Error Responses:**

| Status | Body                                                 | Condition             |
| ------ | ---------------------------------------------------- | --------------------- |
| `400`  | `{ "message": "Validation error", "errors": {...} }` | Invalid input         |
| `401`  | `{ "message": "Authentication required" }`           | Missing/invalid token |

---

## Tasks

> All task endpoints require authentication. Tasks are scoped to the authenticated user — you can only see and manage your own tasks.

### GET `/tasks`

List all tasks for the authenticated user with optional search and filters.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param      | Type   | Description                                             |
| ---------- | ------ | ------------------------------------------------------- |
| `search`   | string | Search in title and description (case-insensitive)      |
| `status`   | string | Filter by status: `pending`, `in-progress`, `completed` |
| `priority` | string | Filter by priority: `low`, `medium`, `high`             |

**Example:** `GET /tasks?search=bug&status=pending&priority=high`

**Success Response** — `200 OK`:

```json
{
  "tasks": [
    {
      "id": "a1b2c3d4-...",
      "title": "Fix login bug",
      "description": "Users can't login with special chars",
      "status": "pending",
      "priority": "high",
      "userId": "550e8400-...",
      "createdAt": "2026-02-17T05:00:00.000Z",
      "updatedAt": "2026-02-17T05:00:00.000Z"
    }
  ]
}
```

Tasks are sorted by `createdAt` descending (newest first).

---

### POST `/tasks`

Create a new task.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "title": "Implement dark mode",
  "description": "Add theme toggle to settings",
  "status": "pending",
  "priority": "medium"
}
```

| Field         | Type   | Validation                                                                    |
| ------------- | ------ | ----------------------------------------------------------------------------- |
| `title`       | string | Required · min 1 char · max 255 chars                                         |
| `description` | string | Optional                                                                      |
| `status`      | string | Optional · one of: `pending`, `in-progress`, `completed` · default: `pending` |
| `priority`    | string | Optional · one of: `low`, `medium`, `high` · default: `medium`                |

**Success Response** — `201 Created`:

```json
{
  "task": {
    "id": "a1b2c3d4-...",
    "title": "Implement dark mode",
    "description": "Add theme toggle to settings",
    "status": "pending",
    "priority": "medium",
    "userId": "550e8400-...",
    "createdAt": "2026-02-17T05:00:00.000Z",
    "updatedAt": "2026-02-17T05:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Body                                                 | Condition             |
| ------ | ---------------------------------------------------- | --------------------- |
| `400`  | `{ "message": "Validation error", "errors": {...} }` | Invalid input         |
| `401`  | `{ "message": "Authentication required" }`           | Missing/invalid token |

---

### PUT `/tasks/:id`

Update an existing task. Only the task owner can update it.

**Headers:** `Authorization: Bearer <token>`

**URL Params:** `id` — UUID of the task

**Request Body** (all fields optional):

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "completed",
  "priority": "high"
}
```

**Success Response** — `200 OK`:

```json
{
  "task": {
    "id": "a1b2c3d4-...",
    "title": "Updated title",
    "description": "Updated description",
    "status": "completed",
    "priority": "high",
    "userId": "550e8400-...",
    "createdAt": "2026-02-17T05:00:00.000Z",
    "updatedAt": "2026-02-17T06:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Body                                                 | Condition             |
| ------ | ---------------------------------------------------- | --------------------- |
| `400`  | `{ "message": "Validation error", "errors": {...} }` | Invalid input         |
| `401`  | `{ "message": "Authentication required" }`           | Missing/invalid token |
| `404`  | `{ "message": "Task not found" }`                    | Wrong ID or not owner |

---

### DELETE `/tasks/:id`

Delete a task. Only the task owner can delete it.

**Headers:** `Authorization: Bearer <token>`

**URL Params:** `id` — UUID of the task

**Success Response** — `200 OK`:

```json
{
  "message": "Task deleted successfully"
}
```

**Error Responses:**

| Status | Body                                       | Condition             |
| ------ | ------------------------------------------ | --------------------- |
| `401`  | `{ "message": "Authentication required" }` | Missing/invalid token |
| `404`  | `{ "message": "Task not found" }`          | Wrong ID or not owner |

---

## Health Check

### GET `/health`

Server health check — no authentication required.

**Success Response** — `200 OK`:

```json
{
  "status": "ok",
  "timestamp": "2026-02-17T05:00:00.000Z"
}
```

---

## Error Format

All errors follow a consistent format:

```json
{
  "message": "Human-readable error message",
  "errors": {
    "fieldName": ["Validation error message"]
  }
}
```

The `errors` field is only present for `400` validation errors. All other errors only include `message`.

---

## Data Models

### User

| Field       | Type         | Description                                          |
| ----------- | ------------ | ---------------------------------------------------- |
| `id`        | UUID         | Auto-generated primary key                           |
| `name`      | varchar(255) | User's display name                                  |
| `email`     | varchar(255) | Unique email address                                 |
| `password`  | varchar(255) | bcrypt-hashed password (never returned in responses) |
| `createdAt` | timestamp    | Account creation time                                |
| `updatedAt` | timestamp    | Last profile update time                             |

### Task

| Field         | Type         | Description                               |
| ------------- | ------------ | ----------------------------------------- |
| `id`          | UUID         | Auto-generated primary key                |
| `title`       | varchar(255) | Task title                                |
| `description` | text         | Optional task description                 |
| `status`      | varchar(50)  | `pending` · `in-progress` · `completed`   |
| `priority`    | varchar(50)  | `low` · `medium` · `high`                 |
| `userId`      | UUID         | Foreign key → `users.id` (cascade delete) |
| `createdAt`   | timestamp    | Task creation time                        |
| `updatedAt`   | timestamp    | Last update time                          |
