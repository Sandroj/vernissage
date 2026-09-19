export type AdminUser = {
  id: string
  name: string | null
  email: string
  createdAt: string
  _count: { seen: number }
  entitlement: { active: boolean; expiresAt: string | null } | null
}

function daysRemaining(entitlement: AdminUser['entitlement']): number | null {
  if (!entitlement?.active || !entitlement.expiresAt) return null
  const ms = new Date(entitlement.expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function toCsv(users: AdminUser[]): string {
  const header = ['Naam', 'E-mail', 'Geregistreerd', 'Werken gezien', 'Plus', 'Resterende dagen']
  const rows = users.map((u) => {
    const days = daysRemaining(u.entitlement)
    return [
      u.name ?? '',
      u.email,
      new Date(u.createdAt).toLocaleDateString('nl-NL'),
      String(u._count.seen),
      u.entitlement?.active ? 'Ja' : 'Nee',
      days === null ? '' : String(days),
    ]
  })
  return [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadCsv(users: AdminUser[]) {
  const blob = new Blob([toCsv(users)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `gebruikers-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function UsersList({ users }: { users: AdminUser[] }) {
  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{users.length} gebruikers</p>
          <h2 className="font-display text-3xl text-stone-900">Gebruikers</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">Meest recente registraties bovenaan.</p>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(users)}
          className="shrink-0 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Exporteer CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Naam</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Geregistreerd</th>
              <th className="px-4 py-3">Werken gezien</th>
              <th className="px-4 py-3">Plus</th>
              <th className="px-4 py-3">Resterende dagen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((user) => {
              const days = daysRemaining(user.entitlement)
              return (
                <tr key={user.id}>
                  <td className="px-4 py-3 text-stone-900">{user.name || '—'}</td>
                  <td className="px-4 py-3 text-stone-600">{user.email}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {new Date(user.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{user._count.seen}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {user.entitlement?.active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Plus</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{days === null ? '—' : `${days}d`}</td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-400">Nog geen gebruikers</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
