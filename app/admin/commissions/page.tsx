import { PageHeader } from "@/components/erp/app-shell";
import { CommissionSettingsForm, MarketerCommissionResetForm, MonthlyCommissionResetForm } from "@/components/forms/commission-admin-forms";
import { CommissionOrderActionCell } from "@/components/forms/commission-order-actions";
import { Panel } from "@/components/ui/cards";
import { DataTable } from "@/components/ui/table";
import { commissionStatusLabels } from "@/lib/constants";
import { requireRole } from "@/lib/auth";
import { listOrders, listUsers } from "@/lib/data/repository";
import { formatCurrency, formatOrderNumber } from "@/lib/utils";

export default async function AdminCommissionsPage() {
  const user = await requireRole(["admin"]);
  const [orders, users] = await Promise.all([listOrders(user), listUsers()]);
  const marketers = users.filter((item) => item.role === "marketer");

  return (
    <div className="grid gap-6">
      <PageHeader title="العمولات" description="تحديد عمولة كل مسوق ومتابعة العمولات المتوقعة والمعلقة والمعتمدة." />

      <Panel title="إعداد عمولة المسوق" description="اختر مسوقا وحدد عمولة ثابتة أو نسبة مئوية من قيمة الطلب المحصل.">
        <CommissionSettingsForm marketers={marketers} />
      </Panel>

      <Panel title="تصفير العمولات الشهرية" description="يصفر العمولات المتوقعة والمعلقة والمعتمدة للشهر المحدد دون حذف الطلبات.">
        <MonthlyCommissionResetForm />
      </Panel>

      <Panel title="تصفير عمولة مسوق" description="يصفر العمولات غير المدفوعة لمسوق محدد فقط دون التأثير على باقي المسوقين.">
        <MarketerCommissionResetForm marketers={marketers} />
      </Panel>

      <Panel title="إعدادات المسوقين الحالية">
        <DataTable headers={["المسوق", "نوع العمولة", "القيمة"]}>
          {marketers.map((marketer) => (
            <tr key={marketer.uid}>
              <td className="px-4 py-3 font-bold">{marketer.name}</td>
              <td className="px-4 py-3">{marketer.commissionType === "FIXED" ? "مبلغ ثابت" : "نسبة مئوية"}</td>
              <td className="px-4 py-3">
                {marketer.commissionType === "FIXED"
                  ? formatCurrency(marketer.commissionValue ?? 0)
                  : `${marketer.commissionValue ?? 0}%`}
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <Panel title="سجل عمولات الطلبات">
        <DataTable headers={["الطلب", "المسوق", "الحالة", "القيمة", "الإجراء"]}>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
              <td className="px-4 py-3">{order.marketerName}</td>
              <td className="px-4 py-3">{commissionStatusLabels[order.commissionStatus]}</td>
              <td className="px-4 py-3">{formatCurrency(order.commissionAmount)}</td>
              <td className="px-4 py-3">
                <CommissionOrderActionCell orderId={order.id} status={order.commissionStatus} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
