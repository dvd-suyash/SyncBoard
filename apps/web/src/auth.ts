import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("[AUTH_DEBUG] signIn callback started", { email: user?.email });
      try {
        // Just a quick check to see if DB is reachable
        await prisma.$queryRaw`SELECT 1`;
        console.log("[AUTH_DEBUG] Database is reachable!");
        return true;
      } catch (error) {
        console.error("[AUTH_DEBUG] DATABASE CONNECTION ERROR:", error);
        return true; // still return true so nextauth throws the real error for us to see
      }
    },
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  debug: true,
});
