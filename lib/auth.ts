import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, UserProfile } from "@/lib/types";
import { getAdminAuth, getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { demoCurrentUser } from "@/lib/data/demo";

export class AuthorizationError extends Error {
  constructor(message = "غير مصرح بتنفيذ هذا الإجراء") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  if (!hasFirebaseAdminConfig()) {
    return process.env.NODE_ENV === "production" ? null : demoCurrentUser;
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const bearer = headerStore.get("authorization")?.replace(/^Bearer\s+/i, "");
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!bearer && !sessionCookie) return null;

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) return null;

  try {
    const decoded = bearer
      ? await auth.verifyIdToken(bearer)
      : await auth.verifySessionCookie(sessionCookie as string, true);
    const snap = await db.collection("users").doc(decoded.uid).get();
    if (!snap.exists) return null;
    return snap.data() as UserProfile;
  } catch {
    return null;
  }
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "PENDING_EMAIL_VERIFICATION") redirect("/verify-email");
  if (user.status === "PENDING" || user.status === "PENDING_ADMIN_APPROVAL") redirect("/pending-approval");
  if (user.status !== "APPROVED") throw new AuthorizationError("الحساب غير مفعل");
  return user;
}

export async function requireRole(allowed: Role[]) {
  const user = await requireUser();
  if (!allowed.includes(user.role)) throw new AuthorizationError();
  return user;
}

export function assertRole(user: UserProfile, allowed: Role[]) {
  if (!allowed.includes(user.role)) throw new AuthorizationError();
}

export function canReadOrder(user: UserProfile, marketerId: string) {
  return user.role === "admin" || user.role === "coordinator" || user.uid === marketerId;
}
