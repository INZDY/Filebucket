import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const isDev = process.env.NODE_ENV === "development";

const providers = [];

if (isDev) {
  providers.push(
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = credentialsSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsedCredentials.data.email },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValidPassword = await compare(
          parsedCredentials.data.password,
          user.passwordHash,
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    })
  );
}

// Enable Google and GitHub OAuth providers with explicit fallback mappings
providers.push(
  Google({
    clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET,
    allowDangerousEmailAccountLinking: true,
  }),
  GitHub({
    clientId: process.env.AUTH_GITHUB_ID || process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET,
    allowDangerousEmailAccountLinking: true,
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Automatically trust host headers in serverless/Vercel environments
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, restrict access to the single admin email
      if (account?.provider === "google" || account?.provider === "github") {
        const adminEmail = process.env.FILEBUCKET_ADMIN_EMAIL;
        if (!adminEmail || user.email !== adminEmail) {
          return false; // Reject sign in
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub);
      }

      return session;
    },
  },
});
