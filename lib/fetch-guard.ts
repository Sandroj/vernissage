import { lookup } from 'dns/promises'
import { isIP } from 'net'

const privateV4 = [/^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^17[2-9]\.(1[6-9]|2\d|3[01])\./, /^172\.(1[6-9]|2\d|3[01])\./]

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return privateV4.some((re) => re.test(address))
  const lower = address.toLowerCase()
  return lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')
}

// ponytail: single DNS resolution checked before fetch; a redirect to a
// private address later in the chain is not re-validated. Acceptable here
// because only signed-in admins can hit this endpoint. Add per-hop
// revalidation if this ever becomes reachable by untrusted input.
export async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Ongeldige URL.')
  }
  if (url.protocol !== 'https:') throw new Error('Alleen https-URL’s zijn toegestaan.')
  if (isPrivateAddress(url.hostname)) throw new Error('Deze URL wijst naar een niet-toegestaan adres.')
  const addresses = await lookup(url.hostname, { all: true }).catch(() => [])
  if (addresses.length === 0) throw new Error('Kon het adres van deze URL niet oplossen.')
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error('Deze URL wijst naar een niet-toegestaan adres.')
  return url
}
