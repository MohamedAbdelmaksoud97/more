import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { createNotification } from "@/lib/data/repository";

const schema = z.object({
  idToken: z.string().min(20).optional(),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9]{8,20}$/),
  address: z.string().min(5).max(300),
  nationalIdImageUrl: z.string().url().optional(),
  addressProofImageUrl: z.string().url().optional(),
  password: z.string().min(8).optional(),
});

export async function POST(request: Request) {
  if (!hasFirebaseAdminConfig()) {
    return NextResponse.json({ error: "Firebase Admin غير مهيأ" }, { status: 500 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "راجع بيانات التسجيل" }, { status: 400 });
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return NextResponse.json({ error: "Firebase Admin غير مهيأ" }, { status: 500 });
  }

  let uid: string;
  if (parsed.data.idToken) {
    const decoded = await auth.verifyIdToken(parsed.data.idToken);
    uid = decoded.uid;
    await auth.updateUser(uid, { displayName: parsed.data.name });
  } else {
    if (!parsed.data.password) {
      return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
    }
    try {
      const created = await auth.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        displayName: parsed.data.name,
      });
      uid = created.uid;
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code !== "auth/email-already-exists") {
        return NextResponse.json({ error: "تعذر إنشاء مستخدم Firebase Auth" }, { status: 400 });
      }
      const existing = await auth.getUserByEmail(parsed.data.email);
      uid = existing.uid;
      await auth.updateUser(uid, { password: parsed.data.password, displayName: parsed.data.name });
    }
  }

  const hasAnyUser = !(await db.collection("users").limit(1).get()).empty;
  const authUser = await auth.getUser(uid);
  const role = hasAnyUser ? "marketer" : "admin";
  const status = hasAnyUser
    ? authUser.emailVerified
      ? "PENDING_ADMIN_APPROVAL"
      : "PENDING_EMAIL_VERIFICATION"
    : "APPROVED";
  const now = new Date().toISOString();

  await db.collection("users").doc(uid).set(
    {
      uid,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      ...(parsed.data.nationalIdImageUrl ? { nationalIdImageUrl: parsed.data.nationalIdImageUrl } : {}),
      ...(parsed.data.addressProofImageUrl ? { addressProofImageUrl: parsed.data.addressProofImageUrl } : {}),
      role,
      status,
      emailVerified: authUser.emailVerified,
      ...(authUser.emailVerified ? { emailVerifiedAt: now } : {}),
      fcmTokens: [],
      commissionType: "PERCENTAGE",
      commissionValue: 0,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  await auth.setCustomUserClaims(uid, { role, status });

  if (hasAnyUser && status === "PENDING_ADMIN_APPROVAL") {
    await createNotification({
      title: "مستخدم جديد بانتظار الموافقة",
      body: `${parsed.data.name} أكد البريد وينتظر اعتماد المدير`,
      type: "USER_REGISTERED",
      recipientRole: "admin",
      actorUserId: uid,
      actorName: parsed.data.name,
      relatedEntityType: "user",
      relatedEntityId: uid,
      requiresAction: true,
    });
  }

  return NextResponse.json({ ok: true, role, status });
}
