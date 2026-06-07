"use client";

export default function TaskItem({
  task,
  tenantId,
  onUpdated
}: {
  task: any;
  tenantId: string;
  onUpdated: () => void;
}) {
  async function toggle() {
    await fetch(`/tenants/${tenantId}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: task.status === "open" ? "done" : "open"
      })
    });

    onUpdated();
  }

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <div>
        <strong>{task.title}</strong>
        <div style={{ opacity: 0.7 }}>
          {task.due_date ? `Due: ${task.due_date}` : "No due date"}
        </div>
      </div>

      <button
        onClick={toggle}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          background: task.status === "open" ? "#4f46e5" : "green",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        {task.status === "open" ? "Mark Done" : "Reopen"}
      </button>
    </div>
  );
}
