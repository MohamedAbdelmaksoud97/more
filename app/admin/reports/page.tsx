import { PageHeader } from "@/components/erp/app-shell";
import { ReportsView } from "@/components/erp/report-views";
import { requireRole } from "@/lib/auth";
import { getDashboardStats, listOrders, listProducts } from "@/lib/data/repository";

export default async function AdminReportsPage() {
  const user = await requireRole(["admin"]);
  const [stats, orders, products] = await Promise.all([getDashboardStats(user), listOrders(user), listProducts()]);
  const summary = encodeURIComponent(`ملخص MORE Energy: المبيعات ${stats.totalSales}، صافي النقدية ${stats.netCash}`);
  return (
    <>
      <PageHeader
        title="التقارير المالية"
        description="فلاتر التقارير قابلة للتوسعة حسب التاريخ والمسوق والمنسق والمنتج وحالة الطلب."
        action={<a className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white" href={`https://wa.me/?text=${summary}`} target="_blank" rel="noreferrer">مشاركة واتساب</a>}
      />
      <ReportsView stats={stats} orders={orders} products={products} />
    </>
  );
}
