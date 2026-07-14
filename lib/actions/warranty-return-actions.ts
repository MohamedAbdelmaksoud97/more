"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import {
  warrantyReplacementFulfillmentSchema,
  warrantyReplacementSchema,
  warrantyReplacementShippingSchema,
  warrantyReturnCreateSchema,
  warrantyReturnDecisionSchema,
} from "@/lib/schemas";
import { createNotification, getOrder, getWarrantyReturn, writeAudit } from "@/lib/data/repository";
import type { Product, StockRecord, WarrantyReturn } from "@/lib/types";

export type WarrantyReturnActionState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

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

function createReturnNumber(docId: string) {
  const now = new Date();
  return `RET-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${docId
    .slice(0, 5)
    .toUpperCase()}`;
}

function warrantyIsActive(value?: string) {
  if (!value) return false;
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return end.getTime() >= Date.now();
}

function reserveStock(stock: StockRecord[], location: string) {
  return stock.map((record) => {
    if (record.location !== location) return record;
    if (record.available < 1) throw new Error("لا يوجد مخزون متاح للبطارية البديلة في هذا الموقع");
    return { ...record, available: record.available - 1, reserved: record.reserved + 1 };
  });
}

function sellReservedStock(stock: StockRecord[], location: string) {
  return stock.map((record) => {
    if (record.location !== location) return record;
    if (record.reserved < 1) throw new Error("لا توجد كمية محجوزة للبطارية البديلة");
    return { ...record, reserved: record.reserved - 1, sold: record.sold + 1 };
  });
}

function revalidateReturnPaths(id?: string) {
  revalidatePath("/admin/returns");
  revalidatePath("/coordinator/returns");
  revalidatePath("/marketer/returns");
  revalidatePath("/admin/dashboard");
  if (id) {
    revalidatePath(`/admin/returns/${id}`);
    revalidatePath(`/coordinator/returns/${id}`);
    revalidatePath(`/marketer/returns/${id}`);
  }
}

export async function createWarrantyReturnAction(
  _state: WarrantyReturnActionState,
  formData: FormData,
): Promise<WarrantyReturnActionState> {
  try {
    const user = await requireRole(["marketer", "admin", "coordinator"]);
    const parsed = warrantyReturnCreateSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { ok: false, message: "راجع بيانات طلب المرتجع", errors: parsed.error.flatten().fieldErrors };
    }
    const order = await getOrder(user, parsed.data.originalOrderId);
    if (!order) return { ok: false, message: "الطلب الأصلي غير موجود أو غير متاح" };
    if (!order.warrantyEndsAt) {
      return { ok: false, message: "هذا الطلب لا يحتوي على مدة ضمان مسجلة" };
    }
    if (!warrantyIsActive(order.warrantyEndsAt)) {
      return { ok: false, message: "لا يمكن إنشاء طلب مرتجع بعد انتهاء فترة الضمان" };
    }
    if (user.role === "marketer" && order.marketerId !== user.uid) {
      return { ok: false, message: "يمكنك إنشاء مرتجع لطلباتك فقط" };
    }
    if (!["PAYMENT_CONFIRMED", "COMMISSION_PENDING", "COMPLETED"].includes(order.status) && !order.isPaymentCollected) {
      return { ok: false, message: "لا يمكن إنشاء مرتجع إلا لطلب تم تسليمه أو تحصيله" };
    }
    if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم إنشاء طلب المرتجع في وضع العرض التجريبي" };
    const db = getAdminDb();
    if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

    const now = new Date().toISOString();
    const ref = db.collection("warrantyReturns").doc();
    const isDirect = parsed.data.type === "DIRECT_REPLACEMENT";
    const item: Omit<WarrantyReturn, "id"> = {
      returnNumber: createReturnNumber(ref.id),
      originalOrderId: order.id,
      originalOrderNumber: order.orderNumber,
      originalProductId: order.productId,
      originalProductName: order.productName,
      customer: order.customer,
      marketerId: order.marketerId,
      marketerName: order.marketerName,
      type: parsed.data.type,
      status: isDirect
        ? "REPLACEMENT_PENDING_REVIEW"
        : parsed.data.oldBatteryShippingBillUrl
          ? "OLD_BATTERY_IN_TRANSIT"
          : "RETURN_REQUESTED",
      warrantyUntil: order.warrantyEndsAt,
      reason: parsed.data.reason,
      usageFee: parsed.data.usageFee,
      collectedUsageFee: 0,
      oldBatteryShippingBillUrl: parsed.data.oldBatteryShippingBillUrl,
      oldBatteryShippingTrackingNumber: parsed.data.oldBatteryShippingTrackingNumber,
      oldBatteryReceived: false,
      notes: parsed.data.notes,
      timeline: [
        {
          label: isDirect ? "تم إنشاء طلب استبدال مباشر" : "تم إنشاء طلب مرتجع ضمان",
          actorName: user.name,
          at: now,
          details: parsed.data.reason,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(withoutUndefined(item));
    await writeAudit({
      actorUserId: user.uid,
      actorRole: user.role,
      action: "warranty_return.create",
      entityType: "warrantyReturn",
      entityId: ref.id,
      after: withoutUndefined(item),
    });
    await Promise.all(
      (["admin", "coordinator"] as const).map((recipientRole) =>
        createNotification(
          {
            title: isDirect ? "طلب استبدال مباشر جديد" : "طلب مرتجع ضمان جديد",
            body: `${user.name} أنشأ ${item.returnNumber} للطلب ${order.orderNumber ?? order.id}`,
            type: "WARRANTY_RETURN_CREATED",
            recipientRole,
            actorUserId: user.uid,
            actorName: user.name,
            relatedEntityType: "warrantyReturn",
            relatedEntityId: ref.id,
            requiresAction: recipientRole === "coordinator",
          },
          { mirrorToAdmin: false },
        ),
      ),
    );
    revalidateReturnPaths(ref.id);
    return { ok: true, message: "تم إنشاء طلب المرتجع" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "تعذر إنشاء طلب المرتجع" };
  }
}

export async function decideWarrantyReturnAction(formData: FormData) {
  const user = await requireRole(["admin", "coordinator"]);
  const parsed = warrantyReturnDecisionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "بيانات القرار غير صحيحة" };
  const item = await getWarrantyReturn(user, parsed.data.returnId);
  if (!item) return { ok: false, message: "طلب المرتجع غير موجود" };
  if (parsed.data.decision === "REJECT" && !parsed.data.rejectionReason) {
    return { ok: false, message: "سبب الرفض مطلوب" };
  }
  if (parsed.data.decision === "APPROVE" && item.type === "INSPECTION_FIRST" && !item.oldBatteryReceived) {
    return { ok: false, message: "يجب تأكيد استلام البطارية القديمة قبل قبول المرتجع" };
  }
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تحديث المرتجع في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const now = new Date().toISOString();
  const status =
    parsed.data.decision === "RECEIVE_OLD"
      ? "OLD_BATTERY_RECEIVED"
      : parsed.data.decision === "APPROVE"
        ? "RETURN_APPROVED"
        : "RETURN_REJECTED";
  const label =
    parsed.data.decision === "RECEIVE_OLD"
      ? "تم استلام البطارية القديمة"
      : parsed.data.decision === "APPROVE"
        ? "تم قبول المرتجع"
        : "تم رفض المرتجع";

  await db.collection("warrantyReturns").doc(item.id).update(
    withoutUndefined({
      status,
      coordinatorId: user.uid,
      oldBatteryReceived: parsed.data.decision === "RECEIVE_OLD" || item.oldBatteryReceived,
      oldBatteryReceivedAt: parsed.data.decision === "RECEIVE_OLD" ? now : item.oldBatteryReceivedAt,
      rejectionReason: parsed.data.rejectionReason,
      updatedAt: now,
      timeline: [...item.timeline, { label, actorName: user.name, at: now, details: parsed.data.rejectionReason }],
    }),
  );
  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: `warranty_return.${parsed.data.decision.toLowerCase()}`,
    entityType: "warrantyReturn",
    entityId: item.id,
    before: { status: item.status },
    after: { status },
  });
  await createNotification(
    {
      title: label,
      body: `${label} لطلب ${item.returnNumber}`,
      type:
        parsed.data.decision === "REJECT"
          ? "WARRANTY_RETURN_REJECTED"
          : parsed.data.decision === "RECEIVE_OLD"
            ? "WARRANTY_RETURN_RECEIVED"
            : "WARRANTY_RETURN_APPROVED",
      recipientUserId: item.marketerId,
      actorUserId: user.uid,
      actorName: user.name,
      relatedEntityType: "warrantyReturn",
      relatedEntityId: item.id,
      requiresAction: parsed.data.decision === "APPROVE",
    },
    { mirrorToAdmin: false },
  );
  revalidateReturnPaths(item.id);
  return { ok: true, message: label };
}

export async function completeWarrantyReplacementAction(
  _state: WarrantyReturnActionState,
  formData: FormData,
): Promise<WarrantyReturnActionState> {
  try {
    const user = await requireRole(["marketer", "admin", "coordinator"]);
    const parsed = warrantyReplacementSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { ok: false, message: "راجع بيانات الاستبدال", errors: parsed.error.flatten().fieldErrors };
    const item = await getWarrantyReturn(user, parsed.data.returnId);
    if (!item) return { ok: false, message: "طلب المرتجع غير موجود" };
    if (user.role === "marketer" && item.marketerId !== user.uid) return { ok: false, message: "غير مصرح" };
    if (!["RETURN_APPROVED", "REPLACEMENT_PENDING_REVIEW"].includes(item.status)) {
      return { ok: false, message: "لا يمكن استكمال الاستبدال من الحالة الحالية" };
    }
    if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم إرسال طلب الاستبدال في وضع العرض التجريبي" };
    const db = getAdminDb();
    if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
    const productSnap = await db.collection("products").doc(parsed.data.replacementProductId).get();
    if (!productSnap.exists) return { ok: false, message: "البطارية البديلة غير موجودة" };
    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    const stock = product.stock.find((record) => record.location === parsed.data.replacementLocation);
    if (!stock || stock.available < 1) return { ok: false, message: "لا يوجد مخزون متاح للبديل في الموقع المحدد" };
    const now = new Date().toISOString();
    await db.collection("warrantyReturns").doc(item.id).update({
      replacementProductId: product.id,
      replacementProductName: product.name,
      replacementLocation: parsed.data.replacementLocation,
      usageFee: parsed.data.usageFee,
      notes: parsed.data.notes || item.notes,
      status: "REPLACEMENT_PENDING_REVIEW",
      updatedAt: now,
      timeline: [
        ...item.timeline,
        { label: "تم استكمال بيانات الاستبدال", actorName: user.name, at: now, details: `قيمة الاستهلاك: ${parsed.data.usageFee}` },
      ],
    });
    await Promise.all(
      (["admin", "coordinator"] as const).map((recipientRole) =>
        createNotification(
          {
            title: "طلب استبدال بانتظار المراجعة",
            body: `${item.returnNumber} جاهز لحجز البطارية البديلة. قيمة الاستهلاك ${parsed.data.usageFee} ج.م`,
            type: "WARRANTY_RETURN_APPROVED",
            recipientRole,
            actorUserId: user.uid,
            actorName: user.name,
            relatedEntityType: "warrantyReturn",
            relatedEntityId: item.id,
            requiresAction: recipientRole === "coordinator",
          },
          { mirrorToAdmin: false },
        ),
      ),
    );
    revalidateReturnPaths(item.id);
    return { ok: true, message: "تم إرسال طلب الاستبدال للمراجعة" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "تعذر استكمال الاستبدال" };
  }
}

export async function approveWarrantyReplacementAction(formData: FormData) {
  const user = await requireRole(["admin", "coordinator"]);
  const returnId = String(formData.get("returnId") ?? "");
  const item = await getWarrantyReturn(user, returnId);
  if (!item) return { ok: false, message: "طلب المرتجع غير موجود" };
  if (item.status !== "REPLACEMENT_PENDING_REVIEW") return { ok: false, message: "طلب الاستبدال ليس بانتظار المراجعة" };
  if (!item.replacementProductId || !item.replacementLocation) return { ok: false, message: "بيانات البديل غير مكتملة" };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم قبول الاستبدال في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const productRef = db.collection("products").doc(item.replacementProductId!);
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists) throw new Error("البطارية البديلة غير موجودة");
    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    tx.update(productRef, { stock: reserveStock(product.stock, item.replacementLocation!), updatedAt: now, updatedBy: user.uid });
    tx.update(db.collection("warrantyReturns").doc(item.id), {
      status: "REPLACEMENT_APPROVED_RESERVED",
      coordinatorId: user.uid,
      updatedAt: now,
      timeline: [...item.timeline, { label: "تم قبول الاستبدال وحجز البديل", actorName: user.name, at: now }],
    });
  });
  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "warranty_return.replacement_approved",
    entityType: "warrantyReturn",
    entityId: item.id,
  });
  revalidateReturnPaths(item.id);
  return { ok: true, message: "تم قبول الاستبدال وحجز البطارية البديلة" };
}

export async function uploadWarrantyReplacementShippingAction(
  _state: WarrantyReturnActionState,
  formData: FormData,
): Promise<WarrantyReturnActionState> {
  const user = await requireRole(["admin", "coordinator"]);
  const parsed = warrantyReplacementShippingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "ارفع بوليصة صحيحة", errors: parsed.error.flatten().fieldErrors };
  const item = await getWarrantyReturn(user, parsed.data.returnId);
  if (!item) return { ok: false, message: "طلب المرتجع غير موجود" };
  if (!["REPLACEMENT_APPROVED_RESERVED", "REPLACEMENT_SHIPPED"].includes(item.status)) {
    return { ok: false, message: "يمكن شحن البديل بعد قبول الاستبدال وحجز المخزون فقط" };
  }
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم رفع بوليصة البديل في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const now = new Date().toISOString();
  await db.collection("warrantyReturns").doc(item.id).update({
    replacementShippingBillUrl: parsed.data.documentUrl,
    status: "REPLACEMENT_SHIPPED",
    updatedAt: now,
    timeline: [...item.timeline, { label: "تم شحن البطارية البديلة", actorName: user.name, at: now }],
  });
  await createNotification(
    {
      title: "تم شحن البطارية البديلة",
      body: `تم شحن البديل لطلب ${item.returnNumber}`,
      type: "WARRANTY_REPLACEMENT_SHIPPED",
      recipientUserId: item.marketerId,
      actorUserId: user.uid,
      actorName: user.name,
      relatedEntityType: "warrantyReturn",
      relatedEntityId: item.id,
      requiresAction: false,
    },
    { mirrorToAdmin: false },
  );
  revalidateReturnPaths(item.id);
  return { ok: true, message: "تم رفع بوليصة البديل وتحديث الحالة" };
}

export async function confirmWarrantyFulfillmentAction(
  _state: WarrantyReturnActionState,
  formData: FormData,
): Promise<WarrantyReturnActionState> {
  const user = await requireRole(["admin", "coordinator"]);
  const parsed = warrantyReplacementFulfillmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "راجع بيانات التسليم", errors: parsed.error.flatten().fieldErrors };
  const item = await getWarrantyReturn(user, parsed.data.returnId);
  if (!item) return { ok: false, message: "طلب المرتجع غير موجود" };
  if (!["REPLACEMENT_SHIPPED", "REPLACEMENT_APPROVED_RESERVED"].includes(item.status)) {
    return { ok: false, message: "يمكن التأكيد بعد قبول أو شحن البديل فقط" };
  }
  if (parsed.data.collectedUsageFee !== item.usageFee) {
    return { ok: false, message: `قيمة الاستهلاك المطلوبة هي ${item.usageFee}` };
  }
  if (item.type === "DIRECT_REPLACEMENT" && !parsed.data.oldBatteryReceived) {
    return { ok: false, message: "يجب تأكيد استلام البطارية القديمة في الاستبدال المباشر" };
  }
  if (!item.replacementProductId || !item.replacementLocation) return { ok: false, message: "بيانات البديل غير مكتملة" };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم إكمال الاستبدال في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const productRef = db.collection("products").doc(item.replacementProductId!);
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists) throw new Error("البطارية البديلة غير موجودة");
    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    tx.update(productRef, { stock: sellReservedStock(product.stock, item.replacementLocation!), updatedAt: now, updatedBy: user.uid });
    tx.update(db.collection("warrantyReturns").doc(item.id), withoutUndefined({
      status: "REPLACEMENT_COMPLETED",
      oldBatteryReceived: item.oldBatteryReceived || parsed.data.oldBatteryReceived,
      oldBatteryReceivedAt: item.oldBatteryReceivedAt ?? (parsed.data.oldBatteryReceived ? now : undefined),
      collectedUsageFee: parsed.data.collectedUsageFee,
      updatedAt: now,
      timeline: [
        ...item.timeline,
        {
          label: "اكتمل الاستبدال وتحصيل قيمة الاستهلاك",
          actorName: user.name,
          at: now,
          details: `قيمة الاستهلاك: ${parsed.data.collectedUsageFee}`,
        },
      ],
    }));
  });
  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "warranty_return.completed",
    entityType: "warrantyReturn",
    entityId: item.id,
    after: { usageFee: parsed.data.collectedUsageFee },
  });
  await createNotification(
    {
      title: "اكتمل طلب الاستبدال",
      body: `تم إكمال ${item.returnNumber} وتحصيل قيمة الاستهلاك`,
      type: "WARRANTY_REPLACEMENT_COMPLETED",
      recipientUserId: item.marketerId,
      actorUserId: user.uid,
      actorName: user.name,
      relatedEntityType: "warrantyReturn",
      relatedEntityId: item.id,
      requiresAction: false,
    },
  );
  revalidateReturnPaths(item.id);
  revalidatePath("/admin/inventory");
  revalidatePath("/coordinator/inventory");
  return { ok: true, message: "تم إكمال الاستبدال" };
}
