import { DashboardCard, Panel } from "@/components/ui/cards";
import type { DashboardStats, Order, Product, Target } from "@/lib/types";
import { DataTable } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { orderStatusLabels } from "@/lib/constants";
import { formatCurrency, formatOrderNumber } from "@/lib/utils";

export function DashboardOverview({
  stats,
  orders,
  products,
  targets,
}: {
  stats: DashboardStats;
  orders: Order[];
  products: Product[];
  targets?: Target[];
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="إجمالي المبيعات" value={stats.totalSales} tone="blue" />
        <DashboardCard label="صافي النقدية" value={stats.netCash} tone="green" />
        <DashboardCard label="عمولات معلقة" value={stats.pendingCommissions} tone="yellow" />
        <DashboardCard label="المصروفات" value={stats.expenses} tone="gray" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="أحدث الطلبات">
          <DataTable headers={["الطلب", "العميل", "المنتج", "القيمة", "الحالة"]}>
            {orders.slice(0, 6).map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
                <td className="px-4 py-3">{order.customer.customerName}</td>
                <td className="px-4 py-3">{order.productName}</td>
                <td className="px-4 py-3">{formatCurrency(order.finalPrice * order.quantity)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} label={orderStatusLabels[order.status]} />
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
        <Panel title="تنبيهات المخزون">
          <div className="grid gap-3">
            {products.map((product) => {
              const available = product.stock.reduce((sum, item) => sum + item.available, 0);
              return (
                <div key={product.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex justify-between gap-3">
                    <p className="font-bold">{product.name}</p>
                    <span className="text-sm font-black text-blue-700">{available}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(available * 4, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {targets?.length ? (
            <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              الهدف النشط: {formatCurrency(targets[0].achievedAmount)} من {formatCurrency(targets[0].targetAmount)}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
