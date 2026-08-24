import bcrypt from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ensureNextAuthUrl } from "@/lib/auth-url";
import { prisma } from "@/lib/prisma";

ensureNextAuthUrl();

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Namn eller e-post", type: "text" },
        password: { label: "Lösenord", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials.password) {
          return null;
        }

        const identifier = credentials.identifier.trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { name: { equals: identifier, mode: "insensitive" } },
            ],
          },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: "ADMIN" | "USER" }).role;
      }
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, name: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.name = dbUser.name;
          }
        } catch {
          // Keep the token if the database is temporarily unavailable.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "ADMIN" | "USER") ?? "USER";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/") && !url.startsWith("//")) {
        try {
          const origin = new URL(baseUrl).origin;
          if (origin.includes(".")) return `${origin}${url}`;
        } catch {
          // Ignore invalid NEXTAUTH_URL and keep a same-origin path.
        }
        return url;
      }
      try {
        const dest = new URL(url);
        const base = new URL(baseUrl);
        if (dest.origin === base.origin) return dest.toString();
      } catch {
        // Fall through.
      }
      return url.startsWith("/") ? url : "/";
    },
  },
};
