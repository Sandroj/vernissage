import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    // First-time Google users choose their preferred artists before landing
    // on the dashboard; returning users still follow the requested callback.
    newUser: '/discover',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // Google verifieert e-mail; koppel aan bestaand wachtwoord-account met hetzelfde adres
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'E-mail',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Wachtwoord', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user?.password) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { passwordChangedAt: true },
        })
        token.pwv = dbUser?.passwordChangedAt?.getTime() ?? 0
        return token
      }
      // Wachtwoordreset trekt bestaande sessies in: als het wachtwoord na het
      // uitgeven van dit token is gewijzigd, is de sessie niet meer geldig.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { passwordChangedAt: true },
        })
        const currentPwv = dbUser?.passwordChangedAt?.getTime() ?? 0
        if (currentPwv !== token.pwv) {
          token.id = undefined
        }
      }
      return token
    },
    async session({ session, token }) {
      // token.id ontbreekt na een wachtwoordreset van deze sessie; laat
      // session.user.id dan bewust ongezet zodat routes de sessie afwijzen.
      if (token?.id && session.user) session.user.id = token.id
      return session
    },
  },
}
