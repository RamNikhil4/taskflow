const API_BASE = "/api";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = tryRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  let res = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

  if (res.status === 401 && !endpoint.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
    }
  }

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || "Something went wrong") as Error & {
      status: number;
      errors?: Record<string, string[]>;
    };
    error.status = res.status;
    error.errors = data.errors;
    throw error;
  }

  return data as T;
}

export const authApi = {
  signup(body: { name: string; email: string; password: string }) {
    return apiFetch<AuthResponse>("/auth/signup", {
      method: "POST",
      body,
    });
  },

  login(body: { email: string; password: string }) {
    return apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body,
    });
  },

  logout() {
    return apiFetch<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  },

  refresh() {
    return apiFetch<{ message: string }>("/auth/refresh", {
      method: "POST",
    });
  },
};

export const userApi = {
  getProfile() {
    return apiFetch<{ user: User }>("/user/profile");
  },

  updateProfile(body: { name?: string; email?: string }) {
    return apiFetch<{ user: User }>("/user/profile", {
      method: "PUT",
      body,
    });
  },
};

export interface TaskFilters {
  search?: string;
  status?: "pending" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  status?: "pending" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
}

export interface UpdateTaskBody {
  title?: string;
  description?: string;
  status?: "pending" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
}

export const tasksApi = {
  list(filters?: TaskFilters) {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);

    const qs = params.toString();
    return apiFetch<{ tasks: Task[] }>(`/tasks${qs ? `?${qs}` : ""}`);
  },

  create(body: CreateTaskBody) {
    return apiFetch<{ task: Task }>("/tasks", {
      method: "POST",
      body,
    });
  },

  update(id: string, body: UpdateTaskBody) {
    return apiFetch<{ task: Task }>(`/tasks/${id}`, {
      method: "PUT",
      body,
    });
  },

  delete(id: string) {
    return apiFetch<{ message: string }>(`/tasks/${id}`, {
      method: "DELETE",
    });
  },
};

export const healthApi = {
  check() {
    return apiFetch<{ status: string; timestamp: string }>("/health");
  },
};
