import { PageHeader } from "@/components/erp/app-shell";
import { OrdersTable } from "@/components/erp/order-views";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";

export default async function AdminOrdersPage() {
  const user = await requireRole(["admin"]);
  const orders = await listOrders(user);

  return (
    <>
      <PageHeader
        title="كل الطلبات"
        description="متابعة حالة الطلبات والتسليم والتحصيل والمرتجعات."
        action={<ButtonLink href="/admin/orders/new">طلب جديد</ButtonLink>}
      />
      <OrdersTable orders={orders} basePath="/admin/orders" />
    </>
  );
}
