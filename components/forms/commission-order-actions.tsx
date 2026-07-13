import { approveCommissionAction, payCommissionAction } from "@/lib/actions/order-actions";
import { CommissionSubmitButton } from "@/components/forms/commission-submit-button";
import type { CommissionStatus } from "@/lib/types";

async function approveFormAction(formData: FormData) {
  "use server";
  await approveCommissionAction(formData);
}

async function payFormAction(formData: FormData) {
  "use server";
  await payCommissionAction(formData);
}

export function CommissionOrderActionCell({ orderId, status }: { orderId: string; status: CommissionStatus }) {
  if (status === "PENDING") {
    return (
      <form action={approveFormAction}>
        <input type="hidden" name="orderId" value={orderId} />
        <CommissionSubmitButton>اعتماد العمولة</CommissionSubmitButton>
      </form>
    );
  }

  if (status === "APPROVED") {
    return (
      <form action={payFormAction}>
        <input type="hidden" name="orderId" value={orderId} />
        <CommissionSubmitButton variant="success">صرف العمولة</CommissionSubmitButton>
      </form>
    );
  }

  if (status === "PAID") {
    return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">تم الصرف</span>;
  }

  if (status === "CANCELLED" || status === "DEDUCTED") {
    return <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">غير قابلة للصرف</span>;
  }

  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">بانتظار الاكتمال</span>;
}
