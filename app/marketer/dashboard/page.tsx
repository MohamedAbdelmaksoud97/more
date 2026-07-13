import { DashboardOverview } from "@/components/erp/dashboard-overview";
import { PageHeader } from "@/components/erp/app-shell";
import { DashboardCard, Panel } from "@/components/ui/cards";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { orderStatusLabels } from "@/lib/constants";
import { requireRole } from "@/lib/auth";
import { getDashboardStats, listOrders, listProducts, listTargets } from "@/lib/data/repository";
import { formatCurrency, formatOrderNumber } from "@/lib/utils";

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
      {user.role === "marketer" ? (
        <div className="grid min-w-0 gap-6">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <DashboardCard label="إجمالي المبيعات التي حققتها" value={stats.totalSales} tone="blue" />
            <DashboardCard label="عمولتك المعلقة" value={stats.pendingCommissions} tone="yellow" />
          </div>

          <Panel title="أحدث طلباتك">
            <DataTable className="-mx-1 sm:mx-0" tableClassName="min-w-[720px] lg:min-w-full" headers={["الطلب", "العميل", "المنتج", "القيمة", "الحالة"]}>
              {orders.slice(0, 6).map((order) => (
                <tr key={order.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
                  <td className="max-w-40 truncate px-4 py-3">{order.customer.customerName}</td>
                  <td className="max-w-44 truncate px-4 py-3">{order.productName}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatCurrency(order.finalPrice * order.quantity)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} label={orderStatusLabels[order.status]} />
                  </td>
                </tr>
              ))}
            </DataTable>
          </Panel>
        </div>
      ) : (
        <DashboardOverview stats={stats} orders={orders} products={products} targets={targets.filter((target) => target.marketerId === user.uid)} />
      )}
    </>
  );
}
