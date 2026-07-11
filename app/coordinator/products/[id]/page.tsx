import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/erp/app-shell";
import { ProductForm } from "@/components/forms/product-form";
import { Button } from "@/components/ui/button";
import { setProductActiveAction } from "@/lib/actions/product-actions";
import { requireRole } from "@/lib/auth";
import { getProduct } from "@/lib/data/repository";

export default async function CoordinatorProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["coordinator", "admin"]);
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const nextActive = !product.active;

  async function toggleProductActive() {
    "use server";
    await setProductActiveAction(id, nextActive);
    redirect(`/coordinator/products/${id}`);
  }

  return (
    <>
      <PageHeader
        title={`تعديل ${product.name}`}
        description="تحديث بيانات المنتج والصور والمخزون المتاح للعمليات."
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
