import type { DashboardStats, Expense, Order, Product, Target, UserProfile } from "@/lib/types";
import { DashboardCard, Panel } from "@/components/ui/cards";
import { DataTable } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { updateUserRoleAction } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";

export function ReportsView({
  stats,
  orders,
  products,
}: {
  stats: DashboardStats;
  orders: Order[];
  products: Product[];
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="إجمالي المبيعات" value={stats.totalSales} tone="blue" />
        <DashboardCard label="إجمالي الربح" value={stats.grossProfit} tone="green" />
        <DashboardCard label="الكهنة" value={stats.scrapValue} tone="yellow" />
        <DashboardCard label="المرتجعات" value={stats.returns} tone="gray" />
      </div>
      <Panel title="المبيعات حسب المنتج">
        <DataTable headers={["المنتج", "عدد الطلبات", "إجمالي المبيعات", "المتاح"]}>
          {products.map((product) => {
            const productOrders = orders.filter((order) => order.productId === product.id);
            return (
              <tr key={product.id}>
                <td className="px-4 py-3 font-bold">{product.name}</td>
                <td className="px-4 py-3">{productOrders.length}</td>
                <td className="px-4 py-3">{formatCurrency(productOrders.reduce((sum, order) => sum + order.finalPrice * order.quantity, 0))}</td>
                <td className="px-4 py-3">{product.stock.reduce((sum, item) => sum + item.available, 0)}</td>
              </tr>
            );
          })}
        </DataTable>
      </Panel>
    </div>
  );
}

const statusLabels: Record<string, string> = {
  PENDING_EMAIL_VERIFICATION: "بانتظار تأكيد البريد",
  PENDING_ADMIN_APPROVAL: "بانتظار اعتماد المدير",
  PENDING: "بانتظار الاعتماد",
  APPROVED: "مفعل",
  REJECTED: "مرفوض",
  SUSPENDED: "موقوف",
};

const roleOptions = [
  { value: "admin", label: "مدير" },
  { value: "coordinator", label: "منسق" },
  { value: "marketer", label: "مسوق" },
];

const statusOptions = [
  { value: "PENDING_EMAIL_VERIFICATION", label: "بانتظار تأكيد البريد" },
  { value: "PENDING_ADMIN_APPROVAL", label: "بانتظار اعتماد المدير" },
  { value: "APPROVED", label: "مفعل" },
  { value: "REJECTED", label: "مرفوض" },
  { value: "SUSPENDED", label: "موقوف" },
];

async function updateUserRoleFormAction(formData: FormData) {
  "use server";
  await updateUserRoleAction(formData);
}

export function UsersView({ users, currentUserId }: { users: UserProfile[]; currentUserId?: string }) {
  return (
    <DataTable headers={["الاسم", "البريد", "الهاتف", "الدور", "الحالة", "الإجراء"]}>
      {users.map((user) => (
        <tr key={user.uid}>
          <td className="px-4 py-3 font-bold">{user.name}</td>
          <td className="px-4 py-3">{user.email}</td>
          <td className="px-4 py-3">{user.phone}</td>
          <td className="px-4 py-3">{user.role}</td>
          <td className="px-4 py-3">{statusLabels[user.status] ?? user.status}</td>
          <td className="px-4 py-3">
            {user.uid === currentUserId ? (
              <span className="text-xs font-bold text-slate-400">حسابك الحالي</span>
            ) : (
              <form action={updateUserRoleFormAction} className="flex min-w-[340px] items-center gap-2">
                <input type="hidden" name="uid" value={user.uid} />
                <select
                  name="role"
                  defaultValue={user.role}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={user.status}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <Button type="submit" className="h-9 px-3 text-xs">حفظ</Button>
              </form>
            )}
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

export function ExpensesView({ expenses }: { expenses: Expense[] }) {
  return (
    <DataTable headers={["التصنيف", "القيمة", "الملاحظة", "تاريخ الإنشاء"]}>
      {expenses.map((expense) => (
        <tr key={expense.id}>
          <td className="px-4 py-3 font-bold">{expense.category}</td>
          <td className="px-4 py-3">{formatCurrency(expense.amount)}</td>
          <td className="px-4 py-3">{expense.note}</td>
          <td className="px-4 py-3">{new Date(expense.createdAt).toLocaleDateString("ar-EG")}</td>
        </tr>
      ))}
    </DataTable>
  );
}

export function TargetsView({ targets }: { targets: Target[] }) {
  return (
    <DataTable headers={["المسوق", "الشهر", "الهدف", "المحقق", "المتبقي"]}>
      {targets.map((target) => (
        <tr key={target.id}>
          <td className="px-4 py-3 font-bold">{target.marketerName}</td>
          <td className="px-4 py-3">{target.month}/{target.year}</td>
          <td className="px-4 py-3">{formatCurrency(target.targetAmount)}</td>
          <td className="px-4 py-3">{formatCurrency(target.achievedAmount)}</td>
          <td className="px-4 py-3">{formatCurrency(target.remainingAmount)}</td>
        </tr>
      ))}
    </DataTable>
  );
}
