"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  LogOut,
  Loader2,
  Trash2,
  Pencil,
  X,
  Check,
  User,
  Filter,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Create task state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  // Edit task state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");

  // Profile modal
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      const qs = params.toString();
      const res = await apiFetch<{ tasks: Task[] }>(
        `/tasks${qs ? `?${qs}` : ""}`,
      );
      setTasks(res.tasks);
    } catch {
      toast.error("Failed to load tasks");
    }
  }, [search, filterStatus, filterPriority]);

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await apiFetch<{ user: UserProfile }>(
          "/user/profile",
        );
        setUser(profileRes.user);
        await fetchTasks();
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, fetchTasks]);

  useEffect(() => {
    if (!loading) fetchTasks();
  }, [search, filterStatus, filterPriority, fetchTasks, loading]);

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    router.replace("/login");
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: {
          title: newTitle,
          description: newDesc || undefined,
          priority: newPriority,
        },
      });
      toast.success("Task created!");
      setNewTitle("");
      setNewDesc("");
      setNewPriority("medium");
      setShowCreate(false);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const updateTask = async (id: string) => {
    try {
      await apiFetch(`/tasks/${id}`, {
        method: "PUT",
        body: {
          title: editTitle,
          description: editDesc || undefined,
          status: editStatus,
          priority: editPriority,
        },
      });
      toast.success("Task updated!");
      setEditingId(null);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE" });
      toast.success("Task deleted");
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleStatus = async (task: Task) => {
    const next =
      task.status === "pending"
        ? "in-progress"
        : task.status === "in-progress"
          ? "completed"
          : "pending";
    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: "PUT",
        body: { status: next },
      });
      fetchTasks();
    } catch {}
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await apiFetch<{ user: UserProfile }>("/user/profile", {
        method: "PUT",
        body: { name: editName, email: editEmail },
      });
      setUser(res.user);
      toast.success("Profile updated!");
      setShowProfile(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditStatus(task.status);
    setEditPriority(task.priority);
  };

  const openProfile = () => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
      setShowProfile(true);
    }
  };

  const statusColor = (s: string) =>
    s === "completed"
      ? "var(--success)"
      : s === "in-progress"
        ? "var(--warning)"
        : "var(--text-muted)";

  const priorityColor = (p: string) =>
    p === "high"
      ? "var(--danger)"
      : p === "medium"
        ? "var(--warning)"
        : "var(--text-muted)";

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2
          size={40}
          className="spin"
          style={{ color: "var(--accent)" }}
        />
        <style jsx>{`
          .loading-screen {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
          :global(.spin) {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">TaskFlow</span>
        </div>
        <div className="header-right">
          <button className="avatar-btn" onClick={openProfile} title="Profile">
            <User size={18} />
            <span>{user?.name?.split(" ")[0]}</span>
          </button>
          <button className="icon-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="main">
        <div className="top-bar">
          <h1>My Tasks</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={18} /> New Task
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="search-bar">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className={`icon-btn filter-btn ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="filters">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {(filterStatus || filterPriority) && (
              <button
                className="clear-filters"
                onClick={() => {
                  setFilterStatus("");
                  setFilterPriority("");
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Create Task Modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>New Task</h2>
                <button
                  className="icon-btn"
                  onClick={() => setShowCreate(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    placeholder="What needs to be done?"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Add details..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={createTask}
                  disabled={creating || !newTitle.trim()}
                >
                  {creating ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {showProfile && (
          <div className="modal-overlay" onClick={() => setShowProfile(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>My Profile</h2>
                <button
                  className="icon-btn"
                  onClick={() => setShowProfile(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
                <p className="profile-meta">
                  Member since{" "}
                  {new Date(user!.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowProfile(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="task-list">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks found</p>
              <span>Click &quot;New Task&quot; to get started!</span>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="task-card">
                {editingId === task.id ? (
                  <div className="task-edit">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="edit-input"
                    />
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="edit-textarea"
                      placeholder="Description..."
                    />
                    <div className="edit-selects">
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="edit-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => updateTask(task.id)}
                      >
                        <Check size={14} /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="task-left"
                      onClick={() => toggleStatus(task)}
                    >
                      <div
                        className="status-dot"
                        style={{ background: statusColor(task.status) }}
                        title={task.status}
                      />
                      <div className="task-content">
                        <span
                          className={`task-title ${
                            task.status === "completed" ? "completed" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.description && (
                          <span className="task-desc">{task.description}</span>
                        )}
                        <div className="task-meta">
                          <span
                            className="badge"
                            style={{
                              color: priorityColor(task.priority),
                              borderColor: priorityColor(task.priority),
                            }}
                          >
                            {task.priority}
                          </span>
                          <span className="task-date">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="task-actions">
                      <button
                        className="icon-btn"
                        onClick={() => startEdit(task)}
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => deleteTask(task.id)}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: var(--bg-primary);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-icon {
          font-size: 22px;
        }
        .logo-text {
          font-size: 20px;
          font-weight: 800;
          background: linear-gradient(135deg, var(--accent), #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .avatar-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .avatar-btn:hover {
          border-color: var(--accent);
        }
        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          background: none;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
          background: var(--bg-card);
        }
        .icon-btn.danger:hover {
          color: var(--danger);
          border-color: var(--danger);
        }
        .icon-btn.active {
          color: var(--accent);
          border-color: var(--accent);
          background: rgba(108, 92, 231, 0.1);
        }
        .main {
          max-width: 800px;
          margin: 0 auto;
          padding: 32px 20px;
        }
        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .top-bar h1 {
          font-size: 28px;
          font-weight: 800;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: var(--accent);
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px var(--accent-glow);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-secondary {
          background: var(--bg-input);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }
        .btn-secondary:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }
        .search-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .search-input-wrapper {
          flex: 1;
          position: relative;
        }
        :global(.search-icon) {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .search-input-wrapper input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input-wrapper input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .filter-btn {
          flex-shrink: 0;
        }
        .filters {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .filters select {
          padding: 8px 12px;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          cursor: pointer;
        }
        .filters select:focus {
          border-color: var(--accent);
        }
        .clear-filters {
          padding: 8px 12px;
          background: none;
          border: 1px solid var(--danger);
          border-radius: 8px;
          color: var(--danger);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clear-filters:hover {
          background: rgba(255, 107, 107, 0.1);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          width: 100%;
          max-width: 460px;
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
        }
        .modal-header h2 {
          font-size: 18px;
          font-weight: 700;
        }
        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 24px;
          border-top: 1px solid var(--border-color);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
          resize: vertical;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .profile-meta {
          font-size: 12px;
          color: var(--text-muted);
        }

        /* Task List */
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .task-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          transition: border-color 0.2s;
        }
        .task-card:hover {
          border-color: var(--border-hover);
        }
        .task-left {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
          cursor: pointer;
          min-width: 0;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-top: 6px;
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .task-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .task-title {
          font-size: 15px;
          font-weight: 600;
        }
        .task-title.completed {
          text-decoration: line-through;
          color: var(--text-muted);
        }
        .task-desc {
          font-size: 13px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .task-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .badge {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 8px;
          border: 1px solid;
          border-radius: 6px;
        }
        .task-date {
          font-size: 11px;
          color: var(--text-muted);
        }
        .task-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .task-edit {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .edit-input,
        .edit-textarea {
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          font-family: inherit;
          resize: vertical;
          width: 100%;
        }
        .edit-input:focus,
        .edit-textarea:focus {
          border-color: var(--accent);
        }
        .edit-selects {
          display: flex;
          gap: 8px;
        }
        .edit-selects select {
          padding: 6px 10px;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
        }
        .edit-actions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }
        .empty-state p {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-secondary);
        }
        .empty-state span {
          font-size: 14px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        :global(.spin) {
          animation: spin 1s linear infinite;
        }

        @media (max-width: 640px) {
          .top-bar h1 {
            font-size: 22px;
          }
          .main {
            padding: 20px 16px;
          }
          .header {
            padding: 12px 16px;
          }
          .modal {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
