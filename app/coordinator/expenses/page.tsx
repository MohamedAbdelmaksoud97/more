import { PageHeader } from "@/components/erp/app-shell";
import { ExpensesView } from "@/components/erp/report-views";
import { ExpenseForm } from "@/components/forms/expense-form";
import { Panel } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { listExpenses } from "@/lib/data/repository";

export default async function CoordinatorExpensesPage() {
  await requireRole(["coordinator", "admin"]);
  const expenses = await listExpenses();

  return (
    <>
      <PageHeader title="المصروفات" description="تسجيل المصروفات التشغيلية المرتبطة بالعمليات." />
      <div className="grid gap-6">
        <Panel
          title="إضافة مصروف"
          description="سجل أي تكلفة تشغيلية ليتم احتسابها ضمن المصروفات والتقارير المالية."
        >
          <ExpenseForm />
        </Panel>

        <Panel title="سجل المصروفات">
          <ExpensesView expenses={expenses} />
        </Panel>
      </div>
    </>
  );
}
