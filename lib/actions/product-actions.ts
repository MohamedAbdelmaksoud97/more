"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminDb, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { imageRequestSchema, productSchema } from "@/lib/schemas";
import type { Product, Role } from "@/lib/types";
import { createNotification, writeAudit } from "@/lib/data/repository";

export type ActionState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

function readJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const value = formData.get(key);
  if (!value) return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function parseProductForm(formData: FormData, uploadedBy: string) {
  const stock = readJsonField(formData, "stock", []);
  const images = readJsonField<Array<Record<string, unknown>>>(formData, "images", []).map((image) => ({
    ...image,
    uploadedBy,
    createdAt: typeof image.createdAt === "string" ? image.createdAt : new Date().toISOString(),
  }));

  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    costPrice: formData.get("costPrice") || undefined,
    category: formData.get("category"),
    active: formData.getAll("active").includes("true"),
    stock,
    images,
  });
}

export async function createProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["admin", "coordinator"]);
  const parsed = parseProductForm(formData, user.uid);
  if (!parsed.success) {
    return { ok: false, message: "راجع بيانات المنتج", errors: parsed.error.flatten().fieldErrors };
  }
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم حفظ المنتج في وضع العرض التجريبي" };

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const product: Omit<Product, "id"> = {
    ...parsed.data,
    createdBy: user.uid,
    updatedBy: user.uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const ref = await db.collection("products").add(product);

  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "product.create",
    entityType: "product",
    entityId: ref.id,
    after: product,
  });
  await createNotification({
    title: "تمت إضافة منتج",
    body: `تمت إضافة ${product.name}`,
    type: "PRODUCT_CREATED",
    recipientRole: "admin",
    actorUserId: user.uid,
    actorName: user.name,
    relatedEntityType: "product",
    relatedEntityId: ref.id,
    requiresAction: false,
  });

  revalidatePath("/admin/products");
  revalidatePath("/coordinator/products");
  revalidatePath("/marketer/products");
  return { ok: true, message: "تمت إضافة المنتج بنجاح" };
}

export async function updateProductAction(id: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["admin", "coordinator"]);
  const parsed = parseProductForm(formData, user.uid);
  if (!parsed.success) {
    return { ok: false, message: "راجع بيانات المنتج", errors: parsed.error.flatten().fieldErrors };
  }
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم تحديث المنتج في وضع العرض التجريبي" };

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const ref = db.collection("products").doc(id);
  const before = await ref.get();
  if (!before.exists) return { ok: false, message: "المنتج غير موجود" };

  const beforeData = before.data();
  const after = {
    ...parsed.data,
    updatedBy: user.uid,
    updatedAt: new Date().toISOString(),
  };
  await ref.update(after);

  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: beforeData?.price !== parsed.data.price ? "product.price_change" : "product.update",
    entityType: "product",
    entityId: id,
    before: beforeData,
    after,
  });
  await createNotification({
    title: "تم تحديث منتج",
    body: `تم تحديث ${parsed.data.name}`,
    type: beforeData?.price !== parsed.data.price ? "PRODUCT_PRICE_CHANGED" : "PRODUCT_UPDATED",
    recipientRole: "admin",
    actorUserId: user.uid,
    actorName: user.name,
    relatedEntityType: "product",
    relatedEntityId: id,
    requiresAction: false,
  });

  revalidatePath("/admin/products");
  revalidatePath("/coordinator/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath(`/coordinator/products/${id}`);
  revalidatePath(`/marketer/products/${id}`);
  return { ok: true, message: "تم تحديث المنتج بنجاح" };
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  const user = await requireRole(["admin"]);
  if (!hasFirebaseAdminConfig()) return { ok: true, message: "تم حذف المنتج في وضع العرض التجريبي" };

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const ref = db.collection("products").doc(id);
  const before = await ref.get();
  if (!before.exists) return { ok: false, message: "المنتج غير موجود" };
  await ref.update({ active: false, deletedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "product.delete",
    entityType: "product",
    entityId: id,
    before: before.data(),
    after: { active: false },
  });
  revalidatePath("/admin/products");
  revalidatePath("/coordinator/products");
  return { ok: true, message: "تم تعطيل المنتج" };
}

export async function setProductActiveAction(id: string, active: boolean): Promise<ActionState> {
  const user = await requireRole(["admin", "coordinator"]);
  if (!hasFirebaseAdminConfig()) {
    return { ok: true, message: active ? "تم تفعيل المنتج في وضع العرض التجريبي" : "تم تعطيل المنتج في وضع العرض التجريبي" };
  }

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };
  const ref = db.collection("products").doc(id);
  const before = await ref.get();
  if (!before.exists) return { ok: false, message: "المنتج غير موجود" };

  await ref.update({
    active,
    deletedAt: active ? FieldValue.delete() : FieldValue.serverTimestamp(),
    updatedBy: user.uid,
    updatedAt: new Date().toISOString(),
  });

  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: active ? "product.enable" : "product.disable",
    entityType: "product",
    entityId: id,
    before: before.data(),
    after: { active },
  });

  revalidatePath("/admin/products");
  revalidatePath("/coordinator/products");
  revalidatePath("/marketer/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath(`/coordinator/products/${id}`);
  revalidatePath(`/marketer/products/${id}`);
  return { ok: true, message: active ? "تم تفعيل المنتج" : "تم تعطيل المنتج" };
}

export async function requestProductImagesAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["marketer"]);
  const parsed = imageRequestSchema.safeParse({
    productId: formData.get("productId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "راجع تفاصيل طلب الصور",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!hasFirebaseAdminConfig()) {
    return { ok: true, message: "تم إرسال طلب الصور في وضع العرض التجريبي" };
  }

  const db = getAdminDb();
  if (!db) return { ok: false, message: "Firebase Admin غير مهيأ" };

  const productSnap = await db.collection("products").doc(parsed.data.productId).get();
  if (!productSnap.exists) return { ok: false, message: "المنتج غير موجود" };

  const product = productSnap.data() as Product;
  const now = new Date().toISOString();
  const request = {
    productId: parsed.data.productId,
    productName: product.name,
    requesterId: user.uid,
    requesterName: user.name,
    notes: parsed.data.notes,
    status: "OPEN",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("imageRequests").add(request);
  const recipients: Role[] = ["admin", "coordinator"];

  await Promise.all(
    recipients.map((recipientRole) =>
      createNotification({
        title: "طلب صور إضافية",
        body: `${user.name} طلب صور إضافية لمنتج ${product.name}: ${parsed.data.notes}`,
        type: "PRODUCT_IMAGES_REQUESTED",
        recipientRole,
        actorUserId: user.uid,
        actorName: user.name,
        relatedEntityType: "product",
        relatedEntityId: parsed.data.productId,
        requiresAction: true,
      }),
    ),
  );

  await writeAudit({
    actorUserId: user.uid,
    actorRole: user.role,
    action: "product.images_request",
    entityType: "imageRequest",
    entityId: ref.id,
    after: { ...request, createdAt: now, updatedAt: now },
  });

  revalidatePath(`/marketer/products/${parsed.data.productId}`);
  revalidatePath("/admin/notifications");
  revalidatePath("/coordinator/notifications");
  return { ok: true, message: "تم إرسال طلب الصور للمدير والمنسق" };
}
