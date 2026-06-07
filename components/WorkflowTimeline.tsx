"use client";

type TimelineEvent = {
  label: string;
  timestamp?: string;
  status?: string;
};

export default function WorkflowTimeline({
  events
}: {
  events: TimelineEvent[];
}) {
  if (!events || events.length === 0) {
    return (
      <div style={{ opacity: 0.6, padding: 16 }}>
        No timeline data available.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginBottom: 32
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Workflow Timeline</h2>

      <div
        style={{
          position: "relative",
          paddingLeft: 20,
          marginLeft: 10,
          borderLeft: "2px solid #e5e7eb"
        }}
      >
        {events.map((e, i) => (
          <div
            key={i}
            style={{
              marginBottom: 16,
              position: "relative"
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -11,
                top: 4,
                width: 12,
                height: 12,
                borderRadius: "999px",
                background: "#4f46e5"
              }}
            />
            <div style={{ marginLeft: 12 }}>
              <div style={{ fontWeight: 600 }}>{e.label}</div>
              {e.timestamp && (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {e.timestamp}
                </div>
              )}
              {e.status && (
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                  Status: {e.status}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
