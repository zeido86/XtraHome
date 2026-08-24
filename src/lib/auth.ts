import bcrypt from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ensureNextAuthUrl, resolveAuthUrl } from "@/lib/auth-url";
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
      // next-auth/react always does `new URL(data.url)` — must be absolute.
      const origin = safeOrigin(baseUrl);
      if (url.startsWith("/") && !url.startsWith("//")) {
        return `${origin}${url}`;
      }
      try {
        const dest = new URL(url);
        if (dest.origin === origin) return dest.toString();
      } catch {
        // Fall through to home.
      }
      return `${origin}/`;
    },
  },
};

function safeOrigin(baseUrl: string) {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return resolveAuthUrl();
  }
}
