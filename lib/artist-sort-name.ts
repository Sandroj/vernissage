// De meeste kunstenaars alfabetiseer je op de laatste naamwoord (achternaam).
// Een enkeling is beter bekend onder de voornaam dan de achternaam
// (Rembrandt van Rijn -> "Rembrandt") en heeft daarom een expliciete
// uitzondering nodig.
const KNOWN_AS: Record<string, string> = {
  'Rembrandt van Rijn': 'Rembrandt',
}

export function artistSortName(name: string): string {
  return KNOWN_AS[name] ?? name.trim().split(/\s+/).pop()!
}
