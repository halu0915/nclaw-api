import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const isProd = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = isProd ? ".nplusstar.ai" : undefined;
const COOKIE_PREFIX = isProd ? "__Secure-" : "";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: isProd,
  domain: COOKIE_DOMAIN,
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: { params: { prompt: "select_account" } },
      checks: ["nonce"],
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Honor callbackUrl if it's same-origin (relative) or *.nplusstar.ai
      try {
        if (url.startsWith("/")) return baseUrl + url;
        const u = new URL(url);
        if (
          u.hostname === "nplusstar.ai" ||
          u.hostname.endsWith(".nplusstar.ai")
        ) {
          return u.toString();
        }
      } catch {}
      return baseUrl + "/dashboard";
    },
  },
  // Cross-subdomain cookie scope so design.nplusstar.ai also sees the session.
  cookies: {
    sessionToken: { name: `${COOKIE_PREFIX}authjs.session-token`, options: cookieOpts },
    callbackUrl: { name: `${COOKIE_PREFIX}authjs.callback-url`, options: cookieOpts },
    csrfToken: { name: `${COOKIE_PREFIX}authjs.csrf-token`, options: cookieOpts },
    pkceCodeVerifier: {
      name: `${COOKIE_PREFIX}authjs.pkce.code_verifier`,
      options: { ...cookieOpts, maxAge: 900 },
    },
    state: { name: `${COOKIE_PREFIX}authjs.state`, options: { ...cookieOpts, maxAge: 900 } },
    nonce: { name: `${COOKIE_PREFIX}authjs.nonce`, options: cookieOpts },
  },
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
});
