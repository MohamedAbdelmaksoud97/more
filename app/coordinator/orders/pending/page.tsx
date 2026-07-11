import { PageHeader } from "@/components/erp/app-shell";
import { OrdersTable } from "@/components/erp/order-views";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";

export default async function PendingOrdersPage() {
  const user = await requireRole(["coordinator", "admin"]);
  const orders = await listOrders(user, "PENDING_REVIEW");
  return (
    <>
      <PageHeader title="طلبات بانتظار المراجعة" description="قبول الطلب يحجز الكمية فقط ولا يبيعها." />
      <OrdersTable orders={orders} basePath="/coordinator/orders" />
    </>
  );
}
