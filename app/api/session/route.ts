import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";

const schema = z.object({ idToken: z.string().min(20) });

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
    cookieStore.set("__session", parsed.data.idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    return NextResponse.json({ ok: true, status, role });
  } catch {
    return NextResponse.json({ error: "تعذر التحقق من الجلسة" }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");
  return NextResponse.json({ ok: true });
}
