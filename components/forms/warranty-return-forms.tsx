"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, UploadCloud, X } from "lucide-react";
import {
  completeWarrantyReplacementAction,
  confirmWarrantyFulfillmentAction,
  createWarrantyReturnAction,
  uploadWarrantyReplacementShippingAction,
  type WarrantyReturnActionState,
} from "@/lib/actions/warranty-return-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { locationLabels, warrantyReturnTypeLabels } from "@/lib/constants";
import type { InventoryLocation, Order, Product, WarrantyReturn } from "@/lib/types";
import { formatDate, formatOrderNumber } from "@/lib/utils";

const initialState: WarrantyReturnActionState = { ok: false, message: "" };

export function WarrantyReturnCreateForm({ orders }: { orders: Order[] }) {
  const [state, action, pending] = useActionState(createWarrantyReturnAction, initialState);
  const [type, setType] = useState("INSPECTION_FIRST");
  const [billUrl, setBillUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <section className="grid gap-4 md:grid-cols-2">
        <Field label="الطلب الأصلي" error={state.errors?.originalOrderId}>
          <Select name="originalOrderId" required>
            <option value="">اختر الطلب الأصلي داخل الضمان</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {formatOrderNumber(order)} - {order.customer.customerName} - {order.productName}
                {order.warrantyEndsAt ? ` - الضمان حتى ${formatDate(order.warrantyEndsAt)}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="نوع المرتجع" error={state.errors?.type}>
          <Select name="type" value={type} onChange={(event) => setType(event.currentTarget.value)} required>
            <option value="INSPECTION_FIRST">{warrantyReturnTypeLabels.INSPECTION_FIRST}</option>
            <option value="DIRECT_REPLACEMENT">{warrantyReturnTypeLabels.DIRECT_REPLACEMENT}</option>
          </Select>
        </Field>
        <Field label="قيمة الاستهلاك" error={state.errors?.usageFee}>
          <Input name="usageFee" type="number" min={0} step="0.01" defaultValue={0} required />
        </Field>
      </section>

      <Field label="سبب المرتجع" error={state.errors?.reason}>
        <Textarea name="reason" required placeholder="اكتب سبب طلب العميل للرجوع أو الاستبدال" />
      </Field>

      {type === "INSPECTION_FIRST" ? (
        <section className="grid gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="رقم بوليصة شحن القديمة">
              <Input name="oldBatteryShippingTrackingNumber" placeholder="اختياري" />
            </Field>
            <ReturnUploadCard
              label="صورة بوليصة شحن القديمة"
              url={billUrl}
              uploading={uploading}
              error={uploadError}
              onClear={() => setBillUrl("")}
              setUploading={setUploading}
              setError={setUploadError}
              onUploaded={setBillUrl}
            />
          </div>
        </section>
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
          في الاستبدال المباشر سيظهر للمنسق أن البطارية القديمة يجب استلامها مع تسليم البديل.
        </p>
      )}

      <Field label="ملاحظات">
        <Textarea name="notes" />
      </Field>

      <input type="hidden" name="oldBatteryShippingBillUrl" value={billUrl} />
      <StateMessage state={state} />
      <div className="flex justify-end">
        <Button type="submit" loading={pending || uploading}>
          إنشاء طلب المرتجع
        </Button>
      </div>
    </form>
  );
}

export function WarrantyReplacementForm({ item, products }: { item: WarrantyReturn; products: Product[] }) {
  const [state, action, pending] = useActionState(completeWarrantyReplacementAction, initialState);
  const [productId, setProductId] = useState(item.replacementProductId ?? "");
  const [location, setLocation] = useState<InventoryLocation | "">(item.replacementLocation ?? "");
  const selectedProduct = useMemo(() => products.find((product) => product.id === productId), [products, productId]);
  const availableLocations = selectedProduct?.stock.filter((record) => record.available > 0) ?? [];
  const effectiveLocation = availableLocations.find((record) => record.location === location)?.location ?? availableLocations[0]?.location ?? "";

  function selectProduct(nextId: string) {
    setProductId(nextId);
    const nextProduct = products.find((product) => product.id === nextId);
    setLocation(nextProduct?.stock.find((record) => record.available > 0)?.location ?? "");
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="returnId" value={item.id} />
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="البطارية البديلة" error={state.errors?.replacementProductId}>
          <Select name="replacementProductId" value={productId} onChange={(event) => selectProduct(event.currentTarget.value)} required>
            <option value="">اختر البديل</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="موقع المخزون" error={state.errors?.replacementLocation}>
          <Select
            name="replacementLocation"
            value={effectiveLocation}
            onChange={(event) => setLocation(event.currentTarget.value as InventoryLocation)}
            required
            disabled={!selectedProduct}
          >
            {!selectedProduct ? <option value="">اختر البديل أولا</option> : null}
            {selectedProduct && availableLocations.length === 0 ? <option value="">لا يوجد مخزون متاح</option> : null}
            {selectedProduct?.stock.map((record) => (
              <option key={record.location} value={record.location} disabled={record.available <= 0}>
                {locationLabels[record.location]} - متاح {record.available}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="قيمة الاستهلاك" error={state.errors?.usageFee}>
          <Input name="usageFee" type="number" min={0} step="0.01" defaultValue={item.usageFee} required />
        </Field>
      </div>
      <Field label="ملاحظات إضافية">
        <Textarea name="notes" defaultValue={item.notes ?? ""} />
      </Field>
      <StateMessage state={state} />
      <Button type="submit" loading={pending}>
        إرسال الاستبدال للمراجعة
      </Button>
    </form>
  );
}

export function WarrantyReplacementShippingForm({ item }: { item: WarrantyReturn }) {
  const [state, action, pending] = useActionState(uploadWarrantyReplacementShippingAction, initialState);
  const [documentUrl, setDocumentUrl] = useState(item.replacementShippingBillUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="returnId" value={item.id} />
      <input type="hidden" name="documentUrl" value={documentUrl} />
      <ReturnUploadCard
        label="بوليصة شحن البديل"
        url={documentUrl}
        uploading={uploading}
        error={uploadError}
        onClear={() => setDocumentUrl("")}
        setUploading={setUploading}
        setError={setUploadError}
        onUploaded={setDocumentUrl}
      />
      <StateMessage state={state} />
      <Button type="submit" loading={pending || uploading} disabled={!documentUrl || uploading}>
        حفظ بوليصة البديل
      </Button>
    </form>
  );
}

export function WarrantyFulfillmentForm({ item }: { item: WarrantyReturn }) {
  const [state, action, pending] = useActionState(confirmWarrantyFulfillmentAction, initialState);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="returnId" value={item.id} />
      <Field label="قيمة الاستهلاك المحصلة" error={state.errors?.collectedUsageFee}>
        <Input name="collectedUsageFee" type="number" min={0} step="0.01" defaultValue={item.usageFee} required />
      </Field>
      <label className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm font-black text-red-800">
        <input
          type="checkbox"
          name="oldBatteryReceived"
          value="true"
          defaultChecked={item.oldBatteryReceived}
          className="size-4 accent-red-600"
        />
        تم استلام البطارية القديمة من العميل
      </label>
      <StateMessage state={state} />
      <Button type="submit" variant="success" loading={pending}>
        تأكيد التسليم وتحصيل الاستهلاك
      </Button>
    </form>
  );
}

function StateMessage({ state }: { state: WarrantyReturnActionState }) {
  if (!state.message) return null;
  return (
    <p className={`rounded-md p-3 text-sm font-bold ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {state.message}
    </p>
  );
}

function ReturnUploadCard({
  label,
  url,
  uploading,
  error,
  onClear,
  setUploading,
  setError,
  onUploaded,
}: {
  label: string;
  url: string;
  uploading: boolean;
  error: string;
  onClear: () => void;
  setUploading: (value: boolean) => void;
  setError: (value: string) => void;
  onUploaded: (url: string) => void;
}) {
  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      if (!file.type.match(/^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/)) {
        throw new Error("يسمح برفع صورة أو PDF فقط.");
      }
      if (file.size > 20 * 1024 * 1024) throw new Error("حجم الملف لا يجب أن يتجاوز 20 ميجابايت.");
      const body = new FormData();
      body.set("file", file);
      body.set("folder", "returns");
      const response = await fetch("/api/upload/cloudinary", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "تعذر رفع الملف");
      onUploaded(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الملف");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-slate-950">{label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">صورة أو PDF اختياري حسب الحالة.</p>
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-bold text-white transition hover:bg-blue-800">
          <UploadCloud className="size-4" />
          {uploading ? "جاري الرفع..." : "رفع ملف"}
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
      {url ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            تم رفع الملف
          </span>
          <span className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
              فتح
            </a>
            <button type="button" onClick={onClear} className="grid size-8 place-items-center rounded-full text-red-600 hover:bg-red-50">
              <X className="size-4" />
            </button>
          </span>
        </div>
      ) : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 p-2 text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
