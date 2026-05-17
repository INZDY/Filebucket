"use server";

import { redirect } from "next/navigation";

import { authenticate, clearSession } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || !(await authenticate(email, password))) {
    redirect("/login?error=invalid");
  }

  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
