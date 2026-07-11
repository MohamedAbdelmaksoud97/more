import { DashboardOverview } from "@/components/erp/dashboard-overview";
import { PageHeader } from "@/components/erp/app-shell";
import { requireRole } from "@/lib/auth";
import { getDashboardStats, listOrders, listProducts, listTargets } from "@/lib/data/repository";

export default async function AdminDashboardPage() {
  const user = await requireRole(["admin"]);
  const [stats, orders, products, targets] = await Promise.all([
    getDashboardStats(user),
    listOrders(user),
    listProducts(),
    listTargets(),
  ]);
  return (
    <>
      <PageHeader title="لوحة تحكم المدير" description="نظرة شاملة على المبيعات والمخزون والعمولات." />
      <DashboardOverview stats={stats} orders={orders} products={products} targets={targets} />
    </>
  );
}
