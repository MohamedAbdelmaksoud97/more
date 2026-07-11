import { PageHeader } from "@/components/erp/app-shell";
import { ExpensesView } from "@/components/erp/report-views";
import { requireRole } from "@/lib/auth";
import { listExpenses } from "@/lib/data/repository";

export default async function AdminExpensesPage() {
  await requireRole(["admin"]);
  const expenses = await listExpenses();
  return (
    <>
      <PageHeader title="المصروفات" description="تسجيل المصروفات وربط المرفقات عبر Cloudinary." />
      <ExpensesView expenses={expenses} />
    </>
  );
}
