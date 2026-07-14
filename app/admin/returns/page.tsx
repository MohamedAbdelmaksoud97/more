import { PageHeader } from "@/components/erp/app-shell";
import { WarrantyReturnsTable } from "@/components/erp/warranty-return-views";
import { requireRole } from "@/lib/auth";
import { listWarrantyReturns } from "@/lib/data/repository";

export default async function AdminReturnsPage() {
  const user = await requireRole(["admin"]);
  const items = await listWarrantyReturns(user);

  return (
    <>
      <PageHeader
        title="مرتجعات الضمان"
        description="متابعة طلبات الاسترجاع والاستبدال خارج مسار البيع العادي وبدون أي عمولات."
      />
      <WarrantyReturnsTable items={items} basePath="/admin/returns" />
    </>
  );
}
