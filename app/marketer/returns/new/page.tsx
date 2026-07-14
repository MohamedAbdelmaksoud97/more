import { PageHeader } from "@/components/erp/app-shell";
import { WarrantyReturnCreateForm } from "@/components/forms/warranty-return-forms";
import { requireRole } from "@/lib/auth";
import { listOrders } from "@/lib/data/repository";

const deliveredStatuses = new Set(["PAYMENT_CONFIRMED", "COMMISSION_PENDING", "COMPLETED"]);

function hasActiveWarranty(warrantyEndsAt?: string) {
  if (!warrantyEndsAt) return false;
  const end = new Date(warrantyEndsAt);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return end.getTime() >= Date.now();
}

export default async function NewWarrantyReturnPage() {
  const user = await requireRole(["marketer"]);
  const orders = (await listOrders(user)).filter(
    (order) => (deliveredStatuses.has(order.status) || order.isPaymentCollected) && hasActiveWarranty(order.warrantyEndsAt),
  );

  return (
    <>
      <PageHeader
        title="طلب مرتجع ضمان جديد"
        description="اختر الطلب الأصلي داخل الضمان وحدد هل سيتم فحص البطارية أولا أم استبدالها مباشرة."
      />
      <WarrantyReturnCreateForm orders={orders} />
    </>
  );
}
