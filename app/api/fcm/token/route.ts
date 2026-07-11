import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";

const schema = z.object({ token: z.string().min(20) });

export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "رمز الإشعارات غير صحيح" }, { status: 400 });
  if (!hasFirebaseAdminConfig()) return NextResponse.json({ ok: true, demo: true });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Firebase Admin غير مهيأ" }, { status: 500 });
  await db.collection("fcmTokens").doc(parsed.data.token).set({
    token: parsed.data.token,
    userId: user.uid,
    role: user.role,
    updatedAt: new Date().toISOString(),
  });
  await db.collection("users").doc(user.uid).set({ fcmTokens: [parsed.data.token], updatedAt: new Date().toISOString() }, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await requireUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !hasFirebaseAdminConfig()) return NextResponse.json({ ok: true });
  const db = getAdminDb();
  await db?.collection("fcmTokens").doc(parsed.data.token).delete();
  return NextResponse.json({ ok: true });
}
