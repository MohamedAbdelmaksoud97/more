import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/erp/app-shell";
import { ProductForm } from "@/components/forms/product-form";
import { Button } from "@/components/ui/button";
import { setProductActiveAction } from "@/lib/actions/product-actions";
import { requireRole } from "@/lib/auth";
import { getProduct } from "@/lib/data/repository";

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin"]);
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const nextActive = !product.active;

  async function toggleProductActive() {
    "use server";
    await setProductActiveAction(id, nextActive);
    redirect(`/admin/products/${id}`);
  }

  return (
    <>
      <PageHeader
        title={`تعديل ${product.name}`}
        description="تعديل بيانات المنتج والصور والكميات المتاحة حسب كل مخزن."
        action={
          <form action={toggleProductActive}>
            <Button type="submit" variant={product.active ? "danger" : "success"}>
              {product.active ? "تعطيل المنتج" : "تفعيل المنتج"}
            </Button>
          </form>
        }
      />
      <ProductForm product={product} />
    </>
  );
}
