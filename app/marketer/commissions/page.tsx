import { PageHeader } from "@/components/erp/app-shell";
import { DataTable } from "@/components/ui/table";
import { commissionStatusLabels } from "@/lib/constants";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";
import { formatCurrency, formatOrderNumber } from "@/lib/utils";

export default async function MarketerCommissionsPage() {
  const user = await requireRole(["marketer", "admin"]);
  const orders = await listOrders(user);
  return (
    <>
      <PageHeader title="عمولاتي" description="المتوقع والمعلق والمعتمد والمدفوع والخصومات." />
      <DataTable headers={["الطلب", "الحالة", "القيمة"]}>
        {orders.map((order) => (
          <tr key={order.id}>
            <td className="px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
            <td className="px-4 py-3">{commissionStatusLabels[order.commissionStatus]}</td>
            <td className="px-4 py-3">{formatCurrency(order.commissionAmount)}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
