import { db } from '@/lib/db'

// Rendered on-demand (never prerendered at build): it queries the database, which has no
// service-role key during Vercel's build step. Without this the build fails with
// "supabaseKey is required" while prerendering. See lib/supabase.ts (lazy client).
export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const { data: clients } = await db.clients.all()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Clients</h1>

      <ul className="space-y-2">
        {clients?.map((c: any) => (
          <li key={c.id} className="p-4 border rounded">
            <div className="font-semibold">{c.full_name}</div>
            <div>{c.email}</div>
            <div>{c.phone}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
