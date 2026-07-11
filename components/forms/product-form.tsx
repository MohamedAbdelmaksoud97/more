"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import { ImagePlus, Save, Trash2, UploadCloud } from "lucide-react";
import {
  createProductAction,
  updateProductAction,
  type ActionState,
} from "@/lib/actions/product-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { locationLabels } from "@/lib/constants";
import type { Product, ProductImage, StockRecord } from "@/lib/types";

const initialState: ActionState = { ok: false, message: "" };

const defaultStock: StockRecord[] = [
  { location: "SHOWROOM", available: 0, reserved: 0, sold: 0, returned: 0 },
  { location: "WAREHOUSE", available: 0, reserved: 0, sold: 0, returned: 0 },
  { location: "SUPPLIER_DIRECT", available: 0, reserved: 0, sold: 0, returned: 0 },
];

type UploadedImage = ProductImage & { id: string };

function createLocalId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function mergeStock(stock?: StockRecord[]) {
  return defaultStock.map((record) => stock?.find((item) => item.location === record.location) ?? record);
}

function mapImages(images?: ProductImage[]): UploadedImage[] {
  return (images ?? []).map((image) => ({
    ...image,
    id: image.publicId || createLocalId(),
  }));
}

export function ProductForm({ product }: { product?: Product }) {
  const serverAction = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, action, pending] = useActionState(serverAction, initialState);
  const [stock, setStock] = useState<StockRecord[]>(() => mergeStock(product?.stock));
  const [images, setImages] = useState<UploadedImage[]>(() => mapImages(product?.images));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const stockJson = useMemo(() => JSON.stringify(stock), [stock]);
  const imagesJson = useMemo(
    () =>
      JSON.stringify(
        images.map((image) => {
          const { id, ...imageForServer } = image;
          void id;
          return imageForServer;
        }),
      ),
    [images],
  );

  function updateAvailable(location: StockRecord["location"], value: string) {
    const available = Math.max(0, Number(value || 0));
    setStock((current) =>
      current.map((record) => (record.location === location ? { ...record, available } : record)),
    );
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError("");
    const selected = Array.from(files);
    if (images.length + selected.length > 20) {
      setUploadError("يمكن رفع 20 صورة كحد أقصى لكل منتج.");
      return;
    }

    setUploading(true);
    try {
      for (const file of selected) {
        if (!file.type.startsWith("image/")) {
          setUploadError("يسمح برفع الصور فقط للمنتجات.");
          continue;
        }

        const body = new FormData();
        body.set("file", file);
        body.set("folder", "products");
        const response = await fetch("/api/upload/cloudinary", { method: "POST", body });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error ?? "تعذر رفع الصورة");
        }

        setImages((current) => [
          ...current,
          {
            id: createLocalId(),
            url: result.url,
            publicId: result.publicId,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            uploadedBy: "current-user",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "تعذر رفع الصور");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="grid gap-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-slate-950">{product ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            أدخل بيانات المنتج وارفع حتى 20 صورة عالية الجودة وحدد الكمية المتاحة في كل مخزن.
          </p>
        </div>
        <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
          {images.length}/20 صورة
        </span>
      </div>

      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <div className="grid min-w-0 gap-4">
          <Field label="اسم المنتج" error={state.errors?.name}>
            <Input
              name="name"
              defaultValue={product?.name}
              placeholder="مثال: بطارية طاقة 100 أمبير"
              required
            />
          </Field>

          <Field label="الوصف التفصيلي" error={state.errors?.description}>
            <Textarea
              name="description"
              defaultValue={product?.description}
              placeholder="اكتب المواصفات، الاستخدامات، الضمان، وأي تفاصيل يحتاجها المسوق أو العميل."
              className="min-h-36"
              required
            />
          </Field>

          <div className="grid min-w-0 gap-4 md:grid-cols-3">
            <Field label="سعر البيع" error={state.errors?.price}>
              <Input name="price" type="number" min={0} step="0.01" defaultValue={product?.price} required />
            </Field>
            <Field label="سعر التكلفة">
              <Input name="costPrice" type="number" min={0} step="0.01" defaultValue={product?.costPrice} />
            </Field>
            <Field label="التصنيف" error={state.errors?.category}>
              <Input
                name="category"
                defaultValue={product?.category}
                placeholder="بطاريات / انفرترات / إكسسوارات"
                required
              />
            </Field>
          </div>

          <label className="flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            <input name="active" type="hidden" value="false" />
            <input
              name="active"
              type="checkbox"
              value="true"
              defaultChecked={product?.active ?? true}
              className="size-4 accent-blue-700"
            />
            المنتج نشط ومتاح للمسوقين
          </label>
        </div>

        <section className="min-w-0 rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-black text-slate-950">صور المنتج</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">اسحب الصور أو اخترها من جهازك.</p>
            </div>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-bold text-white transition hover:bg-blue-800">
              <UploadCloud className="size-4" />
              رفع صور
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                disabled={uploading || images.length >= 20}
                onChange={(event) => {
                  const input = event.currentTarget;
                  void uploadFiles(input.files).finally(() => {
                    input.value = "";
                  });
                }}
              />
            </label>
          </div>

          {uploadError ? <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs font-bold text-red-700">{uploadError}</p> : null}
          {uploading ? <p className="mt-3 text-xs font-bold text-blue-700">جاري رفع الصور...</p> : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((image) => (
              <div key={image.id} className="group relative aspect-square min-w-0 overflow-hidden rounded-lg border border-white bg-white shadow-sm">
                <Image src={image.url} alt="صورة المنتج" fill className="object-cover" sizes="120px" />
                <button
                  type="button"
                  onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}
                  className="absolute left-1 top-1 grid size-8 place-items-center rounded-full bg-white/95 text-red-600 shadow-sm transition hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="حذف الصورة"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {images.length === 0 ? (
              <div className="col-span-full grid min-h-32 place-items-center rounded-lg border border-dashed border-blue-200 bg-white/70 text-center text-sm font-bold text-slate-500">
                <div>
                  <ImagePlus className="mx-auto mb-2 size-7 text-blue-400" />
                  لم يتم رفع صور بعد
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <h3 className="font-black text-slate-950">الكميات المتاحة حسب المخزن</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            عند قبول الطلب تنتقل الكمية من متاح إلى محجوز، ولا تصبح مباعة إلا بعد اكتمال الطلب.
          </p>
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          {stock.map((record) => (
            <label key={record.location} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
              <span className="text-sm font-black text-slate-700">{locationLabels[record.location]}</span>
              <Input
                className="mt-3"
                type="number"
                min={0}
                value={record.available}
                onChange={(event) => updateAvailable(record.location, event.currentTarget.value)}
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-500">
                <span>محجوز: {record.reserved}</span>
                <span>مباع: {record.sold}</span>
                <span>مرتجع: {record.returned}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      <input type="hidden" name="stock" value={stockJson} />
      <input type="hidden" name="images" value={imagesJson} />

      {state.message ? (
        <p className={`rounded-lg p-3 text-sm font-bold ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button loading={pending || uploading} type="submit" className="h-11 min-w-40">
          <Save className="size-4" />
          {product ? "حفظ التعديلات" : "حفظ المنتج"}
        </Button>
      </div>
    </form>
  );
}
