import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { FirebaseService } from '@/lib/firebase'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
      }
      return session
    },
    async jwt({ token, user, account }) {
      // First time user signs in
      if (account && user) {
        try {
          // Check if user exists in Firebase
          let dbUser = await FirebaseService.getUserByEmail(user.email!)
          
          if (!dbUser) {
            // Create new user in Firebase
            dbUser = await FirebaseService.createUser({
              email: user.email!,
              name: user.name,
              image: user.image,
            })
          }

          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            picture: dbUser.image,
          }
        } catch (error) {
          console.error('Error handling user authentication:', error)
          return token
        }
      }

      // For existing sessions, get user from Firebase
      if (token.email) {
        try {
          const dbUser = await FirebaseService.getUserByEmail(token.email)
          
          if (dbUser) {
            return {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              picture: dbUser.image,
            }
          }
        } catch (error) {
          console.error('Error fetching user from Firebase:', error)
        }
      }

      return token
    },
  },
}