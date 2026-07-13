import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";

const schema = z.object({ idToken: z.string().min(20) });
const SESSION_MAX_AGE = 60 * 60 * 24 * 5;

function authErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
}

function sessionErrorResponse(error: unknown) {
  const code = authErrorCode(error);
  if (code === "8" || code === "resource-exhausted") {
    return NextResponse.json(
      {
        error: "تم تجاوز حصة Firestore الحالية. انتظر إعادة ضبط الحصة أو فعّل/راجع خطة Firebase Billing.",
        code,
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { error: "تعذر التحقق من الجلسة", code },
    { status: code.startsWith("auth/") ? 401 : 500 },
  );
}

export async function POST(request: Request) {
  if (!hasFirebaseAdminConfig()) return NextResponse.json({ ok: true, demo: true });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "رمز الدخول غير صحيح" }, { status: 400 });

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) return NextResponse.json({ error: "Firebase Admin غير مهيأ" }, { status: 500 });

  try {
    const decoded = await auth.verifyIdToken(parsed.data.idToken);
    const authUser = await auth.getUser(decoded.uid);
    const user = await db.collection("users").doc(decoded.uid).get();
    if (!user.exists) return NextResponse.json({ error: "الحساب غير مسجل في النظام" }, { status: 403 });

    const data = user.data() ?? {};
    const status = data.status;
    const role = data.role;
    if (!authUser.emailVerified && status !== "APPROVED") {
      return NextResponse.json(
        { error: "يرجى تأكيد البريد الإلكتروني أولا", status: "PENDING_EMAIL_VERIFICATION" },
        { status: 403 },
      );
    }
    if (status === "PENDING_EMAIL_VERIFICATION") {
      return NextResponse.json({ error: "يرجى تأكيد البريد الإلكتروني أولا", status }, { status: 403 });
    }
    if (status === "PENDING" || status === "PENDING_ADMIN_APPROVAL") {
      return NextResponse.json(
        { error: "الحساب بانتظار مراجعة المدير", status: "PENDING_ADMIN_APPROVAL" },
        { status: 403 },
      );
    }
    if (status !== "APPROVED") {
      return NextResponse.json({ error: "الحساب غير مفعل", status }, { status: 403 });
    }

    const cookieStore = await cookies();
    const sessionCookie = await auth.createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    cookieStore.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return NextResponse.json({ ok: true, status, role });
  } catch (error) {
    console.error("Session verification failed", { code: authErrorCode(error) });
    return sessionErrorResponse(error);
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");
  return NextResponse.json({ ok: true });
}
