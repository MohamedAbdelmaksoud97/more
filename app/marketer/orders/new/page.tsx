import { PageHeader } from "@/components/erp/app-shell";
import { OrderForm } from "@/components/forms/order-form";
import { requireRole } from "@/lib/auth";
import { listProducts } from "@/lib/data/repository";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ productId?: string }> }) {
  await requireRole(["marketer", "admin"]);
  const [products, params] = await Promise.all([listProducts(), searchParams]);
  return (
    <>
      <PageHeader title="طلب شراء جديد" description="سيذهب الطلب للمنسق للمراجعة قبل حجز المخزون." />
      <OrderForm products={products.filter((product) => product.active)} selectedProductId={params.productId} />
    </>
  );
}
