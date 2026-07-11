import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/notifications";
  return value;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const to = safeInternalPath(url.searchParams.get("to"));

  if (!user || !id || !hasFirebaseAdminConfig()) {
    return NextResponse.redirect(new URL(to, url.origin));
  }

  const db = getAdminDb();
  if (!db) return NextResponse.redirect(new URL(to, url.origin));

  const ref = db.collection("notifications").doc(id);
  const snap = await ref.get();
  const notification = snap.data();
  const canRead =
    snap.exists &&
    (user.role === "admin" ||
      notification?.recipientUserId === user.uid ||
      notification?.recipientRole === user.role);

  if (canRead && notification?.isRead !== true) {
    await ref.update({ isRead: true });
    revalidatePath("/notifications");
    revalidatePath(`/${user.role}/notifications`);
    revalidatePath(`/${user.role}/dashboard`);
  }

  return NextResponse.redirect(new URL(to, url.origin));
}
