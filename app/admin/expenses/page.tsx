import { PageHeader } from "@/components/erp/app-shell";
import { ExpensesView } from "@/components/erp/report-views";
import { ExpenseForm } from "@/components/forms/expense-form";
import { Panel } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { listExpenses } from "@/lib/data/repository";

export default async function AdminExpensesPage() {
  await requireRole(["admin"]);
  const expenses = await listExpenses();

  return (
    <>
      <PageHeader title="المصروفات" description="تسجيل المصروفات التشغيلية." />
      <div className="grid gap-6">
        <Panel
          title="إضافة مصروف"
          description="أي تكلفة تشغيلية يتم تسجيلها هنا تخصم من صافي النقدية، مع خصم العمولات المدفوعة فقط."
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
