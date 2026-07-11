import { PageHeader } from "@/components/erp/app-shell";
import { UsersView } from "@/components/erp/report-views";
import { requireRole } from "@/lib/auth";
import { listUsers } from "@/lib/data/repository";

export default async function AdminUsersPage() {
  const user = await requireRole(["admin"]);
  const users = await listUsers();
  return (
    <>
      <PageHeader title="المستخدمون" description="اعتماد الحسابات وتعيين الأدوار ومتابعة الأداء." />
      <UsersView users={users} currentUserId={user.uid} />
    </>
  );
}
