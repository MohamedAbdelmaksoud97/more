"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Receipt, UploadCloud, X } from "lucide-react";
import { createExpenseAction } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

type ActionState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> };

const initialState: ActionState = { ok: false, message: "" };

const expenseCategories = [
  "شحن وتوصيل",
  "عمالة",
  "تسويق وإعلانات",
  "صيانة",
  "مشتريات تشغيلية",
  "إيجار",
  "كهرباء ومرافق",
  "مصروف إداري",
  "أخرى",
];

export function ExpenseForm() {
  const [state, action, pending] = useActionState(createExpenseAction, initialState);
  const [attachmentUrl, setAttachmentUrl] = useState("");
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
      body.set("folder", "expenses");
      const response = await fetch("/api/upload/cloudinary", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "تعذر رفع مرفق المصروف");
      setAttachmentUrl(result.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "تعذر رفع مرفق المصروف");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="attachmentUrl" value={attachmentUrl} />

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="قيمة المصروف" error={state.errors?.amount}>
          <Input name="amount" type="number" min={0.01} step="0.01" placeholder="مثال: 250" required />
        </Field>

        <Field label="تصنيف المصروف" error={state.errors?.category}>
          <Select name="category" defaultValue="" required>
            <option value="" disabled>
              اختر التصنيف
            </option>
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid content-end">
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
            <UploadCloud className="size-4" />
            {uploading ? "جاري الرفع..." : "رفع مرفق اختياري"}
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
      </div>

      <Field label="ملاحظة" error={state.errors?.note}>
        <Textarea name="note" placeholder="اكتب سبب المصروف أو تفاصيله" required />
      </Field>

      {attachmentUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            تم رفع المرفق
          </span>
          <span className="flex items-center gap-2">
            <a href={attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
              فتح
            </a>
            <button
              type="button"
              onClick={() => setAttachmentUrl("")}
              className="grid size-8 place-items-center rounded-full text-red-600 hover:bg-red-50"
              aria-label="حذف مرفق المصروف"
            >
              <X className="size-4" />
            </button>
          </span>
        </div>
      ) : null}

      {uploadError ? <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{uploadError}</p> : null}
      {state.message ? (
        <p className={`rounded-md p-3 text-sm font-bold ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" loading={pending || uploading} disabled={uploading} className="w-fit">
        <Receipt className="size-4" />
        تسجيل المصروف
      </Button>
    </form>
  );
}
