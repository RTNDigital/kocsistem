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
    if (e instanceof AuthError) return { error: "Invalid email or password." };
    throw e; // re-throw redirect errors
  }
  return { error: null };
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "Please enter your name." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: "Password must contain at least one uppercase letter, one lowercase letter, and one number." };
  }

  const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) return { error: "This email is already in use." };

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id
  `;

  const initials = initialsFrom(name);
  const colors = ["#5B5BF5", "#2E7D6A", "#C84B7A", "#E6884E", "#8B5BD9", "#3E7CE0"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // The first registered user becomes admin (Scrum Master)
  const adminCheck = await db`SELECT id FROM profiles WHERE is_admin = true LIMIT 1`;
  const isFirstAdmin = adminCheck.length === 0;

  await db`
    INSERT INTO profiles (id, email, name, initials, color, is_admin)
    VALUES (${user.id}, ${email}, ${name}, ${initials}, ${color}, ${isFirstAdmin})
  `;

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Registration successful but login failed. Please sign in." };
    throw e;
  }
  return { error: null };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
  revalidatePath("/", "layout");
  redirect("/login");
}
