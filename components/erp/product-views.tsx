import Image from "next/image";
import Link from "next/link";
import { Download, ImagePlus, Pencil, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/types";
import { EmptyState, Panel } from "@/components/ui/cards";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { locationLabels } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export function ProductGrid({
  products,
  basePath = "/marketer/products",
  orderPath = "/marketer/orders/new",
}: {
  products: Product[];
  basePath?: string;
  orderPath?: string;
}) {
  if (!products.length) {
    return <EmptyState title="لا توجد منتجات بعد" body="ستظهر المنتجات هنا بمجرد إضافتها من الإدارة أو العمليات." />;
  }

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const available = product.stock.reduce((sum, record) => sum + record.available, 0);
        return (
          <article
            key={product.id}
            className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Link href={`${basePath}/${product.id}`} className="block">
              <div className="relative aspect-[4/3] bg-slate-100">
                {product.images[0]?.url ? (
                  <Image src={product.images[0].url} alt={product.name} fill className="object-cover" sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw" />
                ) : (
                  <div className="grid h-full place-items-center text-sm font-bold text-slate-400">لا توجد صورة</div>
                )}
              </div>
            </Link>
            <div className="min-w-0 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <h2 className="min-w-0 truncate font-black text-slate-950">{product.name}</h2>
                <Badge tone={product.active ? "green" : "gray"}>{product.active ? "نشط" : "متوقف"}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{product.description}</p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                <p className="text-xl font-black text-blue-700">{formatCurrency(product.price)}</p>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                  متاح {available}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <ButtonLink href={`${basePath}/${product.id}`} variant="secondary" className="h-10">
                  <Pencil className="size-4" />
                  عرض
                </ButtonLink>
                {product.active && available > 0 ? (
                  <ButtonLink href={`${orderPath}?productId=${product.id}`} className="h-10">
                    <ShoppingCart className="size-4" />
                    إنشاء طلب
                  </ButtonLink>
                ) : (
                  <span className="inline-flex h-10 items-center justify-center rounded-md bg-slate-100 px-4 text-sm font-bold text-slate-400">
                    غير متاح
                  </span>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ProductDetail({ product }: { product: Product }) {
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Panel>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {product.images.length ? (
            product.images.map((image) => (
              <a
                key={image.publicId}
                href={image.url}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-[4/3] min-w-0 overflow-hidden rounded-lg bg-slate-100"
              >
                <Image src={image.url} alt={product.name} fill className="object-cover transition group-hover:scale-105" sizes="(min-width: 1280px) 35vw, 100vw" />
                <span className="absolute bottom-3 left-3 rounded-md bg-white/90 p-2 text-slate-700">
                  <Download className="size-4" />
                </span>
              </a>
            ))
          ) : (
            <EmptyState title="لا توجد صور" body="يمكن طلب صور إضافية للمنتج من العمليات." />
          )}
        </div>
      </Panel>
      <Panel title={product.name} description={product.description}>
        <div className="grid min-w-0 gap-4">
          <div>
            <p className="text-sm text-slate-500">السعر</p>
            <p className="text-3xl font-black text-blue-700">{formatCurrency(product.price)}</p>
          </div>
          <div className="grid gap-2">
            {product.stock.map((record) => (
              <div key={record.location} className="min-w-0 rounded-md border border-slate-200 p-3">
                <p className="font-bold">{locationLabels[record.location]}</p>
                <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                  <span>متاح<br /><b>{record.available}</b></span>
                  <span>محجوز<br /><b>{record.reserved}</b></span>
                  <span>مباع<br /><b>{record.sold}</b></span>
                  <span>مرتجع<br /><b>{record.returned}</b></span>
                </div>
              </div>
            ))}
          </div>
          <ButtonLink href={`/marketer/orders/new?productId=${product.id}`}>
            إنشاء طلب
          </ButtonLink>
          <ButtonLink href={`/marketer/products/${product.id}?requestImages=1#request-images`} variant="secondary">
            <ImagePlus className="size-4" />
            طلب صور إضافية
          </ButtonLink>
        </div>
      </Panel>
    </div>
  );
}
