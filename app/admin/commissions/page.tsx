import { PageHeader } from "@/components/erp/app-shell";
import { DataTable } from "@/components/ui/table";
import { commissionStatusLabels } from "@/lib/constants";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";
import { formatCurrency, formatOrderNumber } from "@/lib/utils";

export default async function AdminCommissionsPage() {
  const user = await requireRole(["admin"]);
  const orders = await listOrders(user);
  return (
    <>
      <PageHeader title="العمولات" description="العمولة لا تعتمد إلا بعد اكتمال التسليم والتحصيل والإيصالات." />
      <DataTable headers={["الطلب", "المسوق", "الحالة", "القيمة"]}>
        {orders.map((order) => (
          <tr key={order.id}>
            <td className="px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
            <td className="px-4 py-3">{order.marketerName}</td>
            <td className="px-4 py-3">{commissionStatusLabels[order.commissionStatus]}</td>
            <td className="px-4 py-3">{formatCurrency(order.commissionAmount)}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
