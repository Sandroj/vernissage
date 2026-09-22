#!/usr/bin/env node
// Genereert de Apple "client secret" (een ES256-JWT) voor Sign in with Apple.
// Draait volledig lokaal — de .p8-private key verlaat deze machine niet.
//
// Gebruik:
//   node scripts/generate-apple-client-secret.mjs \
//     --team-id ABCDE12345 \
//     --client-id gallery.seen.app.signin \
//     --key-id XXXXXXXXXX \
//     --key-path ~/Downloads/AuthKey_XXXXXXXXXX.p8
//
// Output: de JWT-string op stdout — kopieer die naar Vercel als APPLE_CLIENT_SECRET.
// Apple staat max. 6 maanden geldigheid toe; zet een reminder om te vernieuwen.

import { readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

const teamId = arg('team-id')
const clientId = arg('client-id')
const keyId = arg('key-id')
const keyPath = arg('key-path')
const days = Number(arg('days') ?? 180) // Apple-max is 6 maanden (~183 dagen)

if (!teamId || !clientId || !keyId || !keyPath) {
  console.error(
    'Gebruik: node scripts/generate-apple-client-secret.mjs --team-id <TeamID> --client-id <ServiceID> --key-id <KeyID> --key-path <pad/naar/AuthKey.p8>'
  )
  process.exit(1)
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const privateKey = readFileSync(keyPath, 'utf8')
const now = Math.floor(Date.now() / 1000)

const header = { alg: 'ES256', kid: keyId }
const payload = {
  iss: teamId,
  iat: now,
  exp: now + days * 24 * 60 * 60,
  aud: 'https://appleid.apple.com',
  sub: clientId,
}

const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`

const sign = createSign('SHA256')
sign.update(signingInput)
sign.end()
// ES256/JWS wil raw R||S-signature, geen DER — vandaar ieee-p1363.
const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })

console.log(`${signingInput}.${base64url(signature)}`)
