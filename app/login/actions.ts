"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=invalid");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid");
    }

    throw error;
  }

  redirect("/");
}

export async function logoutAction() {
  await signOut({
    redirectTo: "/login",
  });
}

export async function loginWithProviderAction(provider: "google" | "github") {
  await signIn(provider, {
    redirectTo: "/",
  });
}
