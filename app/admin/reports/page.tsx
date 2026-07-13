import { PageHeader } from "@/components/erp/app-shell";
import { ReportsView } from "@/components/erp/report-views";
import { requireRole } from "@/lib/auth";
import { listExpenses, listOrders, listProducts, listTargets, listUsers } from "@/lib/data/repository";

function currentEgyptMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  return {
    month: Number(parts.find((part) => part.type === "month")?.value ?? new Date().getMonth() + 1),
    year: Number(parts.find((part) => part.type === "year")?.value ?? new Date().getFullYear()),
  };
}

function safePeriod(params: { month?: string; year?: string }) {
  const current = currentEgyptMonth();
  const month = Number(params.month ?? current.month);
  const year = Number(params.year ?? current.year);

  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : current.month,
    year: Number.isInteger(year) && year >= 2024 && year <= 2100 ? year : current.year,
  };
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const user = await requireRole(["admin"]);
  const [params, orders, products, expenses, targets, users] = await Promise.all([
    searchParams,
    listOrders(user),
    listProducts(),
    listExpenses(),
    listTargets(),
    listUsers(),
  ]);
  const period = safePeriod(params);

  return (
    <>
      <PageHeader
        title="التقرير الشهري الشامل"
        description="عين المدير على المبيعات، النقدية، العمولات، المصروفات، المخزون، الكهنة والمرتجعات."
      />
      <ReportsView
        orders={orders}
        products={products}
        expenses={expenses}
        targets={targets}
        users={users}
        selectedMonth={period.month}
        selectedYear={period.year}
      />
    </>
  );
}
