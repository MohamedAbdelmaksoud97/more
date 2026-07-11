"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, UploadCloud, X } from "lucide-react";
import { uploadShippingBillAction, type OrderActionState } from "@/lib/actions/order-actions";
import { Button } from "@/components/ui/button";

const initialState: OrderActionState = { ok: false, message: "" };

export function ShippingBillForm({ orderId, currentUrl }: { orderId: string; currentUrl?: string }) {
  const [state, action, pending] = useActionState(uploadShippingBillAction, initialState);
  const [documentUrl, setDocumentUrl] = useState(currentUrl ?? "");
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
      body.set("folder", "shipping");
      const response = await fetch("/api/upload/cloudinary", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "تعذر رفع بوليصة الشحن");
      setDocumentUrl(result.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "تعذر رفع بوليصة الشحن");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="documentUrl" value={documentUrl} />

      <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-slate-950">بوليصة الشحن</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">ارفع صورة أو PDF بعد قبول الطلب وحجز المخزون.</p>
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-bold text-white transition hover:bg-blue-800">
            <UploadCloud className="size-4" />
            {uploading ? "جاري الرفع..." : "رفع البوليصة"}
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
              تم رفع البوليصة
            </span>
            <span className="flex items-center gap-2">
              <a href={documentUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                فتح
              </a>
              <button
                type="button"
                onClick={() => setDocumentUrl("")}
                className="grid size-8 place-items-center rounded-full text-red-600 hover:bg-red-50"
                aria-label="حذف البوليصة"
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

      <Button type="submit" loading={pending || uploading} disabled={!documentUrl || uploading}>
        حفظ البوليصة وتحديث الطلب
      </Button>
    </form>
  );
}
