import { PageHeader } from "@/components/erp/app-shell";
import { Panel } from "@/components/ui/cards";
import { DataTable } from "@/components/ui/table";
import { commissionStatusLabels } from "@/lib/constants";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";
import { formatCurrency, formatOrderNumber } from "@/lib/utils";

export default async function MarketerCommissionsPage() {
  const user = await requireRole(["marketer", "admin"]);
  const orders = await listOrders(user);
  const pending = orders
    .filter((order) => ["EXPECTED", "PENDING"].includes(order.commissionStatus))
    .reduce((sum, order) => sum + order.commissionAmount, 0);
  const approved = orders
    .filter((order) => order.commissionStatus === "APPROVED")
    .reduce((sum, order) => sum + order.commissionAmount, 0);
  const paid = orders
    .filter((order) => order.commissionStatus === "PAID")
    .reduce((sum, order) => sum + order.commissionAmount, 0);

  return (
    <div className="grid gap-6">
      <PageHeader title="عمولاتي" description="المتوقع والمعلق والمعتمد والمدفوع والخصومات." />

      <div className="grid gap-4 md:grid-cols-4">
        <Panel title="إعداد العمولة الحالي">
          <p className="text-2xl font-black text-slate-950">
            {user.commissionType === "FIXED" ? formatCurrency(user.commissionValue ?? 0) : `${user.commissionValue ?? 0}%`}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {user.commissionType === "FIXED" ? "مبلغ ثابت لكل طلب محصل" : "نسبة من قيمة الطلب المحصل"}
          </p>
        </Panel>
        <Panel title="عمولات معلقة">
          <p className="text-2xl font-black text-amber-600">{formatCurrency(pending)}</p>
        </Panel>
        <Panel title="عمولات معتمدة">
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(approved)}</p>
        </Panel>
        <Panel title="عمولات مدفوعة">
          <p className="text-2xl font-black text-blue-700">{formatCurrency(paid)}</p>
        </Panel>
      </div>

      <DataTable headers={["الطلب", "الحالة", "القيمة"]}>
        {orders.map((order) => (
          <tr key={order.id}>
            <td className="px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
            <td className="px-4 py-3">{commissionStatusLabels[order.commissionStatus]}</td>
            <td className="px-4 py-3">{formatCurrency(order.commissionAmount)}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
