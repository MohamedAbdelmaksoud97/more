import { PageHeader } from "@/components/erp/app-shell";
import { OrdersTable } from "@/components/erp/order-views";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";

export default async function ShippingOrdersPage() {
  const user = await requireRole(["coordinator", "admin"]);
  const orders = (await listOrders(user)).filter((order) => ["APPROVED_RESERVED", "PREPARING_SHIPPING", "SHIPPED"].includes(order.status));
  return (
    <>
      <PageHeader title="الشحن والتسليم" description="رفع بوليصة الشحن وإيصالات التسليم من Cloudinary." />
      <OrdersTable orders={orders} basePath="/coordinator/orders" />
    </>
  );
}
