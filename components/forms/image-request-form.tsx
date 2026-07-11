"use client";

import { useActionState } from "react";
import { ImagePlus } from "lucide-react";
import { requestProductImagesAction, type ActionState } from "@/lib/actions/product-actions";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";

const initialState: ActionState = { ok: false, message: "" };

export function ImageRequestForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(requestProductImagesAction, initialState);

  return (
    <form id="request-images" action={action} className="grid gap-4 rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-slate-950">طلب صور إضافية</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          اكتب نوع الصور المطلوبة بوضوح، وسيصل الطلب للمدير والمنسق كإشعار مطلوب المتابعة.
        </p>
      </div>

      <input type="hidden" name="productId" value={productId} />
      <Field label="ما نوع الصور التي تحتاجها؟" error={state.errors?.notes}>
        <Textarea
          name="notes"
          placeholder="مثال: صورة خلفية للبطارية، صورة الملصق الفني، صورة بجانب الكرتونة، أو صورة عالية الجودة للخلفية البيضاء."
          className="min-h-28"
          required
        />
      </Field>

      {state.message ? (
        <p className={`rounded-lg p-3 text-sm font-bold ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={pending} className="h-11">
          <ImagePlus className="size-4" />
          إرسال الطلب
        </Button>
      </div>
    </form>
  );
}
