import { PageHeader } from "@/components/erp/app-shell";
import { OrdersTable } from "@/components/erp/order-views";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";

export default async function CoordinatorOrdersPage() {
  const user = await requireRole(["coordinator", "admin"]);
  const orders = await listOrders(user);

  return (
    <>
      <PageHeader
        title="طلبات العمليات"
        description="إدارة القبول والشحن والتحصيل والمرتجعات."
        action={<ButtonLink href="/coordinator/orders/new">طلب جديد</ButtonLink>}
      />
      <OrdersTable orders={orders} basePath="/coordinator/orders" />
    </>
  );
}
