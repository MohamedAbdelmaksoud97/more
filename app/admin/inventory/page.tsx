import { PageHeader } from "@/components/erp/app-shell";
import { InventorySummary } from "@/components/erp/inventory-summary";
import { DataTable } from "@/components/ui/table";
import { locationLabels } from "@/lib/constants";
import { requireRole } from "@/lib/auth";
import { listProducts } from "@/lib/data/repository";

export default async function AdminInventoryPage() {
  await requireRole(["admin"]);
  const products = await listProducts();

  return (
    <>
      <PageHeader title="المخزون" description="ملخص كل مخزن ثم تفاصيل كل منتج حسب الموقع: متاح، محجوز، مباع، ومرتجع." />
      <InventorySummary products={products} />
      <DataTable headers={["المنتج", "الموقع", "متاح", "محجوز", "مباع", "مرتجع"]}>
        {products.flatMap((product) =>
          product.stock.map((record) => (
            <tr key={`${product.id}-${record.location}`}>
              <td className="px-4 py-3 font-bold">{product.name}</td>
              <td className="px-4 py-3">{locationLabels[record.location]}</td>
              <td className="px-4 py-3">{record.available}</td>
              <td className="px-4 py-3">{record.reserved}</td>
              <td className="px-4 py-3">{record.sold}</td>
              <td className="px-4 py-3">{record.returned}</td>
            </tr>
          )),
        )}
      </DataTable>
    </>
  );
}
