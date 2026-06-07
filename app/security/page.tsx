"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";

export default function SecurityPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCheck() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/agent/security/run", { method: "POST" });
      const json = await res.json();
      setReport(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasWarnings = report?.warnings?.length > 0;
  const hasErrors = report?.errors?.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Security Check</h1>
        <Button onClick={runCheck} disabled={loading}>
          {loading ? "Running..." : "Run Security Check"}
        </Button>
      </div>

      {loading && <Loading label="Running security checks..." />}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {report && (
        <>
          {hasErrors && (
            <Card className="border-red-200 dark:border-red-800">
              <h3 className="font-semibold text-red-600 mb-2">Errors ({report.errors.length})</h3>
              <ul className="space-y-1">
                {report.errors.map((e: string, i: number) => (
                  <li key={i} className="text-sm text-red-600">• {e}</li>
                ))}
              </ul>
            </Card>
          )}

          {hasWarnings && (
            <Card className="border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-yellow-600 mb-2">Warnings ({report.warnings.length})</h3>
              <ul className="space-y-1">
                {report.warnings.map((w: string, i: number) => (
                  <li key={i} className="text-sm text-yellow-600">• {w}</li>
                ))}
              </ul>
            </Card>
          )}

          {!hasErrors && !hasWarnings && (
            <Card className="border-green-200 dark:border-green-800">
              <p className="text-sm text-green-600 font-medium">✓ All checks passed</p>
            </Card>
          )}

          <Card>
            <h3 className="text-lg font-semibold mb-4">Full Report</h3>
            <pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 overflow-auto max-h-[60vh]">
              {JSON.stringify(report, null, 2)}
            </pre>
          </Card>
        </>
      )}
    </div>
  );
}
