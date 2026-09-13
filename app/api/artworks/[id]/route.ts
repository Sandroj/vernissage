import { NextResponse } from 'next/server'
export async function PATCH() {
  return NextResponse.json({ error: 'Artwork type is catalogue-managed and read-only.' }, { status: 405 })
}
