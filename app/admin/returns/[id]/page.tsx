import { notFound } from "next/navigation";
import { PageHeader } from "@/components/erp/app-shell";
import { WarrantyReturnDetailView } from "@/components/erp/warranty-return-views";
import { requireRole } from "@/lib/auth";
import { getWarrantyReturn, listProducts } from "@/lib/data/repository";

export default async function AdminReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["admin"]);
  const { id } = await params;
  const [item, products] = await Promise.all([getWarrantyReturn(user, id), listProducts()]);
  if (!item) notFound();

  return (
    <>
      <PageHeader title={`مرتجع ${item.returnNumber}`} description="إدارة قبول المرتجع، حجز البديل، الشحن والتحصيل." />
      <WarrantyReturnDetailView item={item} products={products.filter((product) => product.active)} role="admin" />
    </>
  );
}
