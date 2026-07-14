"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { orderDecisionSchema, orderSchema, statusUpdateSchema } from "@/lib/schemas";
import type { Order, OrderStatus, Product, StockRecord, UserProfile } from "@/lib/types";
import { createNotification, getOrder, writeAudit } from "@/lib/data/repository";

const completionStatuses: OrderStatus[] = [
  "DELIVERED_PENDING_CONFIRMATION",
  "PAYMENT_CONFIRMED",
  "COMMISSION_PENDING",
  "COMPLETED",
];

export type OrderActionState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

function commissionCanBeApproved(order: Order) {
  const approvableStatuses: OrderStatus[] = ["PAYMENT_CONFIRMED", "COMMISSION_PENDING", "COMPLETED"];
  return (
    approvableStatuses.includes(order.status) &&
    order.isPaymentCollected &&
    !["FAILED_DELIVERY", "RETURNED_PENDING_STOCK", "RETURNED_TO_STOCK"].includes(order.status)
  );
}
function updateStock(stock: StockRecord[], location: string, quantity: number, mode: "reserve" | "sell" | "return") {
  return stock.map((record) => {
    if (record.location !== location) return record;
    if (mode === "reserve") {
      if (record.available < quantity) throw new Error("الكمية المتاحة غير كافية");
      return { ...record, available: record.available - quantity, reserved: record.reserved + quantity };
    }
    if (mode === "sell") {
      if (record.reserved < quantity) throw new Error("الكمية المحجوزة غير كافية");
      return { ...record, reserved: record.reserved - quantity, sold: record.sold + quantity };
    }
    if (record.reserved < quantity) throw new Error("الكمية المحجوزة غير كافية للمرتجع");
    return { ...record, reserved: record.reserved - quantity, available: record.available + quantity, returned: record.returned + quantity };
  });
}

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

function createOrderNumber(docId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `MORE-${year}${month}${day}-${docId.slice(0, 5).toUpperCase()}`;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  next.setHours(23, 59, 59, 999);
  return next;
}

function orderTotal(order: Pick<Order, "finalPrice" | "quantity">) {
  return order.finalPrice * order.quantity;
}

function expectedCollectionAmount(order: Order) {
  const fallback = orderTotal(order) - Number(order.payment?.depositAmount ?? 0);
  return Number(order.payment?.remainingAmount ?? fallback);
}

function sameMoneyValue(left: number, right: number) {
  return Math.abs(left - right) < 0.01;
}

function calculateCommission(marketer: Pick<UserProfile, "commissionType" | "commissionValue"> | null, total: number) {
  const value = Number(marketer?.commissionValue ?? 0);
  if (!value) return 0;
  if (marketer?.commissionType === "FIXED") return value;
  return Math.round((total * value) / 100);
}

export async function createOrderAction(_state: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    const user = await requireRole(["marketer", "admin", "coordinator"]);
    const parsed = orderSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { ok: false, message: "راجع بيانات الطلب", errors: parsed.error.flatten().fieldErrors };
    }
    if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم إنشاء الطلب في وضع العرض التجريبي" };

    const db = getAdminDb();
    if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
    const productSnap = await db.collection("products").doc(parsed.data.productId).get();
    if (!productSnap.exists) return { ok: false, message: "المنتج غير موجود" };
    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    if (!product.active) return { ok: false, message: "هذا المنتج غير نشط ولا يمكن إنشاء طلب عليه" };
    const selectedStock = product.stock.find((record) => record.location === parsed.data.selectedLocation);
    if (!selectedStock) return { ok: false, message: "موقع المخزون غير متاح لهذا المنتج" };
    if (selectedStock.available < parsed.data.quantity) {
      return { ok: false, message: `الكمية المتاحة في ${parsed.data.selectedLocation} هي ${selectedStock.available} فقط` };
    }
    if (parsed.data.discount >= product.price) {
      return { ok: false, message: "الخصم لا يمكن أن يساوي أو يتجاوز سعر المنتج" };
    }
    const finalUnitPrice = product.price - parsed.data.discount;
    if (parsed.data.depositAmount > finalUnitPrice * parsed.data.quantity) {
      return { ok: false, message: "العربون لا يمكن أن يتجاوز إجمالي الطلب" };
    }
    const remainingAmount = finalUnitPrice * parsed.data.quantity - parsed.data.depositAmount;

    const now = new Date();
    const nowIso = now.toISOString();
    const ref = db.collection("orders").doc();
    const order: Omit<Order, "id"> = {
    orderNumber: createOrderNumber(ref.id),
    customer: {
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      governorate: parsed.data.governorate,
      area: parsed.data.area,
      address: parsed.data.address,
      notes: parsed.data.notes,
    },
    productId: product.id,
    productName: product.name,
    quantity: parsed.data.quantity,
    selectedLocation: parsed.data.selectedLocation,
    finalPrice: finalUnitPrice,
    discount: parsed.data.discount,
    warrantyMonths: parsed.data.warrantyMonths,
    warrantyEndsAt: addMonths(now, parsed.data.warrantyMonths).toISOString(),
    payment: {
      hasDeposit: parsed.data.hasDeposit,
      depositAmount: parsed.data.depositAmount,
      depositImageUrl: parsed.data.depositImageUrl,
      remainingAmount,
      paymentOnDelivery: parsed.data.paymentOnDelivery,
    },
    scrap: {
      hasScrap: parsed.data.hasScrap,
      scrapType: parsed.data.scrapType,
      scrapAmpere: parsed.data.scrapAmpere,
      scrapEstimatedValue: parsed.data.scrapEstimatedValue,
      scrapImageUrl: parsed.data.scrapImageUrl,
      scrapNotes: parsed.data.scrapNotes,
      status: parsed.data.hasScrap ? "EXPECTED" : undefined,
    },
    status: "PENDING_REVIEW",
    marketerId: user.uid,
    marketerName: user.name,
    isPaymentCollected: false,
    commissionStatus: "EXPECTED",
    commissionAmount: 0,
    timeline: [{ label: "تم إنشاء الطلب", actorName: user.name, at: nowIso, details: `مدة الضمان: ${parsed.data.warrantyMonths} شهر` }],
    createdAt: nowIso,
    updatedAt: nowIso,
    };

    await ref.set(withoutUndefined(order));
    await writeAudit({
      actorUserId: user.uid,
      actorRole: user.role,
      action: "order.create",
      entityType: "order",
      entityId: ref.id,
      after: withoutUndefined(order),
    });
    await Promise.all(
      (["coordinator", "admin"] as const).map((recipientRole) =>
        createNotification(
          {
            title: "طلب جديد للمراجعة",
            body: `${user.name} أنشأ طلب ${order.orderNumber} - ${product.name}`,
            type: "ORDER_CREATED",
            recipientRole,
            actorUserId: user.uid,
            actorName: user.name,
            relatedEntityType: "order",
            relatedEntityId: ref.id,
            requiresAction: recipientRole === "coordinator",
          },
          { mirrorToAdmin: false },
        ),
      ),
    );
    revalidatePath("/marketer/orders");
    revalidatePath("/admin/orders");
    revalidatePath("/coordinator/orders");
    revalidatePath("/coordinator/orders/pending");
    return { ok: true, message: "تم إرسال الطلب للمراجعة" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إنشاء الطلب";
    return { ok: false, message };
  }
}

export async function approveOrderAction(formData: FormData) {
  const user = await requireRole(["admin", "coordinator"]);
  const parsed = orderDecisionSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return { ok: false, message: "الطلب غير صحيح" };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم قبول الطلب في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  await db.runTransaction(async (tx) => {
    const orderRef = db.collection("orders").doc(parsed.data.orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error("الطلب غير موجود");
    const order = { id: orderSnap.id, ...orderSnap.data() } as Order;
    if (order.status !== "PENDING_REVIEW") throw new Error("لا يمكن قبول هذا الطلب من حالته الحالية");
    const productRef = db.collection("products").doc(order.productId);
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists) throw new Error("المنتج غير موجود");
    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    tx.update(productRef, {
      stock: updateStock(product.stock, order.selectedLocation, order.quantity, "reserve"),
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    });
    tx.update(orderRef, {
      status: "APPROVED_RESERVED",
      coordinatorId: user.uid,
      updatedAt: new Date().toISOString(),
      timeline: [
        ...order.timeline,
        { label: "تم قبول الطلب وحجز المخزون", actorName: user.name, at: new Date().toISOString() },
      ],
    });
  });

  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "order.approve_and_reserve_stock",
    entityType: "order",
    entityId: parsed.data.orderId,
  });
  const order = await getOrder(user, parsed.data.orderId);
  if (order) {
    await createNotification({
      title: "تم قبول الطلب",
      body: `تم قبول طلب ${order.productName} وحجز المخزون`,
      type: "ORDER_APPROVED",
      recipientUserId: order.marketerId,
      actorUserId: user.uid,
      actorName: user.name,
      relatedEntityType: "order",
      relatedEntityId: order.id,
      requiresAction: false,
    });
  }
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath(`/coordinator/orders/${parsed.data.orderId}`);
  revalidatePath("/coordinator/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/coordinator/orders/pending");
  return { ok: true, message: "تم قبول الطلب وحجز الكمية" };
}

export async function rejectOrderAction(formData: FormData) {
  const user = await requireRole(["admin", "coordinator"]);
  const parsed = orderDecisionSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success || !parsed.data.reason) return { ok: false, message: "سبب الرفض مطلوب" };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم رفض الطلب في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const ref = db.collection("orders").doc(parsed.data.orderId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: "الطلب غير موجود" };
  const order = { id: snap.id, ...snap.data() } as Order;
  await ref.update({
    status: "REJECTED",
    rejectionReason: parsed.data.reason,
    coordinatorId: user.uid,
    updatedAt: new Date().toISOString(),
    timeline: [...order.timeline, { label: "تم رفض الطلب", actorName: user.name, at: new Date().toISOString(), details: parsed.data.reason }],
  });
  await createNotification({
    title: "تم رفض الطلب",
    body: parsed.data.reason,
    type: "ORDER_REJECTED",
    recipientUserId: order.marketerId,
    actorUserId: user.uid,
    actorName: user.name,
    relatedEntityType: "order",
    relatedEntityId: order.id,
    requiresAction: false,
  });
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath(`/coordinator/orders/${order.id}`);
  revalidatePath("/coordinator/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/coordinator/orders/pending");
  return { ok: true, message: "تم رفض الطلب وإبلاغ المسوق" };
}

export async function uploadShippingBillAction(_state: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    const user = await requireRole(["admin", "coordinator"]);
    const parsed = statusUpdateSchema.safeParse({
      orderId: formData.get("orderId"),
      status: "SHIPPED",
      documentUrl: formData.get("documentUrl"),
    });
    if (!parsed.success || !parsed.data.documentUrl) {
      return { ok: false, message: "ارفع بوليصة الشحن أولا" };
    }
    if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم حفظ بوليصة الشحن في وضع العرض التجريبي" };

    const db = getAdminDb();
    if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
    const ref = db.collection("orders").doc(parsed.data.orderId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, message: "الطلب غير موجود" };

    const order = { id: snap.id, ...snap.data() } as Order;
    if (!["APPROVED_RESERVED", "PREPARING_SHIPPING", "SHIPPED"].includes(order.status)) {
      return { ok: false, message: "يمكن رفع بوليصة الشحن بعد قبول الطلب وحجز المخزون فقط" };
    }

    await ref.update({
      status: "SHIPPED",
      shippingBillUrl: parsed.data.documentUrl,
      coordinatorId: user.uid,
      updatedAt: new Date().toISOString(),
      timeline: [
        ...order.timeline,
        { label: "تم رفع بوليصة الشحن", actorName: user.name, at: new Date().toISOString() },
      ],
    });

    await writeAudit({
      actorUserId: user.uid,
      actorRole: user.role,
      action: "order.shipping_bill_uploaded",
      entityType: "order",
      entityId: order.id,
      before: withoutUndefined({ status: order.status, shippingBillUrl: order.shippingBillUrl }),
      after: withoutUndefined({ status: "SHIPPED", shippingBillUrl: parsed.data.documentUrl }),
    });
    await createNotification({
      title: "تم شحن الطلب",
      body: `تم رفع بوليصة شحن طلب ${order.productName}`,
      type: "ORDER_SHIPPED",
      recipientUserId: order.marketerId,
      actorUserId: user.uid,
      actorName: user.name,
      relatedEntityType: "order",
      relatedEntityId: order.id,
      requiresAction: false,
    });

    revalidatePath(`/admin/orders/${order.id}`);
    revalidatePath(`/coordinator/orders/${order.id}`);
    revalidatePath(`/marketer/orders/${order.id}`);
    revalidatePath("/admin/orders");
    revalidatePath("/coordinator/orders");
    revalidatePath("/coordinator/orders/shipping");
    return { ok: true, message: "تم رفع بوليصة الشحن وتحديث حالة الطلب" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر حفظ بوليصة الشحن";
    return { ok: false, message };
  }
}

export async function confirmDeliveryPaymentAction(_state: OrderActionState, formData: FormData): Promise<OrderActionState> {
  try {
    const user = await requireRole(["admin", "coordinator"]);
    const documentUrl = String(formData.get("documentUrl") ?? "").trim();
    const parsed = statusUpdateSchema.safeParse({
      orderId: formData.get("orderId"),
      status: "PAYMENT_CONFIRMED",
      collectedAmount: formData.get("collectedAmount"),
      ...(documentUrl ? { documentUrl } : {}),
    });
    if (!parsed.success || parsed.data.collectedAmount === undefined) {
      return { ok: false, message: "أدخل المبلغ المستلم بشكل صحيح" };
    }
    if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تأكيد التسليم والتحصيل في وضع العرض التجريبي" };

    const db = getAdminDb();
    if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

    const now = new Date();
    const nowIso = now.toISOString();
    const result: { beforeOrder?: Order; updatedOrder?: Order } = {};
    let commissionAmount = 0;
    let targetUpdated = false;

    await db.runTransaction(async (tx) => {
      const ref = db.collection("orders").doc(parsed.data.orderId);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("الطلب غير موجود");

      const current = { id: snap.id, ...snap.data() } as Order;
      if (!["SHIPPED", "DELIVERED_PENDING_CONFIRMATION", "PAYMENT_CONFIRMED"].includes(current.status)) {
        throw new Error("يمكن تأكيد التسليم والتحصيل بعد رفع بوليصة الشحن فقط");
      }
      if (current.isPaymentCollected) {
        throw new Error("تم تأكيد تحصيل هذا الطلب مسبقا");
      }

      const expectedCollection = expectedCollectionAmount(current);
      if (!sameMoneyValue(Number(parsed.data.collectedAmount), expectedCollection)) {
        throw new Error(`المبلغ المستلم عند التسليم يجب أن يساوي المتبقي بعد العربون: ${expectedCollection}`);
      }
      const marketerSnap = await tx.get(db.collection("users").doc(current.marketerId));
      const marketer = marketerSnap.exists ? ({ uid: marketerSnap.id, ...marketerSnap.data() } as UserProfile) : null;
      const total = orderTotal(current);
      commissionAmount = calculateCommission(marketer, total);

      const targetId = `${current.marketerId}_${now.getUTCFullYear()}_${now.getUTCMonth() + 1}`;
      const targetRef = db.collection("targets").doc(targetId);
      const targetSnap = await tx.get(targetRef);
      if (targetSnap.exists) {
        const target = targetSnap.data();
        const achievedAmount = Number(target?.achievedAmount ?? 0) + total;
        tx.update(targetRef, {
          achievedAmount,
          remainingAmount: Math.max(0, Number(target?.targetAmount ?? 0) - achievedAmount),
          updatedAt: nowIso,
          updatedBy: user.uid,
        });
        targetUpdated = true;
      }

      const receiptField = parsed.data.documentUrl
        ? { deliveryReceiptByCoordinatorUrl: parsed.data.documentUrl }
        : {};
      const update = {
        ...receiptField,
        status: "PAYMENT_CONFIRMED" as const,
        collectedAmount: parsed.data.collectedAmount,
        isPaymentCollected: true,
        commissionStatus: "PENDING" as const,
        commissionAmount,
        updatedAt: nowIso,
        timeline: [
          ...current.timeline,
          {
            label: "تم تأكيد التسليم واستلام المبلغ",
            actorName: user.name,
            at: nowIso,
            details: `المبلغ المستلم: ${parsed.data.collectedAmount}`,
          },
          {
            label: "تم احتساب العمولة كقيد معلق",
            actorName: user.name,
            at: nowIso,
            details: `العمولة: ${commissionAmount}`,
          },
        ],
      };

      result.beforeOrder = current;
      result.updatedOrder = { ...current, ...update };
      tx.update(ref, withoutUndefined(update));
    });

    if (!result.beforeOrder || !result.updatedOrder) return { ok: false, message: "تعذر تحديث الطلب" };
    const beforeOrder = result.beforeOrder;
    const updatedOrder = result.updatedOrder;

    await writeAudit({
      actorUserId: user.uid,
      actorRole: user.role,
      action: "order.delivery_payment_confirmed",
      entityType: "order",
      entityId: updatedOrder.id,
      before: withoutUndefined({
        status: beforeOrder.status,
        collectedAmount: beforeOrder.collectedAmount,
        isPaymentCollected: beforeOrder.isPaymentCollected,
        commissionStatus: beforeOrder.commissionStatus,
        commissionAmount: beforeOrder.commissionAmount,
      }),
      after: withoutUndefined({
        status: "PAYMENT_CONFIRMED",
        collectedAmount: parsed.data.collectedAmount,
        isPaymentCollected: true,
        commissionStatus: "PENDING",
        commissionAmount,
        targetUpdated,
      }),
    });
    await createNotification({
      title: "تم تأكيد التسليم والتحصيل",
      body: `تم تأكيد تسليم طلب ${updatedOrder.productName} واستلام المبلغ`,
      type: "ORDER_PAYMENT_CONFIRMED",
      recipientRole: "admin",
      actorUserId: user.uid,
      actorName: user.name,
      relatedEntityType: "order",
      relatedEntityId: updatedOrder.id,
      requiresAction: false,
    });
    if (user.uid !== updatedOrder.marketerId) {
      await createNotification(
        {
          title: "تم تأكيد تحصيل الطلب",
          body: `تم تأكيد تحصيل طلب ${updatedOrder.productName}`,
          type: "ORDER_PAYMENT_CONFIRMED",
          recipientUserId: updatedOrder.marketerId,
          actorUserId: user.uid,
          actorName: user.name,
          relatedEntityType: "order",
          relatedEntityId: updatedOrder.id,
          requiresAction: false,
        },
        { mirrorToAdmin: false },
      );
    }
    await createNotification({
      title: "عمولة معلقة جديدة",
      body: `تم احتساب عمولة ${commissionAmount} ج.م على طلب ${updatedOrder.productName}`,
      type: "COMMISSION_PENDING",
      recipientUserId: updatedOrder.marketerId,
      actorUserId: user.uid,
      actorName: user.name,
      relatedEntityType: "order",
      relatedEntityId: updatedOrder.id,
      requiresAction: false,
    });

    revalidatePath(`/admin/orders/${updatedOrder.id}`);
    revalidatePath(`/coordinator/orders/${updatedOrder.id}`);
    revalidatePath(`/marketer/orders/${updatedOrder.id}`);
    revalidatePath("/admin/orders");
    revalidatePath("/coordinator/orders");
    revalidatePath("/marketer/orders");
    revalidatePath("/admin/commissions");
    revalidatePath("/marketer/commissions");
    revalidatePath("/admin/targets");
    revalidatePath("/marketer/target");
    revalidatePath("/admin/dashboard");
    revalidatePath("/marketer/dashboard");
    return { ok: true, message: "تم تأكيد التسليم واستلام المبلغ واحتساب العمولة" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تأكيد التسليم والتحصيل";
    return { ok: false, message };
  }
}

export async function updateOrderStatusAction(formData: FormData) {
  const user = await requireRole(["admin", "coordinator", "marketer"]);
  const parsed = statusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "بيانات غير صحيحة" };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تحديث الطلب في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const ref = db.collection("orders").doc(parsed.data.orderId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: "الطلب غير موجود" };
  const order = { id: snap.id, ...snap.data() } as Order;
  if (user.role === "marketer" && order.marketerId !== user.uid) return { ok: false, message: "غير مصرح" };

  const nextStatus = parsed.data.status as OrderStatus;
  if (nextStatus === "COMPLETED" && !completionStatuses.includes(order.status)) {
    return { ok: false, message: "لا يمكن إكمال الطلب قبل التسليم والتحصيل" };
  }

  if (nextStatus === "SHIPPED" && user.role === "marketer") return { ok: false, message: "غير مصرح برفع بوليصة الشحن" };
  if (nextStatus === "SHIPPED" && !["APPROVED_RESERVED", "PREPARING_SHIPPING", "SHIPPED"].includes(order.status)) {
    return { ok: false, message: "يمكن الشحن بعد قبول الطلب وحجز المخزون فقط" };
  }

  const update: Partial<Order> = {
    status: nextStatus,
    updatedAt: new Date().toISOString(),
    timeline: [...order.timeline, { label: `تغيير الحالة إلى ${nextStatus}`, actorName: user.name, at: new Date().toISOString() }],
  };
  if (parsed.data.documentUrl && nextStatus === "SHIPPED") {
    update.shippingBillUrl = parsed.data.documentUrl;
  } else if (parsed.data.documentUrl && user.role === "marketer") {
    update.deliveryReceiptByMarketerUrl = parsed.data.documentUrl;
  } else if (parsed.data.documentUrl && user.role !== "marketer") {
    update.deliveryReceiptByCoordinatorUrl = parsed.data.documentUrl;
  }
  if (parsed.data.collectedAmount !== undefined) {
    const expectedCollection = expectedCollectionAmount(order);
    if (!sameMoneyValue(Number(parsed.data.collectedAmount), expectedCollection)) {
      return { ok: false, message: `المبلغ المستلم عند التسليم يجب أن يساوي المتبقي بعد العربون: ${expectedCollection}` };
    }
    update.collectedAmount = parsed.data.collectedAmount;
    update.isPaymentCollected = true;
    update.status = "PAYMENT_CONFIRMED";
  }

  if (nextStatus === "COMPLETED") {
    await db.runTransaction(async (tx) => {
      const orderRef = db.collection("orders").doc(parsed.data.orderId);
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) throw new Error("الطلب غير موجود");
      const current = { id: orderSnap.id, ...orderSnap.data() } as Order;
      const productRef = db.collection("products").doc(current.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists) throw new Error("المنتج غير موجود");
      const product = { id: productSnap.id, ...productSnap.data() } as Product;
      tx.update(productRef, {
        stock: updateStock(product.stock, current.selectedLocation, current.quantity, "sell"),
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      });
      tx.update(orderRef, update);
    });
  } else {
    await ref.update(update);
  }
  const updated = { ...order, ...update };
  if (commissionCanBeApproved(updated)) {
    await ref.update({ commissionStatus: "PENDING" });
  }
  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "order.status_change",
    entityType: "order",
    entityId: order.id,
    before: { status: order.status },
    after: { status: update.status },
  });
  revalidatePath(`/marketer/orders/${order.id}`);
  revalidatePath("/coordinator/orders");
  return { ok: true, message: "تم تحديث الطلب" };
}

export async function returnToStockAction(formData: FormData) {
  const user = await requireRole(["admin", "coordinator"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { ok: false, message: "الطلب غير صحيح" };
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم إرجاع المخزون في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  await db.runTransaction(async (tx) => {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error("الطلب غير موجود");
    const order = { id: orderSnap.id, ...orderSnap.data() } as Order;
    if (order.status !== "RETURNED_PENDING_STOCK") throw new Error("يجب تأكيد المرتجع فعليا قبل إرجاعه للمخزون");
    const productRef = db.collection("products").doc(order.productId);
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists) throw new Error("المنتج غير موجود");
    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    tx.update(productRef, { stock: updateStock(product.stock, order.selectedLocation, order.quantity, "return") });
    tx.update(orderRef, {
      status: "RETURNED_TO_STOCK",
      commissionStatus: "CANCELLED",
      updatedAt: new Date().toISOString(),
      timeline: [...order.timeline, { label: "تم رجوع المنتج للمخزون", actorName: user.name, at: new Date().toISOString() }],
    });
  });

  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "order.return_to_stock",
    entityType: "order",
    entityId: orderId,
  });
  return { ok: true, message: "تم إرجاع الكمية للمخزون" };
}

export async function approveCommissionAction(formData: FormData) {
  const user = await requireRole(["admin"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { ok: false, message: "الطلب غير صحيح" };
  const order = await getOrder(user, orderId);
  if (!order) return { ok: false, message: "الطلب غير موجود" };
  if (order.commissionStatus !== "PENDING") {
    return { ok: false, message: "يمكن اعتماد العمولة المعلقة فقط" };
  }
  if (order.commissionAmount <= 0) {
    return { ok: false, message: "لا توجد قيمة عمولة قابلة للاعتماد" };
  }
  if (!commissionCanBeApproved(order)) {
    return { ok: false, message: "لا يمكن اعتماد العمولة قبل اكتمال التسليم والتحصيل والإيصالات" };
  }
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم اعتماد العمولة في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const now = new Date().toISOString();
  await db.collection("orders").doc(orderId).update({
    status: "COMPLETED",
    commissionStatus: "APPROVED",
    updatedAt: now,
    timeline: [
      ...(order.timeline ?? []),
      {
        label: "تم اعتماد العمولة وإكمال الطلب",
        actorName: user.name,
        at: now,
        details: `قيمة العمولة: ${order.commissionAmount}`,
      },
    ],
  });
  await db.collection("commissions").add({
    orderId,
    marketerId: order.marketerId,
    status: "APPROVED",
    amount: order.commissionAmount,
    createdAt: now,
    updatedAt: now,
  });
  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "commission.approved",
    entityType: "commission",
    entityId: orderId,
    before: { status: order.status, commissionStatus: order.commissionStatus, commissionAmount: order.commissionAmount },
    after: { status: "COMPLETED", commissionStatus: "APPROVED", commissionAmount: order.commissionAmount },
  });
  await createNotification({
    title: "تم اعتماد عمولة",
    body: `تم اعتماد عمولة طلب ${order.productName}`,
    type: "COMMISSION_APPROVED",
    recipientUserId: order.marketerId,
    actorUserId: user.uid,
    actorName: user.name,
    relatedEntityType: "order",
    relatedEntityId: orderId,
    requiresAction: false,
  });
  revalidatePath("/admin/commissions");
  revalidatePath("/marketer/commissions");
  revalidatePath("/admin/dashboard");
  revalidatePath("/marketer/dashboard");
  revalidatePath("/admin/orders");
  revalidatePath("/marketer/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/marketer/orders/${orderId}`);
  return { ok: true, message: "تم اعتماد العمولة" };
}

export async function payCommissionAction(formData: FormData) {
  const user = await requireRole(["admin"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { ok: false, message: "الطلب غير صحيح" };
  const order = await getOrder(user, orderId);
  if (!order) return { ok: false, message: "الطلب غير موجود" };
  if (order.commissionStatus !== "APPROVED") {
    return { ok: false, message: "يجب اعتماد العمولة قبل صرفها" };
  }
  if (order.commissionAmount <= 0) {
    return { ok: false, message: "لا توجد قيمة عمولة قابلة للصرف" };
  }
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم صرف العمولة في وضع العرض التجريبي" };
  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const now = new Date().toISOString();
  const commissionSnap = await db.collection("commissions").where("orderId", "==", orderId).limit(1).get();
  const batch = db.batch();
  const orderRef = db.collection("orders").doc(orderId);
  batch.update(orderRef, {
    commissionStatus: "PAID",
    updatedAt: now,
    timeline: [
      ...(order.timeline ?? []),
      {
        label: "تم صرف العمولة",
        actorName: user.name,
        at: now,
        details: `قيمة العمولة: ${order.commissionAmount}`,
      },
    ],
  });

  if (commissionSnap.empty) {
    const commissionRef = db.collection("commissions").doc();
    batch.set(commissionRef, {
      orderId,
      marketerId: order.marketerId,
      status: "PAID",
      amount: order.commissionAmount,
      createdAt: now,
      updatedAt: now,
      paidAt: now,
    });
  } else {
    batch.update(commissionSnap.docs[0].ref, {
      status: "PAID",
      amount: order.commissionAmount,
      updatedAt: now,
      paidAt: now,
    });
  }

  await batch.commit();
  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "commission.paid",
    entityType: "commission",
    entityId: orderId,
    before: { commissionStatus: order.commissionStatus, commissionAmount: order.commissionAmount },
    after: { commissionStatus: "PAID", commissionAmount: order.commissionAmount, paidAt: now },
  });
  await createNotification(
    {
      title: "تم صرف العمولة",
      body: `تم صرف عمولة طلب ${order.productName} بقيمة ${order.commissionAmount} ج.م`,
      type: "COMMISSION_PAID",
      recipientUserId: order.marketerId,
      actorUserId: user.uid,
      actorName: user.name,
      relatedEntityType: "commission",
      relatedEntityId: orderId,
      requiresAction: false,
    },
    { mirrorToAdmin: false },
  );
  await createNotification({
    title: "تم صرف عمولة",
    body: `تم صرف عمولة ${order.marketerName} لطلب ${order.productName}`,
    type: "COMMISSION_PAID",
    recipientRole: "admin",
    actorUserId: user.uid,
    actorName: user.name,
    relatedEntityType: "commission",
    relatedEntityId: orderId,
    requiresAction: false,
  });

  revalidatePath("/admin/commissions");
  revalidatePath("/marketer/commissions");
  revalidatePath("/admin/dashboard");
  revalidatePath("/marketer/dashboard");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/marketer/orders/${orderId}`);
  return { ok: true, message: "تم صرف العمولة" };
}
