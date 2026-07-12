"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, UploadCloud, X } from "lucide-react";
import { confirmDeliveryPaymentAction, type OrderActionState } from "@/lib/actions/order-actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

const initialState: OrderActionState = { ok: false, message: "" };

export function FulfillmentConfirmationForm({
  orderId,
  defaultAmount,
}: {
  orderId: string;
  defaultAmount: number;
}) {
  const [state, action, pending] = useActionState(confirmDeliveryPaymentAction, initialState);
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      if (!file.type.match(/^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/)) {
        throw new Error("يسمح برفع صورة أو ملف PDF فقط.");
      }
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("حجم الملف لا يجب أن يتجاوز 20 ميجابايت.");
      }

      const body = new FormData();
      body.set("file", file);
      body.set("folder", "receipts");
      const response = await fetch("/api/upload/cloudinary", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "تعذر رفع إثبات التسليم");
      setDocumentUrl(result.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "تعذر رفع إثبات التسليم");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="documentUrl" value={documentUrl} />

      <Field label="المبلغ المستلم عند التسليم بعد خصم العربون">
        <Input name="collectedAmount" type="number" min={0} step="0.01" defaultValue={defaultAmount} required />
      </Field>
      <p className="-mt-2 rounded-md bg-amber-50 p-2 text-xs font-bold leading-5 text-amber-800">
        محاسبياً: العربون محسوب بالفعل ضمن إجمالي البيع، لذلك أدخل هنا المتبقي فقط عند التسليم.
      </p>

      <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-slate-950">إثبات التسليم أو التحصيل</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">اختياري، يمكن رفع صورة أو PDF.</p>
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white transition hover:bg-emerald-700">
            <UploadCloud className="size-4" />
            {uploading ? "جاري الرفع..." : "رفع إثبات"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (file) void upload(file);
                input.value = "";
              }}
            />
          </label>
        </div>

        {documentUrl ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-white p-3 text-sm font-bold text-emerald-700">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              تم رفع الإثبات
            </span>
            <span className="flex items-center gap-2">
              <a href={documentUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                فتح
              </a>
              <button
                type="button"
                onClick={() => setDocumentUrl("")}
                className="grid size-8 place-items-center rounded-full text-red-600 hover:bg-red-50"
                aria-label="حذف الإثبات"
              >
                <X className="size-4" />
              </button>
            </span>
          </div>
        ) : null}
        {uploadError ? <p className="mt-3 rounded-md bg-red-50 p-2 text-xs font-bold text-red-700">{uploadError}</p> : null}
      </div>

      {state.message ? (
        <p className={`rounded-md p-3 text-sm font-bold ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" variant="success" loading={pending || uploading} disabled={uploading}>
        تأكيد التسليم واستلام المبلغ
      </Button>
    </form>
  );
}
