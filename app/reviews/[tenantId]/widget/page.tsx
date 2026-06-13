import { listReviews, reviewStats } from "@/lib/reputation";

/** Public review widget (D-323) — embeddable iframe of a tenant's published reviews + rating.
 *  Cached hourly (content changes infrequently). Transparent, self-contained styling. */
export const revalidate = 3600;

const Stars = ({ n }: { n: number }) => <span style={{ color: "#f59e0b", letterSpacing: 1 }}>{"★".repeat(Math.round(n))}<span style={{ color: "#cbd5e1" }}>{"★".repeat(5 - Math.round(n))}</span></span>;

export default async function ReviewWidgetPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const reviews = (await listReviews(tenantId, { publishedOnly: true }).catch(() => [])).slice(0, 12);
  const stats = reviewStats(reviews);

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", padding: 16, color: "#0f172a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.avg || "—"}</div>
        <div>
          <div style={{ fontSize: 18 }}><Stars n={stats.avg} /></div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{stats.count} review{stats.count === 1 ? "" : "s"}</div>
        </div>
      </div>
      {reviews.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94a3b8" }}>No reviews yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <Stars n={r.rating} /><strong>{r.author}</strong>
              </div>
              {r.body && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
