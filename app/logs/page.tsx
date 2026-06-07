"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";

type LogFile = "commands" | "approvals";

export default function LogsPage() {
  const [logs, setLogs] = useState("");
  const [active, setActive] = useState<LogFile>("commands");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs(file: LogFile) {
    setLoading(true);
    setError(null);
    setActive(file);
    try {
      const res = await fetch(`/agent/logs?file=${file}`);
      const text = await res.text();
      setLogs(text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLogs("commands"); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agent Logs</h1>
        <div className="flex gap-2">
          <Button
            variant={active === "commands" ? "primary" : "secondary"}
            onClick={() => loadLogs("commands")}
          >
            Commands
          </Button>
          <Button
            variant={active === "approvals" ? "primary" : "secondary"}
            onClick={() => loadLogs("approvals")}
          >
            Approvals
          </Button>
        </div>
      </div>

      {loading && <Loading label="Loading logs..." />}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && (
        <Card>
          <pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 overflow-auto max-h-[70vh] font-mono">
            {logs || "No log entries found."}
          </pre>
        </Card>
      )}
    </div>
  );
}
