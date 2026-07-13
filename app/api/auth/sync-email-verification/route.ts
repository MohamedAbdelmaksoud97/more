import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { createNotification } from "@/lib/data/repository";

const schema = z.object({ idToken: z.string().min(20) });

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
}

function errorResponse(error: unknown) {
  const code = errorCode(error);
  if (code === "8" || code === "resource-exhausted") {
    return NextResponse.json(
      {
        error: "تم تجاوز حصة Firestore الحالية. انتظر إعادة ضبط الحصة أو فعّل/راجع خطة Firebase Billing.",
        code,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ error: "تعذر تحديث حالة تأكيد البريد", code }, { status: 500 });
}

export async function POST(request: Request) {
  try {
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
      const now = new Date().toISOString();
      const hasAnyUser = !(await db.collection("users").limit(1).get()).empty;
      const role = hasAnyUser ? "marketer" : "admin";
      const status = hasAnyUser
        ? authUser.emailVerified
          ? "PENDING_ADMIN_APPROVAL"
          : "PENDING_EMAIL_VERIFICATION"
        : "APPROVED";
      const name = authUser.displayName || "مستخدم جديد";

      await userRef.set({
        uid: decoded.uid,
        name,
        email: authUser.email ?? decoded.email ?? "",
        phone: "",
        role,
        status,
        emailVerified: authUser.emailVerified,
        ...(authUser.emailVerified ? { emailVerifiedAt: now } : {}),
        fcmTokens: [],
        commissionType: "PERCENTAGE",
        commissionValue: 0,
        createdAt: now,
        updatedAt: now,
      });
      await auth.setCustomUserClaims(decoded.uid, { role, status });

      if (hasAnyUser && status === "PENDING_ADMIN_APPROVAL") {
        await createNotification({
          title: "حساب جديد بانتظار الموافقة",
          body: `${name} أكد البريد وينتظر اعتماد المدير`,
          type: "USER_REGISTERED",
          recipientRole: "admin",
          actorUserId: decoded.uid,
          actorName: name,
          relatedEntityType: "user",
          relatedEntityId: decoded.uid,
          requiresAction: true,
        });
      }

      return NextResponse.json({ ok: true, status, emailVerified: authUser.emailVerified, repaired: true });
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
  } catch (error) {
    console.error("Email verification sync failed", { code: errorCode(error) });
    return errorResponse(error);
  }
}
