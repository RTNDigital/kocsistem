"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { initialsFrom } from "@/lib/utils";
import bcrypt from "bcryptjs";

export type AuthState = { error: string | null };

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geçersiz e-posta veya şifre." };
    throw e; // redirect hatalarını yeniden fırlat
  }
  return { error: null };
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "Lütfen adınızı girin." };
  if (password.length < 6) return { error: "Şifre en az 6 karakter olmalı." };

  const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) return { error: "Bu e-posta zaten kullanımda." };

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id
  `;

  const initials = initialsFrom(name);
  const colors = ["#5B5BF5", "#2E7D6A", "#C84B7A", "#E6884E", "#8B5BD9", "#3E7CE0"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  await db`
    INSERT INTO profiles (id, email, name, initials, color)
    VALUES (${user.id}, ${email}, ${name}, ${initials}, ${color})
  `;

  await db`SELECT seed_demo_workspace(${user.id as string}::uuid)`;

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Kayıt başarılı ama giriş yapılamadı. Lütfen giriş yapın." };
    throw e;
  }
  return { error: null };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
  revalidatePath("/", "layout");
  redirect("/login");
}
