"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getAdminAuth, getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { expenseSchema, roleSchema, targetSchema, userStatusSchema } from "@/lib/schemas";
import { createNotification, writeAudit } from "@/lib/data/repository";

export async function updateUserRoleAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const uid = String(formData.get("uid") ?? "");
  const role = roleSchema.parse(formData.get("role"));
  const status = userStatusSchema.parse(formData.get("status"));
  if (!uid || uid === actor.uid) return { ok: false, message: "لا يمكن للمستخدم تعديل نفسه من هنا" };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تحديث المستخدم في وضع العرض التجريبي" };
  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const ref = db.collection("users").doc(uid);
  const before = await ref.get();
  await ref.update({
    role,
    status,
    approvedBy: actor.uid,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await auth.setCustomUserClaims(uid, { role, status });
  await writeAudit({
    actorUserId: actor.uid,
    actorRole: actor.role,
    action: "user.role_or_status_change",
    entityType: "user",
    entityId: uid,
    before: before.data(),
    after: { role, status },
  });
  await createNotification({
    title: status === "APPROVED" ? "تمت الموافقة على الحساب" : "تم تحديث حالة الحساب",
    body: `حالة حسابك الآن: ${status}`,
    type: status === "APPROVED" ? "USER_APPROVED" : "USER_REJECTED",
    recipientUserId: uid,
    actorUserId: actor.uid,
    actorName: actor.name,
    relatedEntityType: "user",
    relatedEntityId: uid,
    requiresAction: false,
  });
  revalidatePath("/admin/users");
  return { ok: true, message: "تم تحديث المستخدم" };
}

export async function createExpenseAction(_state: { ok: boolean; message: string }, formData: FormData) {
  const actor = await requireRole(["admin"]);
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "راجع بيانات المصروف", errors: parsed.error.flatten().fieldErrors };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تسجيل المصروف في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const ref = await db.collection("expenses").add({ ...parsed.data, createdBy: actor.uid, createdAt: new Date().toISOString() });
  await writeAudit({
    actorUserId: actor.uid,
    actorRole: actor.role,
    action: "expense.create",
    entityType: "expense",
    entityId: ref.id,
    after: parsed.data,
  });
  await createNotification({
    title: "تم تسجيل مصروف",
    body: `${parsed.data.category}: ${parsed.data.amount}`,
    type: "EXPENSE_CREATED",
    recipientRole: "admin",
    actorUserId: actor.uid,
    actorName: actor.name,
    relatedEntityType: "report",
    relatedEntityId: ref.id,
    requiresAction: false,
  });
  revalidatePath("/admin/expenses");
  return { ok: true, message: "تم تسجيل المصروف" };
}

export async function upsertTargetAction(_state: { ok: boolean; message: string }, formData: FormData) {
  const actor = await requireRole(["admin"]);
  const parsed = targetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "راجع بيانات الهدف", errors: parsed.error.flatten().fieldErrors };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم حفظ الهدف في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const userSnap = await db.collection("users").doc(parsed.data.marketerId).get();
  const marketerName = userSnap.data()?.name ?? "مسوق";
  const id = `${parsed.data.marketerId}_${parsed.data.year}_${parsed.data.month}`;
  const payload = {
    ...parsed.data,
    marketerName,
    achievedAmount: 0,
    remainingAmount: parsed.data.targetAmount,
    updatedBy: actor.uid,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  await db.collection("targets").doc(id).set(payload, { merge: true });
  await writeAudit({
    actorUserId: actor.uid,
    actorRole: actor.role,
    action: "target.upsert",
    entityType: "target",
    entityId: id,
    after: payload,
  });
  await createNotification({
    title: "تم تحديث الهدف الشهري",
    body: `هدف ${parsed.data.month}/${parsed.data.year} أصبح ${parsed.data.targetAmount}`,
    type: "TARGET_UPDATED",
    recipientUserId: parsed.data.marketerId,
    actorUserId: actor.uid,
    actorName: actor.name,
    relatedEntityType: "report",
    relatedEntityId: id,
    requiresAction: false,
  });
  revalidatePath("/admin/targets");
  return { ok: true, message: "تم حفظ الهدف" };
}
