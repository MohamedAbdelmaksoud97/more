import Link from "next/link";
import { Panel, EmptyState } from "@/components/ui/cards";
import { DataTable } from "@/components/ui/table";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  approveWarrantyReplacementAction,
  decideWarrantyReturnAction,
} from "@/lib/actions/warranty-return-actions";
import { locationLabels, warrantyReturnStatusLabels, warrantyReturnTypeLabels } from "@/lib/constants";
import type { Product, WarrantyReturn } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  WarrantyFulfillmentForm,
  WarrantyReplacementForm,
  WarrantyReplacementShippingForm,
} from "@/components/forms/warranty-return-forms";

export function WarrantyReturnsTable({ items, basePath }: { items: WarrantyReturn[]; basePath: string }) {
  if (!items.length) {
    return <EmptyState title="لا توجد مرتجعات ضمان" body="عند إنشاء طلبات مرتجع أو استبدال ستظهر هنا." />;
  }

  return (
    <DataTable headers={["رقم المرتجع", "العميل", "المنتج الأصلي", "النوع", "الحالة", "الاستهلاك", "إجراء"]}>
      {items.map((item) => (
        <tr key={item.id} className={item.type === "DIRECT_REPLACEMENT" && !item.oldBatteryReceived ? "bg-red-50/60" : undefined}>
          <td className="px-4 py-3 font-bold">
            <Link className="text-blue-700 hover:underline" href={`${basePath}/${item.id}`}>
              {item.returnNumber}
            </Link>
          </td>
          <td className="px-4 py-3">{item.customer.customerName}</td>
          <td className="px-4 py-3">{item.originalProductName}</td>
          <td className="px-4 py-3">{warrantyReturnTypeLabels[item.type]}</td>
          <td className="px-4 py-3">{warrantyReturnStatusLabels[item.status]}</td>
          <td className="px-4 py-3">{formatCurrency(item.usageFee)}</td>
          <td className="px-4 py-3">
            <ButtonLink href={`${basePath}/${item.id}`} variant="secondary" className="h-9 text-xs">
              فتح
            </ButtonLink>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

async function receiveOldBatteryFormAction(formData: FormData) {
  "use server";
  formData.set("decision", "RECEIVE_OLD");
  await decideWarrantyReturnAction(formData);
}

async function approveReturnFormAction(formData: FormData) {
  "use server";
  formData.set("decision", "APPROVE");
  await decideWarrantyReturnAction(formData);
}

async function rejectReturnFormAction(formData: FormData) {
  "use server";
  formData.set("decision", "REJECT");
  await decideWarrantyReturnAction(formData);
}

async function approveReplacementFormAction(formData: FormData) {
  "use server";
  await approveWarrantyReplacementAction(formData);
}

export function WarrantyReturnDetailView({
  item,
  products,
  role,
}: {
  item: WarrantyReturn;
  products: Product[];
  role: "admin" | "coordinator" | "marketer";
}) {
  const canCoordinate = role === "admin" || role === "coordinator";
  const canCompleteReplacement =
    (role === "marketer" || role === "admin" || role === "coordinator") &&
    ["RETURN_APPROVED", "REPLACEMENT_PENDING_REVIEW"].includes(item.status) &&
    !item.replacementProductId;
  const canApproveReplacement = canCoordinate && item.status === "REPLACEMENT_PENDING_REVIEW" && Boolean(item.replacementProductId);
  const canShipReplacement = canCoordinate && ["REPLACEMENT_APPROVED_RESERVED", "REPLACEMENT_SHIPPED"].includes(item.status);
  const canFulfill = canCoordinate && ["REPLACEMENT_APPROVED_RESERVED", "REPLACEMENT_SHIPPED"].includes(item.status);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-6">
        {item.type === "DIRECT_REPLACEMENT" && !item.oldBatteryReceived ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-black leading-7 text-red-800">
            تنبيه مهم: هذا الطلب على مسار الاستبدال المباشر. سيتم إرسال البطارية البديلة للعميل، ويجب على المندوب استلام البطارية القديمة في نفس وقت التسليم. لا يمكن إكمال المرتجع قبل تأكيد استلام البطارية القديمة.
          </div>
        ) : null}

        <Panel title="ملخص المرتجع">
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="رقم المرتجع" value={item.returnNumber} />
            <Info label="الحالة" value={warrantyReturnStatusLabels[item.status]} />
            <Info label="النوع" value={warrantyReturnTypeLabels[item.type]} />
            <Info label="الطلب الأصلي" value={item.originalOrderNumber ?? item.originalOrderId} />
            <Info label="البطارية الأصلية" value={item.originalProductName} />
            <Info label="البطارية البديلة" value={item.replacementProductName ?? "لم تحدد بعد"} />
            <Info label="موقع البديل" value={item.replacementLocation ? locationLabels[item.replacementLocation] : "لم يحدد"} />
            <Info label="قيمة الاستهلاك" value={formatCurrency(item.usageFee)} />
            <Info label="المحصل" value={formatCurrency(item.collectedUsageFee)} />
            <Info label="نهاية الضمان" value={item.warrantyUntil ? formatDate(item.warrantyUntil) : "غير محدد"} />
            <Info label="منشئ الطلب" value={item.marketerName} />
            <Info label="استلام القديمة" value={item.oldBatteryReceived ? "تم الاستلام" : "لم يتم الاستلام"} />
          </div>
        </Panel>

        <Panel title="بيانات العميل">
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="الاسم" value={item.customer.customerName} />
            <Info label="الهاتف" value={item.customer.customerPhone} />
            <Info label="المحافظة" value={item.customer.governorate} />
            <Info label="المنطقة" value={item.customer.area} />
            <Info label="العنوان" value={item.customer.address} />
            <Info label="ملاحظات العميل" value={item.customer.notes ?? "لا توجد"} />
          </div>
        </Panel>

        <Panel title="سبب المرتجع">
          <p className="text-sm font-semibold leading-7 text-slate-700">{item.reason}</p>
          {item.notes ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-600">{item.notes}</p> : null}
        </Panel>
      </div>

      <div className="grid gap-6">
        {canCoordinate && ["RETURN_REQUESTED", "OLD_BATTERY_IN_TRANSIT", "OLD_BATTERY_RECEIVED"].includes(item.status) ? (
          <Panel title="مراجعة البطارية القديمة">
            <div className="grid gap-3">
              <form action={receiveOldBatteryFormAction}>
                <input type="hidden" name="returnId" value={item.id} />
                <Button type="submit" variant="secondary" className="w-full">
                  تأكيد استلام البطارية القديمة
                </Button>
              </form>
              <form action={approveReturnFormAction}>
                <input type="hidden" name="returnId" value={item.id} />
                <Button type="submit" variant="success" className="w-full">
                  قبول المرتجع
                </Button>
              </form>
              <form action={rejectReturnFormAction} className="grid gap-3 rounded-lg border border-red-100 bg-red-50 p-3">
                <input type="hidden" name="returnId" value={item.id} />
                <textarea
                  name="rejectionReason"
                  className="min-h-24 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  placeholder="سبب الرفض"
                />
                <Button type="submit" variant="danger">
                  رفض المرتجع
                </Button>
              </form>
            </div>
          </Panel>
        ) : null}

        {canCompleteReplacement ? (
          <Panel title="استكمال بيانات الاستبدال">
            <WarrantyReplacementForm item={item} products={products} />
          </Panel>
        ) : null}

        {canApproveReplacement ? (
          <Panel title="قبول الاستبدال وحجز البديل">
            <form action={approveReplacementFormAction} className="grid gap-3">
              <input type="hidden" name="returnId" value={item.id} />
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                سيتم حجز بطارية بديلة واحدة من مخزون {item.replacementLocation ? locationLabels[item.replacementLocation] : "الموقع المحدد"}.
              </p>
              <Button type="submit" variant="success">
                قبول الاستبدال وحجز البديل
              </Button>
            </form>
          </Panel>
        ) : null}

        {canShipReplacement ? (
          <Panel title="بوليصة شحن البديل">
            <WarrantyReplacementShippingForm item={item} />
          </Panel>
        ) : null}

        {canFulfill ? (
          <Panel title="تأكيد التسليم وتحصيل الاستهلاك">
            <WarrantyFulfillmentForm item={item} />
          </Panel>
        ) : null}

        <Panel title="المستندات">
          <DocLink label="بوليصة شحن البطارية القديمة" url={item.oldBatteryShippingBillUrl} />
          <DocLink label="بوليصة شحن البديل" url={item.replacementShippingBillUrl} />
          <Info label="رقم بوليصة القديمة" value={item.oldBatteryShippingTrackingNumber ?? "غير محدد"} />
          {item.rejectionReason ? <Info label="سبب الرفض" value={item.rejectionReason} /> : null}
        </Panel>

        <Panel title="خط الزمن">
          <ol className="space-y-4 border-r border-slate-200 pr-4">
            {item.timeline.map((event, index) => (
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-black text-slate-950">{value}</div>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <span className="font-bold text-slate-700">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="font-bold text-blue-700 hover:underline">
          فتح
        </a>
      ) : (
        <span className="font-bold text-slate-400">غير مرفق</span>
      )}
    </div>
  );
}
