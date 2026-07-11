import { PageHeader } from "@/components/erp/app-shell";
import { ProductGrid } from "@/components/erp/product-views";
import { ProductForm } from "@/components/forms/product-form";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { listProducts } from "@/lib/data/repository";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  await requireRole(["admin"]);
  const [products, params] = await Promise.all([listProducts(), searchParams]);
  const showAddForm = params.add === "1";

  return (
    <>
      <PageHeader
        title="المنتجات"
        description="إدارة المنتجات والصور والأسعار والكميات المتاحة في المعرض والمخزن ومخزن المورد."
        action={<ButtonLink href="/admin/products?add=1#add-product">إضافة منتج</ButtonLink>}
      />
      <div className="grid min-w-0 gap-6">
        <section className="min-w-0">
          <h2 className="mb-4 text-lg font-black text-slate-950">المنتجات الحالية</h2>
          <ProductGrid products={products} basePath="/admin/products" orderPath="/admin/orders/new" />
        </section>
        {showAddForm ? (
          <section id="add-product" className="min-w-0 scroll-mt-24">
            <ProductForm />
          </section>
        ) : null}
      </div>
    </>
  );
}
