import { PageHeader } from "@/components/erp/app-shell";
import { WarrantyReturnsTable } from "@/components/erp/warranty-return-views";
import { requireRole } from "@/lib/auth";
import { listWarrantyReturns } from "@/lib/data/repository";

export default async function CoordinatorReturnsPage() {
  const user = await requireRole(["coordinator"]);
  const items = await listWarrantyReturns(user);

  return (
    <>
      <PageHeader
        title="مرتجعات الضمان"
        description="طلبات البطاريات المرتجعة والاستبدال المطلوب مراجعتها وتشغيلها."
      />
      <WarrantyReturnsTable items={items} basePath="/coordinator/returns" />
    </>
  );
}
