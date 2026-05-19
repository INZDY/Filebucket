import type { Session } from "next-auth";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

export type AuthSession = {
  email: string;
  user: Session["user"];
};

export async function getSession(): Promise<AuthSession | null> {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  return {
    email: session.user.email,
    user: session.user,
  };
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
