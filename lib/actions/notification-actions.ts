"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { markNotificationsRead } from "@/lib/data/repository";

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "الإشعار غير صحيح" };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تحديث الإشعار في وضع العرض التجريبي" };

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const ref = db.collection("notifications").doc(id);
  const snap = await ref.get();
  const item = snap.data();
  const canRead =
    snap.exists &&
    (user.role === "admin" || item?.recipientUserId === user.uid || item?.recipientRole === user.role);

  if (!canRead) return { ok: false, message: "غير مصرح" };

  await ref.update({ isRead: true });
  revalidateNotificationPaths(user.role);
  return { ok: true, message: "تم تعليم الإشعار كمقروء" };
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تحديث الإشعارات في وضع العرض التجريبي" };
  await markNotificationsRead(user);
  revalidateNotificationPaths(user.role);
  return { ok: true, message: "تم تعليم كل الإشعارات كمقروءة" };
}

function revalidateNotificationPaths(role: string) {
  revalidatePath("/notifications");
  revalidatePath(`/${role}/notifications`);
  revalidatePath(`/${role}/dashboard`);
}
