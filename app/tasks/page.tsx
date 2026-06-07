"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";

type TaskStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

interface Task {
  id: string;
  command: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

const statusColors: Record<TaskStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  RUNNING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800"
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/agent/tasks");
      const json = await res.json();
      setTasks(Array.isArray(json) ? json : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Task Queue</h1>
        <Button variant="secondary" onClick={loadTasks}>Refresh</Button>
      </div>

      {loading && <Loading label="Loading tasks..." />}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && tasks.length === 0 && (
        <Card><p className="text-sm text-zinc-500">No tasks in queue.</p></Card>
      )}

      {tasks.map(task => (
        <Card key={task.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-mono truncate text-zinc-800 dark:text-zinc-200">{task.command}</p>
              <p className="text-xs text-zinc-400">{task.id} · {new Date(task.createdAt).toLocaleString()}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[task.status]}`}>
              {task.status}
            </span>
          </div>
          {task.error && <p className="mt-2 text-xs text-red-500">{task.error}</p>}
        </Card>
      ))}
    </div>
  );
}
