"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const { error } = await auth.signIn.email({ email, password });
  if (error) {
    redirect("/login?error=invalid");
  }

  redirect("/dashboard");
}
