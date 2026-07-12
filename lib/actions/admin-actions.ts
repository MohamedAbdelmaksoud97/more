"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getAdminAuth, getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import {
  commissionSettingsSchema,
  expenseSchema,
  resetCommissionsSchema,
  resetTargetSchema,
  roleSchema,
  targetSchema,
  userStatusSchema,
} from "@/lib/schemas";
import { createNotification, writeAudit } from "@/lib/data/repository";
import type { Order } from "@/lib/types";

type ActionState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> };

function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => withoutUndefined(item)).filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, withoutUndefined(item)]),
    ) as T;
  }
  return value;
}

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

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
    before: withoutUndefined(before.data()),
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

export async function createExpenseAction(_state: ActionState, formData: FormData): Promise<ActionState> {
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

export async function upsertTargetAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole(["admin"]);
  const parsed = targetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "راجع بيانات الهدف", errors: parsed.error.flatten().fieldErrors };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم حفظ الهدف في وضع العرض التجريبي" };

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const userSnap = await db.collection("users").doc(parsed.data.marketerId).get();
  if (!userSnap.exists || userSnap.data()?.role !== "marketer") return { ok: false, message: "اختر مسوقا صحيحا" };

  const marketerName = userSnap.data()?.name ?? "مسوق";
  const id = `${parsed.data.marketerId}_${parsed.data.year}_${parsed.data.month}`;
  const targetRef = db.collection("targets").doc(id);
  const before = await targetRef.get();
  const beforeData = before.data();
  const achievedAmount = Number(beforeData?.achievedAmount ?? 0);
  const payload = {
    ...parsed.data,
    marketerName,
    achievedAmount,
    remainingAmount: Math.max(0, parsed.data.targetAmount - achievedAmount),
    updatedBy: actor.uid,
    updatedAt: new Date().toISOString(),
    createdAt: beforeData?.createdAt ?? new Date().toISOString(),
  };

  await targetRef.set(payload, { merge: true });
  await writeAudit({
    actorUserId: actor.uid,
    actorRole: actor.role,
    action: "target.upsert",
    entityType: "target",
    entityId: id,
    before: withoutUndefined(beforeData),
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
  revalidatePath("/admin/dashboard");
  revalidatePath("/marketer/target");
  return { ok: true, message: "تم حفظ الهدف" };
}

export async function updateMarketerCommissionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole(["admin"]);
  const parsed = commissionSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "راجع بيانات العمولة", errors: parsed.error.flatten().fieldErrors };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم حفظ إعداد العمولة في وضع العرض التجريبي" };

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const ref = db.collection("users").doc(parsed.data.marketerId);
  const before = await ref.get();
  if (!before.exists) return { ok: false, message: "المسوق غير موجود" };
  const beforeData = before.data();
  if (beforeData?.role !== "marketer") return { ok: false, message: "يمكن تحديد العمولة للمسوقين فقط" };

  const payload = {
    commissionType: parsed.data.commissionType,
    commissionValue: parsed.data.commissionValue,
    updatedAt: new Date().toISOString(),
  };
  await ref.update(payload);
  await writeAudit({
    actorUserId: actor.uid,
    actorRole: actor.role,
    action: "commission.settings_update",
    entityType: "user",
    entityId: parsed.data.marketerId,
    before: withoutUndefined({
      commissionType: beforeData?.commissionType,
      commissionValue: beforeData?.commissionValue,
    }),
    after: payload,
  });
  await createNotification({
    title: "تم تحديث إعداد العمولة",
    body:
      parsed.data.commissionType === "PERCENTAGE"
        ? `عمولتك أصبحت ${parsed.data.commissionValue}% من قيمة الطلب المحصل.`
        : `عمولتك أصبحت ${parsed.data.commissionValue} ج.م لكل طلب محصل.`,
    type: "COMMISSION_PENDING",
    recipientUserId: parsed.data.marketerId,
    actorUserId: actor.uid,
    actorName: actor.name,
    relatedEntityType: "commission",
    relatedEntityId: parsed.data.marketerId,
    requiresAction: false,
  });

  revalidatePath("/admin/commissions");
  revalidatePath("/admin/users");
  revalidatePath("/marketer/commissions");
  return { ok: true, message: "تم حفظ إعداد العمولة" };
}

export async function resetMonthlyCommissionsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole(["admin"]);
  const parsed = resetCommissionsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "اختر شهر وسنة صحيحين", errors: parsed.error.flatten().fieldErrors };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تصفير عمولات الشهر في وضع العرض التجريبي" };

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const { start, end } = monthRange(parsed.data.year, parsed.data.month);
  const snap = await db
    .collection("orders")
    .where("createdAt", ">=", start)
    .where("createdAt", "<", end)
    .limit(500)
    .get();
  const resettable = snap.docs
    .map((doc) => ({ ref: doc.ref, order: { id: doc.id, ...doc.data() } as Order }))
    .filter(({ order }) => ["EXPECTED", "PENDING", "APPROVED"].includes(order.commissionStatus));

  if (!resettable.length) return { ok: true, message: "لا توجد عمولات قابلة للتصفير لهذا الشهر" };

  const batch = db.batch();
  const now = new Date().toISOString();
  resettable.forEach(({ ref, order }) => {
    batch.update(ref, {
      commissionStatus: "EXPECTED",
      commissionAmount: 0,
      updatedAt: now,
      timeline: [
        ...(order.timeline ?? []),
        { label: "تم تصفير العمولة الشهرية", actorName: actor.name, at: now, details: `${parsed.data.month}/${parsed.data.year}` },
      ],
    });
  });
  await batch.commit();
  await writeAudit({
    actorUserId: actor.uid,
    actorRole: actor.role,
    action: "commission.monthly_reset",
    entityType: "commission",
    entityId: `${parsed.data.year}_${parsed.data.month}`,
    after: { month: parsed.data.month, year: parsed.data.year, affectedOrders: resettable.length },
  });

  revalidatePath("/admin/commissions");
  revalidatePath("/admin/dashboard");
  revalidatePath("/marketer/commissions");
  return { ok: true, message: `تم تصفير ${resettable.length} عمولة لهذا الشهر` };
}

export async function resetTargetAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole(["admin"]);
  const parsed = resetTargetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "الهدف غير صحيح", errors: parsed.error.flatten().fieldErrors };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تصفير الهدف في وضع العرض التجريبي" };

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const ref = db.collection("targets").doc(parsed.data.targetId);
  const before = await ref.get();
  if (!before.exists) return { ok: false, message: "الهدف غير موجود" };
  const target = before.data();
  const payload = {
    achievedAmount: 0,
    remainingAmount: Number(target?.targetAmount ?? 0),
    updatedBy: actor.uid,
    updatedAt: new Date().toISOString(),
  };

  await ref.update(payload);
  await writeAudit({
    actorUserId: actor.uid,
    actorRole: actor.role,
    action: "target.reset",
    entityType: "target",
    entityId: parsed.data.targetId,
    before: withoutUndefined(target),
    after: payload,
  });
  await createNotification({
    title: "تم تصفير الهدف الشهري",
    body: `تم تصفير المحقق لهدف ${target?.month}/${target?.year}.`,
    type: "TARGET_UPDATED",
    recipientUserId: String(target?.marketerId ?? ""),
    actorUserId: actor.uid,
    actorName: actor.name,
    relatedEntityType: "report",
    relatedEntityId: parsed.data.targetId,
    requiresAction: false,
  });

  revalidatePath("/admin/targets");
  revalidatePath("/admin/dashboard");
  revalidatePath("/marketer/target");
  return { ok: true, message: "تم تصفير الهدف" };
}
