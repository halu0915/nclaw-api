import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    async redirect({ baseUrl }) {
      return baseUrl + "/dashboard";
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
});
