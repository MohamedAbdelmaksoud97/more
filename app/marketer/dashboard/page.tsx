import { DashboardOverview } from "@/components/erp/dashboard-overview";
import { PageHeader } from "@/components/erp/app-shell";
import { requireRole } from "@/lib/auth";
import { getDashboardStats, listOrders, listProducts, listTargets } from "@/lib/data/repository";

export default async function MarketerDashboardPage() {
  const user = await requireRole(["marketer", "admin"]);
  const [stats, orders, products, targets] = await Promise.all([
    getDashboardStats(user),
    listOrders(user),
    listProducts(),
    listTargets(),
  ]);
  return (
    <>
      <PageHeader title="لوحة المسوق" description="طلباتك وعمولاتك وهدفك الشهري في مكان واحد." />
      <DashboardOverview stats={stats} orders={orders} products={products} targets={targets.filter((target) => target.marketerId === user.uid)} />
    </>
  );
}
