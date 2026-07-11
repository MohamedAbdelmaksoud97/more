import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { createNotification } from "@/lib/data/repository";

const schema = z.object({ idToken: z.string().min(20) });

export async function POST(request: Request) {
  if (!hasFirebaseAdminConfig()) {
    return NextResponse.json({ error: "Firebase Admin غير مهيأ" }, { status: 500 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "رمز الدخول غير صحيح" }, { status: 400 });
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return NextResponse.json({ error: "Firebase Admin غير مهيأ" }, { status: 500 });
  }

  const decoded = await auth.verifyIdToken(parsed.data.idToken);
  const authUser = await auth.getUser(decoded.uid);
  const userRef = db.collection("users").doc(decoded.uid);
  const snap = await userRef.get();

  if (!snap.exists) {
    return NextResponse.json({ error: "الحساب غير مسجل في النظام" }, { status: 404 });
  }

  const user = snap.data() ?? {};
  if (!authUser.emailVerified) {
    await userRef.set({ emailVerified: false, updatedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ ok: true, status: "PENDING_EMAIL_VERIFICATION", emailVerified: false });
  }

  let status = user.status;
  if (status === "PENDING_EMAIL_VERIFICATION" || status === "PENDING") {
    status = "PENDING_ADMIN_APPROVAL";
    await userRef.set(
      {
        status,
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    await auth.setCustomUserClaims(decoded.uid, { role: user.role ?? "marketer", status });
    await createNotification({
      title: "حساب جاهز للمراجعة",
      body: `${user.name ?? authUser.email} أكد البريد وينتظر اعتماد المدير`,
      type: "USER_REGISTERED",
      recipientRole: "admin",
      actorUserId: decoded.uid,
      actorName: user.name ?? authUser.email ?? "مستخدم",
      relatedEntityType: "user",
      relatedEntityId: decoded.uid,
      requiresAction: true,
    });
  } else {
    await userRef.set(
      {
        emailVerified: true,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  return NextResponse.json({ ok: true, status, emailVerified: true });
}
