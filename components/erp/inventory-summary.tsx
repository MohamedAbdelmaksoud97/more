import type { InventoryLocation, Product } from "@/lib/types";
import { locationLabels } from "@/lib/constants";
import { Panel } from "@/components/ui/cards";

const locations: InventoryLocation[] = ["SHOWROOM", "WAREHOUSE", "SUPPLIER_DIRECT"];

export function InventorySummary({ products }: { products: Product[] }) {
  const summaries = locations.map((location) => {
    const rows = products
      .map((product) => {
        const stock = product.stock.find((record) => record.location === location);
        return {
          product,
          available: stock?.available ?? 0,
          reserved: stock?.reserved ?? 0,
          sold: stock?.sold ?? 0,
          returned: stock?.returned ?? 0,
        };
      })
      .filter((row) => row.available > 0 || row.reserved > 0 || row.sold > 0 || row.returned > 0);

    return {
      location,
      productCount: rows.filter((row) => row.available > 0).length,
      available: rows.reduce((sum, row) => sum + row.available, 0),
      reserved: rows.reduce((sum, row) => sum + row.reserved, 0),
      sold: rows.reduce((sum, row) => sum + row.sold, 0),
      returned: rows.reduce((sum, row) => sum + row.returned, 0),
      products: rows.filter((row) => row.available > 0),
    };
  });

  return (
    <div className="mb-6 grid min-w-0 gap-4 xl:grid-cols-3">
      {summaries.map((summary) => (
        <Panel key={summary.location} className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-black text-slate-950">{locationLabels[summary.location]}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {summary.productCount} منتج متاح
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">
              {summary.available}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <div className="rounded-md bg-slate-50 p-2 text-slate-600">محجوز<br /><b>{summary.reserved}</b></div>
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-700">مباع<br /><b>{summary.sold}</b></div>
            <div className="rounded-md bg-amber-50 p-2 text-amber-700">مرتجع<br /><b>{summary.returned}</b></div>
          </div>

          <div className="mt-4 space-y-2">
            {summary.products.slice(0, 6).map((row) => (
              <div key={row.product.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-bold text-slate-700">{row.product.name}</span>
                <span className="shrink-0 font-black text-slate-950">{row.available}</span>
              </div>
            ))}
            {summary.products.length > 6 ? (
              <p className="text-xs font-bold text-slate-400">+ {summary.products.length - 6} منتجات أخرى</p>
            ) : null}
            {!summary.products.length ? (
              <p className="rounded-md border border-dashed border-slate-200 p-3 text-center text-sm font-bold text-slate-400">
                لا توجد منتجات متاحة في هذا المخزن
              </p>
            ) : null}
          </div>
        </Panel>
      ))}
    </div>
  );
}
