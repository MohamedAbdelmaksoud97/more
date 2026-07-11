import { PageHeader } from "@/components/erp/app-shell";
import { OrdersTable } from "@/components/erp/order-views";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";

export default async function ReturnOrdersPage() {
  const user = await requireRole(["coordinator", "admin"]);
  const orders = (await listOrders(user)).filter((order) => ["FAILED_DELIVERY", "RETURNED_PENDING_STOCK", "RETURNED_TO_STOCK"].includes(order.status));
  return (
    <>
      <PageHeader title="المرتجعات" description="لا تعود الكمية للمخزون إلا بعد تأكيد الرجوع الفعلي." />
      <OrdersTable orders={orders} basePath="/coordinator/orders" />
    </>
  );
}
