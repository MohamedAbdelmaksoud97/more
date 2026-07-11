import { PageHeader } from "@/components/erp/app-shell";
import { TargetsView } from "@/components/erp/report-views";
import { requireRole } from "@/lib/auth";
import { listTargets } from "@/lib/data/repository";

export default async function MarketerTargetPage() {
  const user = await requireRole(["marketer", "admin"]);
  const targets = (await listTargets()).filter((target) => user.role === "admin" || target.marketerId === user.uid);
  return (
    <>
      <PageHeader title="هدفي الشهري" description="المحقق والمتبقي من هدف الشهر الحالي." />
      <TargetsView targets={targets} />
    </>
  );
}
