import { PageHeader } from "@/components/erp/app-shell";
import { ProductGrid } from "@/components/erp/product-views";
import { requireRole } from "@/lib/auth";
import { listProducts } from "@/lib/data/repository";

export default async function MarketerProductsPage() {
  await requireRole(["marketer", "admin"]);
  const products = (await listProducts()).filter((product) => product.active);
  return (
    <>
      <PageHeader title="المنتجات المتاحة" description="افتح معرض المنتج وحمّل الصور عالية الجودة." />
      <ProductGrid products={products} />
    </>
  );
}
