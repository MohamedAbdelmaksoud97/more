import { PageHeader } from "@/components/erp/app-shell";
import { WarrantyReturnsTable } from "@/components/erp/warranty-return-views";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { listWarrantyReturns } from "@/lib/data/repository";

export default async function MarketerReturnsPage() {
  const user = await requireRole(["marketer"]);
  const items = await listWarrantyReturns(user);

  return (
    <>
      <PageHeader
        title="مرتجعات الضمان"
        description="طلبات الاستبدال الخاصة بعملائك داخل فترة الضمان، بدون احتساب أي عمولة."
        action={<ButtonLink href="/marketer/returns/new">طلب مرتجع جديد</ButtonLink>}
      />
      <WarrantyReturnsTable items={items} basePath="/marketer/returns" />
    </>
  );
}
