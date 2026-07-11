import { PageHeader } from "@/components/erp/app-shell";
import { OrdersTable } from "@/components/erp/order-views";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";

export default async function MarketerOrdersPage() {
  const user = await requireRole(["marketer", "admin"]);
  const orders = await listOrders(user);
  return (
    <>
      <PageHeader title="طلباتي" description="متابعة الطلبات والرفض والقبول والعمولة." action={<ButtonLink href="/marketer/orders/new">طلب جديد</ButtonLink>} />
      <OrdersTable orders={orders} />
    </>
  );
}
