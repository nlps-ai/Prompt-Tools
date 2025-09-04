import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { FirebaseService } from '@/lib/firebase'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        usernameOrEmail: { 
          label: '用户名或邮箱', 
          type: 'text', 
          placeholder: '请输入用户名或邮箱' 
        },
        password: { 
          label: '密码', 
          type: 'password', 
          placeholder: '请输入密码' 
        },
      },
      async authorize(credentials) {
        if (!credentials?.usernameOrEmail || !credentials?.password) {
          return null
        }

        try {
          // Verify user credentials using Firebase service
          const user = await FirebaseService.verifyUserCredentials(
            credentials.usernameOrEmail,
            credentials.password
          )

          if (user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name || user.username,
              image: user.image,
              username: user.username,
            }
          }

          return null
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      // First time user signs in
      if (user) {
        token.id = user.id
        token.username = (user as any).username
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
        // Add username to session
        ;(session.user as any).username = token.username
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === 'development',
}