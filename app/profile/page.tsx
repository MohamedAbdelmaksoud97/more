import { AppShell, PageHeader } from "@/components/erp/app-shell";
import { UpdatePasswordForm } from "@/components/forms/password-forms";
import { Panel } from "@/components/ui/cards";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const notifications = await listNotifications(user);

  return (
    <AppShell user={user} unreadCount={notifications.filter((item) => !item.isRead).length}>
      <PageHeader title="الملف الشخصي" description="بيانات الحساب وحالة الموافقة والدور." />

      <Panel title={user.name}>
        <div className="grid gap-4 md:grid-cols-2">
          <p><b>البريد:</b> {user.email}</p>
          <p><b>الهاتف:</b> {user.phone ?? "غير مسجل"}</p>
          <p><b>الدور:</b> {roleLabels[user.role]}</p>
          <p><b>الحالة:</b> <Badge tone={user.status === "APPROVED" ? "green" : "yellow"}>{user.status}</Badge></p>
        </div>
      </Panel>

      <div className="mt-6">
        <Panel title="تغيير كلمة المرور" description="حدّث كلمة مرور حسابك من هنا.">
          <UpdatePasswordForm email={user.email} />
        </Panel>
      </div>
    </AppShell>
  );
}
