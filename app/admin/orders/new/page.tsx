import { PageHeader } from "@/components/erp/app-shell";
import { OrderForm } from "@/components/forms/order-form";
import { requireRole } from "@/lib/auth";
import { listProducts } from "@/lib/data/repository";

export default async function AdminNewOrderPage({ searchParams }: { searchParams: Promise<{ productId?: string }> }) {
  await requireRole(["admin"]);
  const [products, params] = await Promise.all([listProducts(), searchParams]);

  return (
    <>
      <PageHeader title="طلب شراء جديد" description="إنشاء طلب جديد وإرساله للعمليات للمراجعة قبل حجز المخزون." />
      <OrderForm products={products.filter((product) => product.active)} selectedProductId={params.productId} />
    </>
  );
}
