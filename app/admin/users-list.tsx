export type AdminUser = {
  id: string
  name: string | null
  email: string
  createdAt: string
  _count: { seen: number }
}

export default function UsersList({ users }: { users: AdminUser[] }) {
  return (
    <div>
      <div className="mb-5">
        <p className="eyebrow mb-2">{users.length} gebruikers</p>
        <h2 className="font-display text-3xl text-stone-900">Gebruikers</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">Meest recente registraties bovenaan.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Naam</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Geregistreerd</th>
              <th className="px-4 py-3">Werken gezien</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-stone-900">{user.name || '—'}</td>
                <td className="px-4 py-3 text-stone-600">{user.email}</td>
                <td className="px-4 py-3 text-stone-600">
                  {new Date(user.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-stone-600">{user._count.seen}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-400">Nog geen gebruikers</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
