import { PageHeader } from "@/components/erp/app-shell";
import { DataTable } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";
import { formatCurrency, formatOrderNumber } from "@/lib/utils";

export default async function AdminScrapPage() {
  const user = await requireRole(["admin"]);
  const orders = (await listOrders(user)).filter((order) => order.scrap.hasScrap);
  return (
    <>
      <PageHeader title="تقرير الكهنة" description="متابعة الكهنة المتوقعة والمستلمة وتعديل القيمة." />
      <DataTable headers={["الطلب", "العميل", "النوع", "الأمبير", "القيمة", "الحالة"]}>
        {orders.map((order) => (
          <tr key={order.id}>
            <td className="px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
            <td className="px-4 py-3">{order.customer.customerName}</td>
            <td className="px-4 py-3">{order.scrap.scrapType}</td>
            <td className="px-4 py-3">{order.scrap.scrapAmpere}</td>
            <td className="px-4 py-3">{formatCurrency(order.scrap.confirmedValue ?? order.scrap.scrapEstimatedValue ?? 0)}</td>
            <td className="px-4 py-3">{order.scrap.status ?? "لا يوجد"}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
