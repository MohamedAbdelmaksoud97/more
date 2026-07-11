import { PageHeader } from "@/components/erp/app-shell";
import { TargetsView } from "@/components/erp/report-views";
import { requireRole } from "@/lib/auth";
import { listTargets } from "@/lib/data/repository";

export default async function AdminTargetsPage() {
  await requireRole(["admin"]);
  const targets = await listTargets();
  return (
    <>
      <PageHeader title="الأهداف الشهرية" description="أهداف شهرية مستقلة لكل مسوق مع سجل تاريخي." />
      <TargetsView targets={targets} />
    </>
  );
}
