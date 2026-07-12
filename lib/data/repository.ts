import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb, getAdminMessaging, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import type {
  AuditLog,
  DashboardStats,
  Expense,
  NotificationItem,
  Order,
  OrderStatus,
  Product,
  Role,
  Target,
  UserProfile,
} from "@/lib/types";
import {
  demoExpenses,
  demoNotifications,
  demoOrders,
  demoProducts,
  demoStats,
  demoTargets,
  demoUsers,
} from "@/lib/data/demo";
import { canReadOrder } from "@/lib/auth";

function fromDoc<T>(doc: FirebaseFirestore.DocumentSnapshot): T {
  const data = doc.data() ?? {};
  return JSON.parse(
    JSON.stringify(
      { id: doc.id, ...data },
      (_key, value) => (value instanceof Timestamp ? value.toDate().toISOString() : value),
    ),
  ) as T;
}

function dbOrNull() {
  if (!hasFirebaseAdminConfig()) return null;
  return getAdminDb();
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

export async function listUsers(): Promise<UserProfile[]> {
  const db = dbOrNull();
  if (!db) return demoUsers;
  const snap = await db.collection("users").orderBy("createdAt", "desc").limit(200).get();
  return snap.docs.map((doc) => fromDoc<UserProfile>(doc));
}

export async function listProducts(): Promise<Product[]> {
  const db = dbOrNull();
  if (!db) return demoProducts;
  const snap = await db.collection("products").orderBy("updatedAt", "desc").limit(200).get();
  return snap.docs.map((doc) => fromDoc<Product>(doc));
}

export async function getProduct(id: string): Promise<Product | null> {
  const db = dbOrNull();
  if (!db) return demoProducts.find((product) => product.id === id) ?? null;
  const snap = await db.collection("products").doc(id).get();
  return snap.exists ? fromDoc<Product>(snap) : null;
}

export async function listOrders(viewer: UserProfile, status?: OrderStatus): Promise<Order[]> {
  const db = dbOrNull();
  const filterOrder = (order: Order) =>
    canReadOrder(viewer, order.marketerId) && (!status || order.status === status);

  if (!db) return demoOrders.filter(filterOrder);

  let query: FirebaseFirestore.Query = db.collection("orders");
  if (viewer.role === "marketer") query = query.where("marketerId", "==", viewer.uid);
  if (status) query = query.where("status", "==", status);
  const snap = await query.limit(300).get();
  return snap.docs
    .map((doc) => fromDoc<Order>(doc))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getOrder(viewer: UserProfile, id: string): Promise<Order | null> {
  const db = dbOrNull();
  if (!db) {
    const order = demoOrders.find((item) => item.id === id) ?? null;
    return order && canReadOrder(viewer, order.marketerId) ? order : null;
  }
  const snap = await db.collection("orders").doc(id).get();
  if (!snap.exists) return null;
  const order = fromDoc<Order>(snap);
  return canReadOrder(viewer, order.marketerId) ? order : null;
}

export async function listNotifications(viewer: UserProfile): Promise<NotificationItem[]> {
  const db = dbOrNull();
  if (!db) {
    return demoNotifications.filter(
      (item) => item.recipientUserId === viewer.uid || item.recipientRole === viewer.role || viewer.role === "admin",
    );
  }
  const byUser = await db
    .collection("notifications")
    .where("recipientUserId", "==", viewer.uid)
    .limit(50)
    .get();
  const byRole = await db
    .collection("notifications")
    .where("recipientRole", "==", viewer.role)
    .limit(50)
    .get();
  const merged = new Map<string, NotificationItem>();
  [...byUser.docs, ...byRole.docs].forEach((doc) => merged.set(doc.id, fromDoc<NotificationItem>(doc)));
  return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listTargets(): Promise<Target[]> {
  const db = dbOrNull();
  if (!db) return demoTargets;
  const snap = await db.collection("targets").orderBy("updatedAt", "desc").limit(200).get();
  return snap.docs.map((doc) => fromDoc<Target>(doc));
}

export async function listExpenses(): Promise<Expense[]> {
  const db = dbOrNull();
  if (!db) return demoExpenses;
  const snap = await db.collection("expenses").orderBy("createdAt", "desc").limit(200).get();
  return snap.docs.map((doc) => fromDoc<Expense>(doc));
}

export async function getDashboardStats(viewer: UserProfile): Promise<DashboardStats> {
  const db = dbOrNull();
  if (!db) return demoStats;

  const orders = await listOrders(viewer);
  const expenses = await listExpenses();
  const paidOrders = orders.filter(
    (order) =>
      order.isPaymentCollected ||
      ["PAYMENT_CONFIRMED", "COMMISSION_PENDING", "COMPLETED"].includes(order.status),
  );
  const orderTotal = (order: Order) => order.finalPrice * order.quantity;
  const cashCollected = (order: Order) => {
    if (order.collectedAmount !== undefined) return order.collectedAmount + order.payment.depositAmount;
    return orderTotal(order);
  };
  const totalSales = paidOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const collectedCash = paidOrders.reduce((sum, order) => sum + cashCollected(order), 0);
  const paidCommissions = orders
    .filter((order) => order.commissionStatus === "PAID")
    .reduce((sum, order) => sum + order.commissionAmount, 0);
  const approvedCommissions = orders
    .filter((order) => order.commissionStatus === "APPROVED")
    .reduce((sum, order) => sum + order.commissionAmount, 0);
  const pendingCommissions = orders
    .filter((order) => ["EXPECTED", "PENDING"].includes(order.commissionStatus))
    .reduce((sum, order) => sum + order.commissionAmount, 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const scrapValue = orders.reduce((sum, order) => sum + (order.scrap.confirmedValue ?? order.scrap.scrapEstimatedValue ?? 0), 0);

  return {
    totalSales,
    grossProfit: totalSales - paidCommissions - expenseTotal,
    netCash: collectedCash - expenseTotal,
    pendingCommissions,
    approvedCommissions,
    paidCommissions,
    expenses: expenseTotal,
    returns: orders.filter((order) => order.status.startsWith("RETURNED")).length,
    scrapValue,
  };
}

export async function writeAudit(entry: Omit<AuditLog, "id" | "createdAt">) {
  const db = dbOrNull();
  if (!db) return;
  await db.collection("audit_logs").add({ ...entry, createdAt: FieldValue.serverTimestamp() });
}

export async function createNotification(
  notification: Omit<NotificationItem, "id" | "createdAt" | "isRead">,
) {
  const db = dbOrNull();
  if (!db) return;

  await saveAndPushNotification(db, notification);

  if (notification.recipientRole !== "admin") {
    await saveAndPushNotification(db, {
      ...notification,
      recipientUserId: undefined,
      recipientRole: "admin",
      requiresAction: false,
    });
  }
}

async function saveAndPushNotification(
  db: FirebaseFirestore.Firestore,
  notification: Omit<NotificationItem, "id" | "createdAt" | "isRead">,
) {
  const payload = {
    ...notification,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  };
  const ref = await db.collection("notifications").add(withoutUndefined(payload));

  try {
    const tokenQuery = notification.recipientUserId
      ? db.collection("fcmTokens").where("userId", "==", notification.recipientUserId)
      : notification.recipientRole
        ? db.collection("fcmTokens").where("role", "==", notification.recipientRole)
        : null;
    if (!tokenQuery) return;
    const tokenSnap = await tokenQuery.get();
    const tokens = tokenSnap.docs.map((doc) => doc.data().token).filter(Boolean);
    const messaging = getAdminMessaging();
    if (!messaging || !tokens.length) return;
    const targetPath = notificationTargetPath(notification);
    const clickUrl = `/notifications/open?id=${encodeURIComponent(ref.id)}&to=${encodeURIComponent(targetPath)}`;
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: notification.title, body: notification.body },
      data: {
        notificationId: ref.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        clickUrl,
        requiresAction: notification.requiresAction ? "true" : "false",
        relatedEntityId: notification.relatedEntityId ?? "",
      },
      webpush: {
        notification: {
          icon: "/more-power-more-energy.png",
          badge: "/favicon.ico",
          requireInteraction: notification.requiresAction,
          renotify: true,
          tag: `${notification.type}-${notification.relatedEntityId ?? ref.id}`,
        },
      },
    });
    await Promise.all(
      response.responses.map((item, index) =>
        item.success
          ? Promise.resolve()
          : tokenSnap.docs[index]?.ref.delete().catch(() => undefined),
      ),
    );
  } catch {
    // Firestore notification is already saved; push failure must not rollback the business event.
  }
}

function notificationTargetPath(notification: Omit<NotificationItem, "id" | "createdAt" | "isRead">) {
  const role = notification.recipientRole;
  const entityId = notification.relatedEntityId;

  if (notification.relatedEntityType === "order" && entityId) {
    if (role === "admin") return `/admin/orders/${entityId}`;
    if (role === "coordinator") return `/coordinator/orders/${entityId}`;
    return `/marketer/orders/${entityId}`;
  }
  if (notification.relatedEntityType === "product" && entityId) {
    if (role === "admin") return `/admin/products/${entityId}`;
    if (role === "coordinator") return `/coordinator/products/${entityId}`;
    return `/marketer/products/${entityId}`;
  }
  if (notification.relatedEntityType === "user") return "/admin/users";
  if (notification.relatedEntityType === "commission") {
    return role === "admin" ? "/admin/commissions" : "/marketer/commissions";
  }
  if (notification.type === "TARGET_UPDATED") return role === "admin" ? "/admin/targets" : "/marketer/target";
  if (notification.type === "EXPENSE_CREATED") return "/admin/expenses";
  return "/notifications";
}

export function roleCanManageProducts(role: Role) {
  return role === "admin" || role === "coordinator";
}
