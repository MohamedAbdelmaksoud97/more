import { notFound } from "next/navigation";
import { PageHeader } from "@/components/erp/app-shell";
import { ProductDetail } from "@/components/erp/product-views";
import { ImageRequestForm } from "@/components/forms/image-request-form";
import { requireRole } from "@/lib/auth";
import { getProduct } from "@/lib/data/repository";

export default async function MarketerProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ requestImages?: string }>;
}) {
  const viewer = await requireRole(["marketer", "admin", "coordinator"]);
  const { id } = await params;
  const query = await searchParams;
  const product = await getProduct(id);
  if (!product) notFound();

  const showImageRequest = viewer.role === "marketer" && query?.requestImages === "1";

  return (
    <div className="grid gap-6">
      <PageHeader title={product.name} description="معرض الصور والمخزون المتاح حسب الموقع." />
      <ProductDetail product={product} />
      {showImageRequest ? <ImageRequestForm productId={product.id} /> : null}
    </div>
  );
}
