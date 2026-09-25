// ponytail: vaste tijdzone Europe/Amsterdam (de modal slaat lokale datum op als ISO);
// gebruikers ver buiten NL kunnen een dag verschuiven. Upgrade: tijdzone per gebruiker.
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Rijen die op dezelfde kalenderdag in een eerder jaar gezien zijn, met yearsAgo. */
export function onThisDay<T extends { dateSeen: Date | string; dateApprox: boolean }>(rows: T[], now = new Date()) {
  const [year, md] = splitYmd(now)
  return rows.flatMap((row) => {
    if (row.dateApprox) return []
    const [y, d] = splitYmd(new Date(row.dateSeen))
    return d === md && y < year ? [{ ...row, yearsAgo: year - y }] : []
  })
}

function splitYmd(date: Date): [number, string] {
  const s = ymd.format(date) // "2026-09-25"
  return [Number(s.slice(0, 4)), s.slice(5)]
}
