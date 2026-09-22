import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: { id: string; isAdmin: boolean } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    // Snapshot van User.passwordChangedAt bij het uitgeven van dit token,
    // zodat een latere wachtwoordreset bestaande sessies kan intrekken.
    pwv?: number
  }
}
