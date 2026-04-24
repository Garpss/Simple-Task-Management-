import { FormEvent, useMemo, useState } from "react";
import { Priority, Stage, Ticket } from "./types";

const STAGES: { key: Stage; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "review", label: "To Review" },
  { key: "done", label: "Done" }
];

const STORAGE_KEY = "flowboard-tickets-v2";
const ASSIGNEES = ["Cyprian", "Anndrew", "Garpida"];

const seedTickets: Ticket[] = [
  {
    id: crypto.randomUUID(),
    title: "Do login page",
    description: "Create a simple login form UI.",
    stage: "in-progress",
    priority: "high",
    points: 5,
    assignee: "Cyprian",
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10),
    tags: ["web", "deadline"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: "Do authentication",
    description: "Add basic email and password validation.",
    stage: "todo",
    priority: "medium",
    points: 8,
    assignee: "Anndrew",
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().slice(0, 10),
    tags: ["web", "todo"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: "Connect login to dashboard",
    description: "After login, redirect user to dashboard page.",
    stage: "review",
    priority: "high",
    points: 6,
    assignee: "Garpida",
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
    tags: ["web", "done"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
  }
];

function loadTickets(): Ticket[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedTickets;
  try {
    return JSON.parse(raw) as Ticket[];
  } catch {
    return seedTickets;
  }
}

function priorityWeight(priority: Priority): number {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function App() {
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "medium" as Priority,
    points: 3,
    assignee: "",
    deadline: "",
    tags: ""
  });
  const [editTicket, setEditTicket] = useState<{
    id: string;
    title: string;
    description: string;
    priority: Priority;
    points: number;
    assignee: string;
    deadline: string;
    tags: string;
  } | null>(null);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const text = `${ticket.title} ${ticket.description} ${ticket.assignee} ${ticket.deadline ?? ""} ${ticket.tags.join(" ")}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [tickets, search, priorityFilter]);

  const stageStats = useMemo(() => {
    return STAGES.map((stage) => ({
      ...stage,
      count: filteredTickets.filter((ticket) => ticket.stage === stage.key).length
    }));
  }, [filteredTickets]);

  const analytics = useMemo(() => {
    const done = tickets.filter((ticket) => ticket.stage === "done");
    const avgLeadHours =
      done.length === 0
        ? 0
        : done.reduce((sum, ticket) => {
            if (!ticket.completedAt) return sum;
            const created = new Date(ticket.createdAt).getTime();
            const completed = new Date(ticket.completedAt).getTime();
            return sum + (completed - created) / 36e5;
          }, 0) / done.length;

    const weightedLoad = tickets
      .filter((ticket) => ticket.stage !== "done")
      .reduce((sum, ticket) => sum + priorityWeight(ticket.priority) * ticket.points, 0);
    return {
      velocityPoints: done.reduce((sum, ticket) => sum + ticket.points, 0),
      avgLeadHours,
      weightedLoad
    };
  }, [tickets]);

  function persist(next: Ticket[]) {
    setTickets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function onCreateTicket(e: FormEvent) {
    e.preventDefault();
    if (!newTicket.title.trim()) return;
    const ticket: Ticket = {
      id: crypto.randomUUID(),
      title: newTicket.title.trim(),
      description: newTicket.description.trim(),
      stage: "todo",
      priority: newTicket.priority,
      points: Number(newTicket.points) || 1,
      assignee: newTicket.assignee.trim() || "Unassigned",
      deadline: newTicket.deadline || undefined,
      tags: newTicket.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString()
    };
    persist([ticket, ...tickets]);
    setNewTicket({
      title: "",
      description: "",
      priority: "medium",
      points: 3,
      assignee: "",
      deadline: "",
      tags: ""
    });
  }

  function onDrop(ticketId: string, targetStage: Stage) {
    const next = tickets.map((ticket) => {
      if (ticket.id !== ticketId) return ticket;
      if (ticket.stage === targetStage) return ticket;
      return {
        ...ticket,
        stage: targetStage,
        completedAt: targetStage === "done" ? new Date().toISOString() : undefined
      };
    });
    persist(next);
  }

  function onDeleteTicket(ticketId: string) {
    persist(tickets.filter((ticket) => ticket.id !== ticketId));
  }

  function onOpenEditModal(ticket: Ticket) {
    setEditTicket({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      points: ticket.points,
      assignee: ticket.assignee,
      deadline: ticket.deadline ?? "",
      tags: ticket.tags.join(", ")
    });
  }

  function onSaveEditTicket(e: FormEvent) {
    e.preventDefault();
    if (!editTicket) return;

    const next = tickets.map((ticket) =>
      ticket.id === editTicket.id
        ? {
            ...ticket,
            title: editTicket.title.trim() || ticket.title,
            description: editTicket.description.trim(),
            priority: editTicket.priority,
            points: Number(editTicket.points) || 1,
            assignee: editTicket.assignee || "Unassigned",
            deadline: editTicket.deadline || undefined,
            tags: editTicket.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          }
        : ticket
    );
    persist(next);
    setEditTicket(null);
  }

  function getDeadlineStatus(deadline?: string): "no-date" | "overdue" | "today" | "soon" | "upcoming" {
    if (!deadline) return "no-date";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(deadline);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "today";
    if (diffDays <= 3) return "soon";
    return "upcoming";
  }

  return (
    <main className="app-shell">
      <header className="header">
        <h1>Simple Task Management System</h1>
        <p>Add a task, set details, and move it through stages.</p>
        <p>Created by Cyprian Andrew Garpida</p>
      </header>

      <section className="panel controls">
        <h2 className="section-title">Create Task</h2>
        <p className="section-help">Use simple details. Fields with * are required.</p>
        <form onSubmit={onCreateTicket} className="ticket-form">
          <label>
            Task title *
            <input
              placeholder="Example: Do login page"
              value={newTicket.title}
              onChange={(e) => setNewTicket((s) => ({ ...s, title: e.target.value }))}
              required
            />
          </label>
          <label>
            Description
            <input
              placeholder="Example: Add basic authentication"
              value={newTicket.description}
              onChange={(e) => setNewTicket((s) => ({ ...s, description: e.target.value }))}
            />
          </label>
          <label>
            Assignee
            <select
              value={newTicket.assignee}
              onChange={(e) => setNewTicket((s) => ({ ...s, assignee: e.target.value }))}
            >
              <option value="">Select assignee</option>
              {ASSIGNEES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deadline
            <input
              type="date"
              value={newTicket.deadline}
              onChange={(e) => setNewTicket((s) => ({ ...s, deadline: e.target.value }))}
            />
          </label>
          <label>
            Tags
            <input
              placeholder="Example: web, deadline"
              value={newTicket.tags}
              onChange={(e) => setNewTicket((s) => ({ ...s, tags: e.target.value }))}
            />
          </label>
          <label>
            Priority
            <select
              value={newTicket.priority}
              onChange={(e) => setNewTicket((s) => ({ ...s, priority: e.target.value as Priority }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Task points
            <input
              type="number"
              min={1}
              max={21}
              value={newTicket.points}
              onChange={(e) => setNewTicket((s) => ({ ...s, points: Number(e.target.value) }))}
            />
          </label>
          <button type="submit">Add Task</button>
        </form>

        <div className="filters">
          <input placeholder="Search by task, assignee, or tags" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority | "all")}>
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </section>

      <section className="panel analytics">
        <article>
          <h3>Work Completed</h3>
          <p>{analytics.velocityPoints} points</p>
        </article>
        <article>
          <h3>Average Time</h3>
          <p>{analytics.avgLeadHours.toFixed(1)} hours</p>
        </article>
        <article>
          <h3>Current Workload</h3>
          <p>{analytics.weightedLoad} risk points</p>
        </article>
      </section>

      <section className="board">
        {STAGES.map((stage) => (
          <div
            key={stage.key}
            className="column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const ticketId = e.dataTransfer.getData("ticketId");
              if (ticketId) onDrop(ticketId, stage.key);
            }}
          >
            <header>
              <h2>{stage.label}</h2>
              <span>{stageStats.find((s) => s.key === stage.key)?.count ?? 0}</span>
            </header>
            {filteredTickets
              .filter((ticket) => ticket.stage === stage.key)
              .map((ticket) => (
                (() => {
                  const deadlineStatus = getDeadlineStatus(ticket.deadline);
                  const deadlineLabel =
                    deadlineStatus === "overdue"
                      ? "Overdue"
                      : deadlineStatus === "today"
                        ? "Due today"
                        : deadlineStatus === "soon"
                          ? "Due soon"
                          : deadlineStatus === "upcoming"
                            ? "Upcoming"
                            : "No due date";

                  return (
                <article
                  key={ticket.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("ticketId", ticket.id)}
                  className={`ticket p-${ticket.priority}`}
                >
                  <h4>{ticket.title}</h4>
                  <p>{ticket.description || "No description."}</p>
                  <div className="meta">
                    <span>{ticket.assignee}</span>
                    <span>{ticket.deadline ? `Due ${ticket.deadline}` : "No due date"}</span>
                    <span className={`deadline-badge d-${deadlineStatus}`}>{deadlineLabel}</span>
                    <span>{ticket.points} pts</span>
                    <span>{ticket.priority}</span>
                  </div>
                  {ticket.tags.length > 0 && (
                    <div className="tags">
                      {ticket.tags.map((tag) => (
                        <small key={tag}>#{tag}</small>
                      ))}
                    </div>
                  )}
                  <div className="ticket-actions">
                    <button type="button" className="btn-edit" onClick={() => onOpenEditModal(ticket)}>
                      Edit
                    </button>
                    <button type="button" className="btn-delete" onClick={() => onDeleteTicket(ticket.id)}>
                      Delete
                    </button>
                  </div>
                </article>
                  );
                })()
              ))}
          </div>
        ))}
      </section>
      {editTicket && (
        <div className="modal-overlay" onClick={() => setEditTicket(null)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Task</h3>
            <form className="modal-form" onSubmit={onSaveEditTicket}>
              <label>
                Task title
                <input
                  value={editTicket.title}
                  onChange={(e) => setEditTicket((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={editTicket.description}
                  onChange={(e) => setEditTicket((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                />
              </label>
              <label>
                Assignee
                <select
                  value={editTicket.assignee}
                  onChange={(e) => setEditTicket((prev) => (prev ? { ...prev, assignee: e.target.value } : prev))}
                >
                  <option value="">Select assignee</option>
                  {ASSIGNEES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Deadline
                <input
                  type="date"
                  value={editTicket.deadline}
                  onChange={(e) => setEditTicket((prev) => (prev ? { ...prev, deadline: e.target.value } : prev))}
                />
              </label>
              <label>
                Priority
                <select
                  value={editTicket.priority}
                  onChange={(e) => setEditTicket((prev) => (prev ? { ...prev, priority: e.target.value as Priority } : prev))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                Task points
                <input
                  type="number"
                  min={1}
                  max={21}
                  value={editTicket.points}
                  onChange={(e) =>
                    setEditTicket((prev) => (prev ? { ...prev, points: Number(e.target.value) || 1 } : prev))
                  }
                />
              </label>
              <label>
                Tags
                <input
                  value={editTicket.tags}
                  onChange={(e) => setEditTicket((prev) => (prev ? { ...prev, tags: e.target.value } : prev))}
                />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditTicket(null)}>
                  Cancel
                </button>
                <button type="submit">Save</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
