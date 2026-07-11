import { DashboardOverview } from "@/components/erp/dashboard-overview";
import { PageHeader } from "@/components/erp/app-shell";
import { requireRole } from "@/lib/auth";
import { getDashboardStats, listOrders, listProducts } from "@/lib/data/repository";

export default async function CoordinatorDashboardPage() {
  const user = await requireRole(["coordinator", "admin"]);
  const [stats, orders, products] = await Promise.all([getDashboardStats(user), listOrders(user), listProducts()]);
  return (
    <>
      <PageHeader title="لوحة العمليات" description="طلبات تحتاج مراجعة أو شحن أو تحصيل أو رجوع للمخزون." />
      <DashboardOverview stats={stats} orders={orders} products={products} />
    </>
  );
}
