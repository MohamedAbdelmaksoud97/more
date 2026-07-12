import { PageHeader } from "@/components/erp/app-shell";
import { ResetTargetButton, TargetAdminForm } from "@/components/forms/commission-admin-forms";
import { Panel } from "@/components/ui/cards";
import { DataTable } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { listTargets, listUsers } from "@/lib/data/repository";
import { formatCurrency } from "@/lib/utils";

export default async function AdminTargetsPage() {
  await requireRole(["admin"]);
  const [targets, users] = await Promise.all([listTargets(), listUsers()]);
  const marketers = users.filter((item) => item.role === "marketer");

  return (
    <div className="grid gap-6">
      <PageHeader title="الأهداف الشهرية" description="تحديد تارجت شهري لكل مسوق مع إمكانية تصفير المحقق في أي وقت." />

      <Panel title="تحديد أو تعديل التارجت" description="تعديل قيمة التارجت لا يصفر المحقق، استخدم زر التصفير عند الحاجة فقط.">
        <TargetAdminForm marketers={marketers} />
      </Panel>

      <Panel title="الأهداف الحالية">
        <DataTable headers={["المسوق", "الشهر", "التارجت", "المحقق", "المتبقي", "الإجراء"]}>
          {targets.map((target) => (
            <tr key={target.id}>
              <td className="px-4 py-3 font-bold">{target.marketerName}</td>
              <td className="px-4 py-3">
                {target.month}/{target.year}
              </td>
              <td className="px-4 py-3">{formatCurrency(target.targetAmount)}</td>
              <td className="px-4 py-3">{formatCurrency(target.achievedAmount)}</td>
              <td className="px-4 py-3">{formatCurrency(target.remainingAmount)}</td>
              <td className="px-4 py-3">
                <ResetTargetButton target={target} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
