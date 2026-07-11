import { notFound } from "next/navigation";
import { PageHeader } from "@/components/erp/app-shell";
import { OrderDetailView } from "@/components/erp/order-views";
import { requireRole } from "@/lib/auth";
import { getOrder } from "@/lib/data/repository";
import { formatOrderNumber } from "@/lib/utils";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["marketer", "admin", "coordinator"]);
  const { id } = await params;
  const order = await getOrder(user, id);
  if (!order) notFound();

  return (
    <>
      <PageHeader title={`طلب ${formatOrderNumber(order)}`} description="ملخص الطلب والمستندات والعمولة وخط الزمن." />
      <OrderDetailView order={order} />
    </>
  );
}
