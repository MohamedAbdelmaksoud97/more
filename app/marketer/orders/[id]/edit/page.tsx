import { notFound } from "next/navigation";
import { PageHeader } from "@/components/erp/app-shell";
import { OrderForm } from "@/components/forms/order-form";
import { requireRole } from "@/lib/auth";
import { getOrder, listProducts } from "@/lib/data/repository";
import { formatOrderNumber } from "@/lib/utils";

export default async function EditPendingOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["marketer"]);
  const { id } = await params;
  const [order, products] = await Promise.all([getOrder(user, id), listProducts()]);

  if (!order || order.marketerId !== user.uid || order.status !== "PENDING_REVIEW") notFound();

  const availableProducts = products.filter((product) => product.active || product.id === order.productId);

  return (
    <>
      <PageHeader
        title={`تعديل طلب ${formatOrderNumber(order)}`}
        description="يمكن تعديل بيانات الطلب بالكامل قبل اعتماد المدير أو المنسق. بعد الاعتماد يتم إرسال طلب تعديل فقط."
      />
      <OrderForm products={availableProducts} initialOrder={order} />
    </>
  );
}
