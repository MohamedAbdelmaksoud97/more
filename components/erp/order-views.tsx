import Link from "next/link";
import type { ReactNode } from "react";
import type { Order } from "@/lib/types";
import { approveOrderAction, rejectOrderAction } from "@/lib/actions/order-actions";
import { orderStatusLabels, commissionStatusLabels, locationLabels } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/cards";
import { FulfillmentConfirmationForm } from "@/components/forms/fulfillment-confirmation-form";
import { ShippingBillForm } from "@/components/forms/shipping-bill-form";
import { DataTable } from "@/components/ui/table";
import { formatCurrency, formatDate, formatOrderNumber } from "@/lib/utils";

export function OrdersTable({ orders, basePath = "/marketer/orders" }: { orders: Order[]; basePath?: string }) {
  if (!orders.length) {
    return <EmptyState title="لا توجد طلبات" body="لا توجد طلبات مطابقة للفلاتر الحالية." />;
  }

  return (
    <DataTable headers={["رقم الطلب", "العميل", "المنتج", "الموقع", "القيمة", "الحالة", "إجراء"]}>
      {orders.map((order) => (
        <tr key={order.id}>
          <td className="px-4 py-3 font-bold">
            <Link className="text-blue-700 hover:underline" href={`${basePath}/${order.id}`}>
              {formatOrderNumber(order)}
            </Link>
          </td>
          <td className="px-4 py-3">{order.customer.customerName}</td>
          <td className="px-4 py-3">{order.productName}</td>
          <td className="px-4 py-3">{locationLabels[order.selectedLocation]}</td>
          <td className="px-4 py-3">{formatCurrency(order.finalPrice * order.quantity)}</td>
          <td className="px-4 py-3">
            <StatusBadge status={order.status} label={orderStatusLabels[order.status]} />
          </td>
          <td className="px-4 py-3">
            <ButtonLink href={`${basePath}/${order.id}`} variant="secondary" className="h-9 whitespace-nowrap">
              تحديث الحالة
            </ButtonLink>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

export function OrderDetailView({
  order,
  canReview = false,
  canConfirmFulfillment = false,
}: {
  order: Order;
  canReview?: boolean;
  canConfirmFulfillment?: boolean;
}) {
  const showReviewActions = canReview && order.status === "PENDING_REVIEW";
  const showShippingBillForm =
    canReview && ["APPROVED_RESERVED", "PREPARING_SHIPPING", "SHIPPED"].includes(order.status);
  const showFulfillmentForm =
    canConfirmFulfillment && !order.isPaymentCollected && ["SHIPPED", "DELIVERED_PENDING_CONFIRMATION"].includes(order.status);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="grid gap-6">
        {showReviewActions ? <ReviewPanel orderId={order.id} /> : null}

        <Panel title="ملخص الطلب">
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="الحالة" value={<StatusBadge status={order.status} label={orderStatusLabels[order.status]} />} />
            <Info label="رقم الطلب" value={formatOrderNumber(order)} />
            <Info label="المنتج" value={order.productName} />
            <Info label="القيمة" value={formatCurrency(order.finalPrice * order.quantity)} />
            <Info label="الكمية" value={order.quantity} />
            <Info label="الموقع" value={locationLabels[order.selectedLocation]} />
            <Info label="منشئ الطلب" value={order.marketerName} />
            {order.rejectionReason ? <Info label="سبب الرفض" value={order.rejectionReason} /> : null}
          </div>
        </Panel>

        <Panel title="بيانات العميل">
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="الاسم" value={order.customer.customerName} />
            <Info label="الهاتف" value={order.customer.customerPhone} />
            <Info label="المحافظة" value={order.customer.governorate} />
            <Info label="المنطقة" value={order.customer.area} />
            <Info label="العنوان" value={order.customer.address} />
            <Info label="ملاحظات" value={order.customer.notes ?? "لا توجد"} />
          </div>
        </Panel>

        <Panel title="الدفع والكهنة">
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="العربون" value={formatCurrency(order.payment.depositAmount)} />
            <Info label="المتبقي" value={formatCurrency(order.payment.remainingAmount)} />
            <Info label="تم التحصيل" value={order.isPaymentCollected ? "نعم" : "لا"} />
            <Info label="حالة العمولة" value={commissionStatusLabels[order.commissionStatus]} />
            <Info label="يوجد كهنة" value={order.scrap.hasScrap ? "نعم" : "لا"} />
            <Info label="نوع الكهنة" value={order.scrap.scrapType ?? "غير محدد"} />
            <Info label="الأمبير" value={order.scrap.scrapAmpere ?? "غير محدد"} />
            <Info label="قيمة الكهنة المتوقعة" value={formatCurrency(order.scrap.scrapEstimatedValue ?? 0)} />
            <Info label="ملاحظات الكهنة" value={order.scrap.scrapNotes ?? "لا توجد"} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6">
        {showFulfillmentForm ? (
          <Panel title="تأكيد التسليم والتحصيل">
            <FulfillmentConfirmationForm orderId={order.id} defaultAmount={order.payment.remainingAmount} />
          </Panel>
        ) : null}

        {showShippingBillForm ? (
          <Panel title="إضافة بوليصة الشحن">
            <ShippingBillForm orderId={order.id} currentUrl={order.shippingBillUrl} />
          </Panel>
        ) : null}

        <Panel title="المستندات">
          <DocLink label="صورة العربون" url={order.payment.depositImageUrl} />
          <DocLink label="صورة الكهنة" url={order.scrap.scrapImageUrl} />
          <DocLink label="بوليصة الشحن" url={order.shippingBillUrl} />
          <DocLink label="إيصال المنسق" url={order.deliveryReceiptByCoordinatorUrl} />
          <DocLink label="إيصال المسوق" url={order.deliveryReceiptByMarketerUrl} />
        </Panel>

        <Panel title="خط الزمن">
          <ol className="space-y-4 border-r border-slate-200 pr-4">
            {order.timeline.map((event, index) => (
              <li key={`${event.at}-${index}`} className="relative">
                <span className="absolute -right-[21px] top-1 size-3 rounded-full bg-blue-700 ring-4 ring-white" />
                <p className="font-bold">{event.label}</p>
                <p className="text-xs text-slate-500">
                  {event.actorName} - {formatDate(event.at)}
                </p>
                {event.details ? <p className="mt-1 text-sm text-slate-600">{event.details}</p> : null}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

function ReviewPanel({ orderId }: { orderId: string }) {
  async function approveOrderFormAction(formData: FormData) {
    "use server";
    await approveOrderAction(formData);
  }

  async function rejectOrderFormAction(formData: FormData) {
    "use server";
    await rejectOrderAction(formData);
  }

  return (
    <Panel title="مراجعة الطلب">
      <div className="grid gap-4">
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">
          تأكيد الطلب سيحجز الكمية من المخزون فقط. لن يتم تسجيلها كمباعة إلا بعد اكتمال الطلب.
        </p>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
          <form action={approveOrderFormAction} className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <input type="hidden" name="orderId" value={orderId} />
            <p className="mb-3 text-sm font-bold text-emerald-800">قبول الطلب وحجز المنتج في المخزون المحدد.</p>
            <Button type="submit" variant="success" className="w-full">
              تأكيد الطلب وحجز المخزون
            </Button>
          </form>

          <form action={rejectOrderFormAction} className="rounded-lg border border-red-100 bg-red-50 p-4">
            <input type="hidden" name="orderId" value={orderId} />
            <label className="grid gap-2 text-sm font-bold text-red-900">
              سبب الرفض
              <textarea
                name="reason"
                required
                minLength={3}
                className="min-h-24 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                placeholder="اكتب سبب واضح ليصل للمستخدم صاحب الطلب"
              />
            </label>
            <Button type="submit" variant="danger" className="mt-3 w-full">
              رفض الطلب
            </Button>
          </form>
        </div>
      </div>
    </Panel>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <div className="mt-1 break-words font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
      <span className="font-semibold">{label}</span>
      {url ? (
        <a className="text-sm font-bold text-blue-700" href={url} target="_blank" rel="noreferrer">
          فتح
        </a>
      ) : (
        <span className="text-sm text-slate-400">غير مرفوع</span>
      )}
    </div>
  );
}
