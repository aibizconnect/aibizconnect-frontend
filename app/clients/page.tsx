import { db } from '@/lib/db'

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
