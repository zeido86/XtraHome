import { authOptions } from "@/lib/auth";
import { ensureNextAuthUrl } from "@/lib/auth-url";
import NextAuth from "next-auth";

ensureNextAuthUrl();

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
