"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, UploadCloud, X } from "lucide-react";
import type { InventoryLocation, Product } from "@/lib/types";
import { createOrderAction, type OrderActionState } from "@/lib/actions/order-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { locationLabels } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

const initialState: OrderActionState = { ok: false, message: "" };
type UploadFolder = "deposits" | "scrap";

export function OrderForm({ products, selectedProductId }: { products: Product[]; selectedProductId?: string }) {
  const [state, action, pending] = useActionState(createOrderAction, initialState);
  const [productId, setProductId] = useState(selectedProductId ?? "");
  const [selectedLocation, setSelectedLocation] = useState<InventoryLocation | "">("");
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [depositAmount, setDepositAmount] = useState(0);
  const [scrapWeightKg, setScrapWeightKg] = useState(0);
  const [scrapKiloPrice, setScrapKiloPrice] = useState(0);
  const [scrapEstimatedValue, setScrapEstimatedValue] = useState(0);
  const [depositImageUrl, setDepositImageUrl] = useState("");
  const [scrapImageUrl, setScrapImageUrl] = useState("");
  const [depositUploading, setDepositUploading] = useState(false);
  const [scrapUploading, setScrapUploading] = useState(false);
  const [depositUploadError, setDepositUploadError] = useState("");
  const [scrapUploadError, setScrapUploadError] = useState("");

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [products, productId],
  );
  const stock = selectedProduct?.stock ?? [];
  const availableLocations = stock.filter((record) => record.available > 0);
  const effectiveLocation =
    availableLocations.find((record) => record.location === selectedLocation)?.location ??
    availableLocations[0]?.location ??
    "";
  const unitPrice = selectedProduct ? Math.max(0, selectedProduct.price - discount) : 0;
  const orderTotal = unitPrice * quantity;
  const remainingAmount = Math.max(0, orderTotal - depositAmount);
  const isUploading = depositUploading || scrapUploading;

  function selectProduct(nextProductId: string) {
    setProductId(nextProductId);
    const nextProduct = products.find((product) => product.id === nextProductId);
    setSelectedLocation(nextProduct?.stock.find((record) => record.available > 0)?.location ?? "");
  }

  async function uploadOrderImage(
    file: File,
    folder: UploadFolder,
    onUploaded: (url: string) => void,
    setUploading: (value: boolean) => void,
    setError: (value: string) => void,
  ) {
    setUploading(true);
    setError("");
    try {
      if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
        throw new Error("يسمح برفع صور PNG أو JPG أو WebP فقط.");
      }
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("حجم الصورة لا يجب أن يتجاوز 20 ميجابايت.");
      }

      const body = new FormData();
      body.set("file", file);
      body.set("folder", folder);
      const response = await fetch("/api/upload/cloudinary", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error ?? "تعذر رفع الصورة");
      }
      onUploaded(result.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="grid min-w-0 gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <section className="grid min-w-0 gap-4 md:grid-cols-2">
        <Field label="اسم العميل" error={state.errors?.customerName}>
          <Input name="customerName" required />
        </Field>
        <Field label="هاتف العميل" error={state.errors?.customerPhone}>
          <Input name="customerPhone" required inputMode="numeric" pattern="[0-9]{8,20}" placeholder="01000000000" />
        </Field>
        <Field label="هاتف إضافي">
          <Input name="customerPhone2" inputMode="numeric" pattern="[0-9]{8,20}" placeholder="اختياري" />
        </Field>
        <Field label="هاتف إضافي آخر">
          <Input name="customerPhone3" inputMode="numeric" pattern="[0-9]{8,20}" placeholder="اختياري" />
        </Field>
        <Field label="المحافظة" error={state.errors?.governorate}>
          <Input name="governorate" required />
        </Field>
        <Field label="المنطقة" error={state.errors?.area}>
          <Input name="area" required />
        </Field>
      </section>

      <Field label="العنوان" error={state.errors?.address}>
        <Textarea name="address" required />
      </Field>
      <Field label="ملاحظات">
        <Textarea name="notes" />
      </Field>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid min-w-0 gap-4 lg:grid-cols-3">
          <Field label="المنتج" error={state.errors?.productId}>
            <Select
              name="productId"
              value={productId}
              onChange={(event) => selectProduct(event.currentTarget.value)}
              required
            >
              <option value="">اختر المنتج</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(product.price)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="الكمية" error={state.errors?.quantity}>
            <Input
              name="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.currentTarget.value || 1)))}
              required
            />
          </Field>
          <Field label="موقع المخزون" error={state.errors?.selectedLocation}>
            <Select
              name="selectedLocation"
              value={effectiveLocation}
              onChange={(event) => setSelectedLocation(event.currentTarget.value as InventoryLocation)}
              required
              disabled={!selectedProduct || availableLocations.length === 0}
            >
              {!selectedProduct ? <option value="">اختر المنتج أولا</option> : null}
              {selectedProduct && availableLocations.length === 0 ? <option value="">لا يوجد مخزون متاح</option> : null}
              {stock.map((record) => (
                <option key={record.location} value={record.location} disabled={record.available <= 0}>
                  {locationLabels[record.location]} - متاح {record.available}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {selectedProduct ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {stock.map((record) => (
              <div key={record.location} className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-sm font-black text-slate-700">{locationLabels[record.location]}</p>
                <p className="mt-2 text-xl font-black text-blue-700">{record.available}</p>
                <p className="text-xs font-bold text-slate-400">متاح الآن</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-dashed border-slate-200 bg-white p-4 text-center text-sm font-bold text-slate-500">
            اختر منتجا موجودا لعرض السعر والمخزون المتاح.
          </p>
        )}
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-3">
        <Field label="خصم على سعر الوحدة">
          <Input
            name="discount"
            type="number"
            min={0}
            max={selectedProduct?.price ?? undefined}
            value={discount}
            onChange={(event) => setDiscount(Math.max(0, Number(event.currentTarget.value || 0)))}
          />
        </Field>
        <Field label="مدة الضمان بالشهور" error={state.errors?.warrantyMonths}>
          <Input
            name="warrantyMonths"
            type="number"
            min={1}
            max={120}
            value={warrantyMonths}
            onChange={(event) => setWarrantyMonths(Math.max(1, Number(event.currentTarget.value || 1)))}
            required
          />
        </Field>
        <Field label="عربون">
          <Input
            name="depositAmount"
            type="number"
            min={0}
            value={depositAmount}
            onChange={(event) => setDepositAmount(Math.max(0, Number(event.currentTarget.value || 0)))}
          />
        </Field>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 md:mt-7">
          <input type="checkbox" name="hasDeposit" value="true" className="size-4 accent-blue-700" />
          يوجد عربون
        </label>
      </section>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">
        إذا لم يوجد عربون فالطلب على مسؤولية المسوق، وإذا لم يتم تسليم الطلب يتم خصم 300 جنيه من المسوق خارج النظام.
      </p>

      <UploadCard
        label="صورة العربون"
        description="ارفع صورة إيصال أو تحويل العربون إن وجد."
        url={depositImageUrl}
        loading={depositUploading}
        error={depositUploadError}
        onClear={() => setDepositImageUrl("")}
        onFile={(file) =>
          uploadOrderImage(file, "deposits", setDepositImageUrl, setDepositUploading, setDepositUploadError)
        }
      />

      <section className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 md:grid-cols-4">
        <Summary label="سعر الوحدة" value={formatCurrency(selectedProduct?.price ?? 0)} />
        <Summary label="بعد الخصم" value={formatCurrency(unitPrice)} />
        <Summary label="إجمالي الطلب" value={formatCurrency(orderTotal)} />
        <Summary label="المتبقي" value={formatCurrency(remainingAmount)} />
      </section>

      <section className="rounded-lg bg-slate-50 p-4">
        <label className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <input type="checkbox" name="hasScrap" value="true" className="size-4 accent-blue-700" />
          يوجد بطارية كهنة
        </label>
        <div className="grid min-w-0 gap-4 md:grid-cols-3">
          <Field label="نوع الكهنة">
            <Input name="scrapType" />
          </Field>
          <Field label="الأمبير">
            <Input name="scrapAmpere" type="number" min={0} />
          </Field>
          <Field label="وزن الكهنة بالكيلو">
            <Input
              name="scrapWeightKg"
              type="number"
              min={0}
              step="0.01"
              value={scrapWeightKg}
              onChange={(event) => {
                const nextWeight = Math.max(0, Number(event.currentTarget.value || 0));
                setScrapWeightKg(nextWeight);
                setScrapEstimatedValue(Math.round(nextWeight * scrapKiloPrice * 100) / 100);
              }}
            />
          </Field>
          <Field label="سعر كيلو الكهنة">
            <Input
              name="scrapKiloPrice"
              type="number"
              min={0}
              step="0.01"
              value={scrapKiloPrice}
              onChange={(event) => {
                const nextPrice = Math.max(0, Number(event.currentTarget.value || 0));
                setScrapKiloPrice(nextPrice);
                setScrapEstimatedValue(Math.round(scrapWeightKg * nextPrice * 100) / 100);
              }}
            />
          </Field>
          <Field label="القيمة المتوقعة">
            <Input
              name="scrapEstimatedValue"
              type="number"
              min={0}
              step="0.01"
              value={scrapEstimatedValue}
              onChange={(event) => setScrapEstimatedValue(Math.max(0, Number(event.currentTarget.value || 0)))}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="ملاحظات الكهنة">
            <Textarea name="scrapNotes" />
          </Field>
        </div>
      </section>

      <UploadCard
        label="صورة الكهنة"
        description="ارفع الصورة التي أرسلها العميل للبطارية القديمة."
        url={scrapImageUrl}
        loading={scrapUploading}
        error={scrapUploadError}
        onClear={() => setScrapImageUrl("")}
        onFile={(file) => uploadOrderImage(file, "scrap", setScrapImageUrl, setScrapUploading, setScrapUploadError)}
      />

      <input type="hidden" name="depositImageUrl" value={depositImageUrl} />
      <input type="hidden" name="scrapImageUrl" value={scrapImageUrl} />
      <input type="hidden" name="paymentOnDelivery" value="true" />

      {state.message ? (
        <p className={`rounded-md p-3 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          loading={pending || isUploading}
          type="submit"
          className="h-11 min-w-44"
          disabled={!selectedProduct || availableLocations.length === 0 || isUploading}
        >
          إرسال الطلب للمراجعة
        </Button>
      </div>
    </form>
  );
}

function UploadCard({
  label,
  description,
  url,
  loading,
  error,
  onFile,
  onClear,
}: {
  label: string;
  description: string;
  url: string;
  loading: boolean;
  error: string;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-slate-950">{label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-bold text-white transition hover:bg-blue-800 aria-disabled:pointer-events-none aria-disabled:opacity-60">
          <UploadCloud className="size-4" />
          {loading ? "جاري الرفع..." : "رفع صورة"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={loading}
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (file) onFile(file);
              input.value = "";
            }}
          />
        </label>
      </div>
      {url ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-white p-3 text-sm font-bold text-emerald-700">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            تم رفع الصورة
          </span>
          <span className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
              فتح
            </a>
            <button type="button" onClick={onClear} className="grid size-8 place-items-center rounded-full text-red-600 hover:bg-red-50" aria-label="حذف الصورة">
              <X className="size-4" />
            </button>
          </span>
        </div>
      ) : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 p-2 text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
    </div>
  );
}
