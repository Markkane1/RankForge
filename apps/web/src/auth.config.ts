import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  providers: [], // Credentials and Nodemailer providers are added in the main auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.userId = user.id;
        token.twoFactorEnabled = (user as any).twoFactorEnabled;
        token.twoFactorVerified = (user as any).twoFactorVerified;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
        session.user.twoFactorVerified = token.twoFactorVerified as boolean;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
} satisfies NextAuthConfig;
