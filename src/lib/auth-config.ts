import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { loginCustomer, registerCustomer, getCustomerPublic } from "./customers";

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const result = loginCustomer(
          credentials.email as string,
          credentials.password as string
        );
        if ("error" in result) return null;
        const pub = getCustomerPublic(result.customer);
        return {
          id: pub.id,
          email: pub.email,
          name: pub.contactName,
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const login = loginCustomer(user.email, "__google_oauth__");
        if ("error" in login && login.error === "帳號不存在") {
          registerCustomer({
            email: user.email,
            password: "__google_oauth__" + Math.random().toString(36),
            companyName: user.name || "未設定",
            contactName: user.name || "用戶",
            phone: "",
          });
        }
      }
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
