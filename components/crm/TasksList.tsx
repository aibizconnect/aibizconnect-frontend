"use client";

import { useEffect, useState } from "react";
import TaskItem from "./TaskItem";
import CreateTaskForm from "./CreateTaskForm";

export default function TasksList({ tenantId }: { tenantId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);

  function load() {
    fetch(`/tenants/${tenantId}/tasks`)
      .then(res => res.json())
      .then(data => setTasks(data.tasks || []));
  }

  useEffect(() => {
    load();
  }, [tenantId]);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 24 }}>Tasks</h1>

      <CreateTaskForm tenantId={tenantId} onCreated={load} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tasks.map(t => (
          <TaskItem key={t.id} task={t} tenantId={tenantId} onUpdated={load} />
        ))}
      </div>
    </div>
  );
}
