import { notFound } from "next/navigation";
import { PageHeader } from "@/components/erp/app-shell";
import { WarrantyReturnDetailView } from "@/components/erp/warranty-return-views";
import { requireRole } from "@/lib/auth";
import { getWarrantyReturn, listProducts } from "@/lib/data/repository";

export default async function CoordinatorReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["coordinator"]);
  const { id } = await params;
  const [item, products] = await Promise.all([getWarrantyReturn(user, id), listProducts()]);
  if (!item) notFound();

  return (
    <>
      <PageHeader title={`مرتجع ${item.returnNumber}`} description="مراجعة البطارية القديمة وتشغيل شحن البديل وتأكيد التحصيل." />
      <WarrantyReturnDetailView item={item} products={products.filter((product) => product.active)} role="coordinator" />
    </>
  );
}
