"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";

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
  if (!snap.exists || (item?.recipientUserId && item.recipientUserId !== user.uid && user.role !== "admin")) {
    return { ok: false, message: "غير مصرح" };
  }
  await ref.update({ isRead: true });
  revalidatePath("/notifications");
  return { ok: true, message: "تم تعليم الإشعار كمقروء" };
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تحديث الإشعارات في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const snap = await db.collection("notifications").where("recipientUserId", "==", user.uid).where("isRead", "==", false).get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.update(doc.ref, { isRead: true }));
  await batch.commit();
  revalidatePath("/notifications");
  return { ok: true, message: "تم تعليم كل الإشعارات كمقروءة" };
}
