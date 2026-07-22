import type { Expense, Order, Product, Target, UserProfile } from "@/lib/types";
import { redirect } from "next/navigation";
import { DashboardCard, Panel } from "@/components/ui/cards";
import { DataTable } from "@/components/ui/table";
import { formatCurrency, formatDateOnly, formatOrderNumber } from "@/lib/utils";
import { updateUserRoleAction } from "@/lib/actions/admin-actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { commissionStatusLabels, locationLabels, orderStatusLabels } from "@/lib/constants";
import { ReportExportButton, type ExportSheet } from "@/components/erp/report-export-button";
import { DeleteUserButton } from "@/components/erp/delete-user-button";

export function ReportsView({
  orders,
  products,
  expenses,
  targets,
  users,
  selectedMonth,
  selectedYear,
}: {
  orders: Order[];
  products: Product[];
  expenses: Expense[];
  targets: Target[];
  users: UserProfile[];
  selectedMonth: number;
  selectedYear: number;
}) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const monthLabel = monthNames[selectedMonth - 1] ?? String(selectedMonth);
  const monthlyOrders = orders.filter((order) => isEgyptMonth(order.createdAt, selectedMonth, selectedYear));
  const monthlyFinancialOrders = orders.filter((order) => {
    const isCollected =
      order.isPaymentCollected ||
      ["PAYMENT_CONFIRMED", "COMMISSION_PENDING", "COMPLETED"].includes(order.status);
    return isCollected && isEgyptMonth(order.updatedAt, selectedMonth, selectedYear);
  });
  const monthlyExpenses = expenses.filter((expense) => isEgyptMonth(expense.createdAt, selectedMonth, selectedYear));
  const monthlyTargets = targets.filter((target) => target.month === selectedMonth && target.year === selectedYear);

  const orderTotal = (order: Order) => order.finalPrice * order.quantity;
  const cashCollected = (order: Order) =>
    order.collectedAmount !== undefined ? order.collectedAmount + order.payment.depositAmount : orderTotal(order);
  const totalSales = monthlyFinancialOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const collectedCash = monthlyFinancialOrders.reduce((sum, order) => sum + cashCollected(order), 0);
  const costOfGoods = monthlyFinancialOrders.reduce((sum, order) => {
    const product = productById.get(order.productId);
    return sum + Number(product?.costPrice ?? 0) * order.quantity;
  }, 0);
  const paidCommissions = monthlyFinancialOrders
    .filter((order) => order.commissionStatus === "PAID")
    .reduce((sum, order) => sum + order.commissionAmount, 0);
  const approvedCommissions = monthlyFinancialOrders
    .filter((order) => order.commissionStatus === "APPROVED")
    .reduce((sum, order) => sum + order.commissionAmount, 0);
  const pendingCommissions = monthlyFinancialOrders
    .filter((order) => ["EXPECTED", "PENDING"].includes(order.commissionStatus))
    .reduce((sum, order) => sum + order.commissionAmount, 0);
  const expenseTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const grossProfit = totalSales - costOfGoods;
  const netCash = collectedCash - expenseTotal - paidCommissions;
  const scrapValue = monthlyFinancialOrders.reduce(
    (sum, order) => sum + (order.scrap.confirmedValue ?? order.scrap.scrapEstimatedValue ?? 0),
    0,
  );
  const returns = monthlyOrders.filter((order) => order.status.startsWith("RETURNED")).length;

  const productRows = products
    .map((product) => {
      const productOrders = monthlyFinancialOrders.filter((order) => order.productId === product.id);
      return {
        product,
        orders: productOrders.length,
        quantity: productOrders.reduce((sum, order) => sum + order.quantity, 0),
        sales: productOrders.reduce((sum, order) => sum + orderTotal(order), 0),
        available: product.stock.reduce((sum, item) => sum + item.available, 0),
        reserved: product.stock.reduce((sum, item) => sum + item.reserved, 0),
      };
    })
    .filter((row) => row.orders > 0 || row.available > 0 || row.reserved > 0)
    .sort((a, b) => b.sales - a.sales);

  const marketerRows = users
    .filter((user) => user.role === "marketer")
    .map((marketer) => {
      const marketerOrders = monthlyFinancialOrders.filter((order) => order.marketerId === marketer.uid);
      const target = monthlyTargets.find((item) => item.marketerId === marketer.uid);
      return {
        marketer,
        orders: marketerOrders.length,
        sales: marketerOrders.reduce((sum, order) => sum + orderTotal(order), 0),
        pending: marketerOrders
          .filter((order) => ["EXPECTED", "PENDING"].includes(order.commissionStatus))
          .reduce((sum, order) => sum + order.commissionAmount, 0),
        approved: marketerOrders
          .filter((order) => order.commissionStatus === "APPROVED")
          .reduce((sum, order) => sum + order.commissionAmount, 0),
        paid: marketerOrders
          .filter((order) => order.commissionStatus === "PAID")
          .reduce((sum, order) => sum + order.commissionAmount, 0),
        target,
      };
    })
    .filter((row) => row.orders > 0 || row.target);

  const coordinatorRows = users
    .filter((user) => user.role === "admin" || user.role === "coordinator")
    .map((user) => {
      const coordinatorOrders = monthlyFinancialOrders.filter((order) => order.coordinatorId === user.uid);
      return {
        user,
        orders: coordinatorOrders.length,
        sales: coordinatorOrders.reduce((sum, order) => sum + orderTotal(order), 0),
        collected: coordinatorOrders.reduce((sum, order) => sum + cashCollected(order), 0),
      };
    })
    .filter((row) => row.orders > 0)
    .sort((a, b) => b.sales - a.sales);

  const scrapOrders = monthlyFinancialOrders.filter((order) => order.scrap.hasScrap);
  const statusRows = Object.entries(
    monthlyOrders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([status, count]) => ({ label: orderStatusLabels[status as Order["status"]] ?? status, value: count }))
    .sort((a, b) => b.value - a.value);
  const financeRows = [
    { label: "إجمالي المبيعات", value: totalSales, tone: "blue" as const },
    { label: "النقدية المحصلة", value: collectedCash, tone: "green" as const },
    { label: "تكلفة البضاعة", value: costOfGoods, tone: "gray" as const },
    { label: "المصروفات", value: expenseTotal, tone: "yellow" as const },
    { label: "العمولات المدفوعة", value: paidCommissions, tone: "blue" as const },
    { label: "صافي النقدية", value: netCash, tone: "green" as const },
  ];
  const exportSheets: ExportSheet[] = [
    {
      name: "الملخص",
      rows: [
        { البيان: "إجمالي المبيعات", القيمة: totalSales },
        { البيان: "النقدية المحصلة", القيمة: collectedCash },
        { البيان: "صافي النقدية", القيمة: netCash },
        { البيان: "إجمالي الربح", القيمة: grossProfit },
        { البيان: "مصروفات", القيمة: expenseTotal },
        { البيان: "عمولات معلقة", القيمة: pendingCommissions },
        { البيان: "عمولات معتمدة", القيمة: approvedCommissions },
        { البيان: "عمولات مدفوعة", القيمة: paidCommissions },
      ],
    },
    {
      name: "الطلبات",
      rows: monthlyFinancialOrders.map((order) => ({
        "رقم الطلب": formatOrderNumber(order),
        العميل: order.customer.customerName,
        المنتج: order.productName,
        المسوق: order.marketerName,
        الحالة: orderStatusLabels[order.status],
        القيمة: orderTotal(order),
        العمولة: order.commissionAmount,
      })),
    },
    {
      name: "المسوقين",
      rows: marketerRows.map((row) => ({
        المسوق: row.marketer.name,
        الطلبات: row.orders,
        المبيعات: row.sales,
        "عمولات معلقة": row.pending,
        "عمولات معتمدة": row.approved,
        "عمولات مدفوعة": row.paid,
        التارجت: row.target?.targetAmount ?? 0,
        المحقق: row.target?.achievedAmount ?? 0,
      })),
    },
    {
      name: "المصروفات",
      rows: monthlyExpenses.map((expense) => ({
        التصنيف: expense.category,
        القيمة: expense.amount,
        الملاحظة: expense.note,
        التاريخ: formatDateOnly(expense.createdAt),
      })),
    },
    {
      name: "المنتجات",
      rows: productRows.map((row) => ({
        المنتج: row.product.name,
        طلبات: row.orders,
        الكمية: row.quantity,
        "إجمالي المبيعات": row.sales,
        متاح: row.available,
        محجوز: row.reserved,
        مباع: row.product.stock.reduce((sum, item) => sum + item.sold, 0),
        مرتجع: row.product.stock.reduce((sum, item) => sum + item.returned, 0),
      })),
    },
    {
      name: "المنسقين",
      rows: coordinatorRows.map((row) => ({
        المستخدم: row.user.name,
        الدور: row.user.role === "admin" ? "مدير" : "منسق",
        طلبات: row.orders,
        مبيعات: row.sales,
        "نقدية محصلة": row.collected,
      })),
    },
    {
      name: "العمولات",
      rows: monthlyFinancialOrders
        .filter((order) => order.commissionAmount > 0 || order.commissionStatus !== "EXPECTED")
        .map((order) => ({
          "رقم الطلب": formatOrderNumber(order),
          المسوق: order.marketerName,
          الحالة: commissionStatusLabels[order.commissionStatus],
          "قيمة العمولة": order.commissionAmount,
          "قيمة الطلب": orderTotal(order),
        })),
    },
    {
      name: "الكهنة",
      rows: scrapOrders.map((order) => ({
        "رقم الطلب": formatOrderNumber(order),
        المنتج: order.productName,
        النوع: order.scrap.scrapType ?? "غير محدد",
        الوزن: order.scrap.scrapWeightKg ?? 0,
        "سعر الكيلو": order.scrap.scrapKiloPrice ?? 0,
        القيمة: order.scrap.confirmedValue ?? order.scrap.scrapEstimatedValue ?? 0,
        الحالة: orderStatusLabels[order.status],
      })),
    },
    {
      name: "المخزون",
      rows: products.flatMap((product) =>
        product.stock.map((item) => ({
          المنتج: product.name,
          الموقع: locationLabels[item.location],
          متاح: item.available,
          محجوز: item.reserved,
          مباع: item.sold,
          مرتجع: item.returned,
        })),
      ),
    },
    {
      name: "التارجت",
      rows: monthlyTargets.map((target) => ({
        المسوق: target.marketerName,
        الشهر: `${target.month}/${target.year}`,
        الهدف: target.targetAmount,
        المحقق: target.achievedAmount,
        المتبقي: target.remainingAmount,
      })),
    },
  ];
  const whatsappSummary = encodeURIComponent(
    [
      `تقرير MORE Energy - ${monthLabel} ${selectedYear}`,
      `إجمالي المبيعات: ${formatCurrency(totalSales)}`,
      `النقدية المحصلة: ${formatCurrency(collectedCash)}`,
      `صافي النقدية: ${formatCurrency(netCash)}`,
      `عمولات معلقة: ${formatCurrency(pendingCommissions)}`,
      `عمولات معتمدة: ${formatCurrency(approvedCommissions)}`,
      `عمولات مدفوعة: ${formatCurrency(paidCommissions)}`,
      `المصروفات: ${formatCurrency(expenseTotal)}`,
      `الكهنة: ${formatCurrency(scrapValue)}`,
      `عدد الطلبات: ${monthlyOrders.length}`,
    ].join("\n"),
  );

  return (
    <div className="grid gap-6">
      <Panel
        title={`تقرير ${monthLabel} ${selectedYear}`}
        description="يتم تحديث التقرير تلقائيا من الطلبات والمصروفات والعمولات والمخزون الحالي."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ReportExportButton sheets={exportSheets} filename={`more-energy-report-${selectedYear}-${selectedMonth}`} />
            <a
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
              href={`https://wa.me/?text=${whatsappSummary}`}
              target="_blank"
              rel="noreferrer"
            >
              مشاركة واتساب
            </a>
          </div>
        }
      >
        <form action="/admin/reports" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            الشهر
            <select
              name="month"
              defaultValue={selectedMonth}
              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            السنة
            <input
              name="year"
              type="number"
              min={2024}
              max={2100}
              defaultValue={selectedYear}
              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="grid content-end">
            <Button type="submit">تحديث التقرير</Button>
          </div>
        </form>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="إجمالي المبيعات" value={totalSales} tone="blue" hint="الطلبات المحصلة خلال الشهر" />
        <DashboardCard label="النقدية المحصلة" value={collectedCash} tone="green" hint="العربون + التحصيل عند التسليم" />
        <DashboardCard label="صافي النقدية" value={netCash} tone="green" hint="بعد المصروفات والعمولات المدفوعة" />
        <DashboardCard label="إجمالي الربح" value={grossProfit} tone="yellow" hint="قبل المصروفات والعمولات" />
        <DashboardCard label="عمولات معلقة" value={pendingCommissions} tone="yellow" />
        <DashboardCard label="عمولات معتمدة" value={approvedCommissions} tone="green" />
        <DashboardCard label="عمولات مدفوعة" value={paidCommissions} tone="blue" />
        <DashboardCard label="المصروفات" value={expenseTotal} tone="gray" />
        <DashboardCard label="قيمة الكهنة" value={scrapValue} tone="yellow" />
        <MetricCard label="طلبات جديدة" value={monthlyOrders.length} hint="كل الطلبات المنشأة خلال الشهر" />
        <MetricCard label="طلبات محصلة" value={monthlyFinancialOrders.length} hint="دخلت في أرقام المبيعات والنقدية" />
        <MetricCard label="مرتجعات" value={returns} hint="حسب حالة الطلب" tone="gray" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="رسم المبيعات حسب المسوق">
          <BarList rows={marketerRows.map((row) => ({ label: row.marketer.name, value: row.sales }))} />
        </Panel>
        <Panel title="رسم المبيعات حسب المنتج">
          <BarList rows={productRows.slice(0, 8).map((row) => ({ label: row.product.name, value: row.sales }))} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="توزيع حالات الطلبات" description="يعرض حركة الطلبات المنشأة خلال الشهر حسب الحالة الحالية.">
          <DonutChart rows={statusRows} />
        </Panel>
        <Panel title="الخريطة المالية للشهر" description="مقارنة سريعة بين المبيعات والتحصيل والتكاليف والمصروفات والعمولات.">
          <FinanceBars rows={financeRows} />
        </Panel>
      </div>

      <Panel title="أحدث الطلبات المؤثرة في التقرير" description="هذه الطلبات هي التي دخلت في المبيعات والنقدية لهذا الشهر.">
        <DataTable headers={["الطلب", "العميل", "المنتج", "المسوق", "الحالة", "العمولة", "القيمة", "فتح"]}>
          {monthlyFinancialOrders.slice(0, 12).map((order) => (
            <tr key={order.id}>
              <td className="px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
              <td className="px-4 py-3">{order.customer.customerName}</td>
              <td className="px-4 py-3">{order.productName}</td>
              <td className="px-4 py-3">{order.marketerName}</td>
              <td className="px-4 py-3">{orderStatusLabels[order.status]}</td>
              <td className="px-4 py-3">{commissionStatusLabels[order.commissionStatus]}</td>
              <td className="px-4 py-3">{formatCurrency(orderTotal(order))}</td>
              <td className="px-4 py-3">
                <ButtonLink href={`/admin/orders/${order.id}`} variant="secondary" className="h-9 text-xs">
                  فتح
                </ButtonLink>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="المبيعات حسب المنتج">
          <DataTable headers={["المنتج", "طلبات", "كمية", "إجمالي المبيعات", "متاح", "محجوز"]}>
            {productRows.map((row) => (
              <tr key={row.product.id}>
                <td className="px-4 py-3 font-bold">{row.product.name}</td>
                <td className="px-4 py-3">{row.orders}</td>
                <td className="px-4 py-3">{row.quantity}</td>
                <td className="px-4 py-3">{formatCurrency(row.sales)}</td>
                <td className="px-4 py-3">{row.available}</td>
                <td className="px-4 py-3">{row.reserved}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        <Panel title="أداء المسوقين والتارجت">
          <DataTable headers={["المسوق", "طلبات", "مبيعات", "معلقة", "معتمدة", "مدفوعة", "التارجت"]}>
            {marketerRows.map((row) => (
              <tr key={row.marketer.uid}>
                <td className="px-4 py-3 font-bold">{row.marketer.name}</td>
                <td className="px-4 py-3">{row.orders}</td>
                <td className="px-4 py-3">{formatCurrency(row.sales)}</td>
                <td className="px-4 py-3">{formatCurrency(row.pending)}</td>
                <td className="px-4 py-3">{formatCurrency(row.approved)}</td>
                <td className="px-4 py-3">{formatCurrency(row.paid)}</td>
                <td className="px-4 py-3">
                  {row.target ? `${formatCurrency(row.target.achievedAmount)} / ${formatCurrency(row.target.targetAmount)}` : "غير محدد"}
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="أداء المدير/المنسق في العمليات">
          <DataTable headers={["المستخدم", "الدور", "طلبات", "مبيعات", "نقدية محصلة"]}>
            {coordinatorRows.map((row) => (
              <tr key={row.user.uid}>
                <td className="px-4 py-3 font-bold">{row.user.name}</td>
                <td className="px-4 py-3">{row.user.role === "admin" ? "مدير" : "منسق"}</td>
                <td className="px-4 py-3">{row.orders}</td>
                <td className="px-4 py-3">{formatCurrency(row.sales)}</td>
                <td className="px-4 py-3">{formatCurrency(row.collected)}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        <Panel title="المصروفات الشهرية">
          <DataTable headers={["التصنيف", "القيمة", "الملاحظة", "التاريخ"]}>
            {monthlyExpenses.map((expense) => (
              <tr key={expense.id}>
                <td className="px-4 py-3 font-bold">{expense.category}</td>
                <td className="px-4 py-3">{formatCurrency(expense.amount)}</td>
                <td className="px-4 py-3">{expense.note}</td>
                <td className="px-4 py-3">{formatDateOnly(expense.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>

      <Panel title="تفصيل العمولات">
        <DataTable headers={["الطلب", "المسوق", "الحالة", "قيمة العمولة", "قيمة الطلب"]}>
          {monthlyFinancialOrders
            .filter((order) => order.commissionAmount > 0 || order.commissionStatus !== "EXPECTED")
            .map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
                <td className="px-4 py-3">{order.marketerName}</td>
                <td className="px-4 py-3">{commissionStatusLabels[order.commissionStatus]}</td>
                <td className="px-4 py-3">{formatCurrency(order.commissionAmount)}</td>
                <td className="px-4 py-3">{formatCurrency(orderTotal(order))}</td>
              </tr>
            ))}
        </DataTable>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="الكهنة والمرتجعات">
          <DataTable headers={["الطلب", "المنتج", "نوع الكهنة", "قيمة الكهنة", "حالة الطلب"]}>
            {scrapOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-bold">{formatOrderNumber(order)}</td>
                <td className="px-4 py-3">{order.productName}</td>
                <td className="px-4 py-3">{order.scrap.scrapType ?? "غير محدد"}</td>
                <td className="px-4 py-3">{formatCurrency(order.scrap.confirmedValue ?? order.scrap.scrapEstimatedValue ?? 0)}</td>
                <td className="px-4 py-3">{orderStatusLabels[order.status]}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        <Panel title="المخزون الحالي حسب المنتج">
          <DataTable headers={["المنتج", "المتاح", "المحجوز", "المباع", "مرتجع", "المواقع"]}>
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-bold">{product.name}</td>
                <td className="px-4 py-3">{product.stock.reduce((sum, item) => sum + item.available, 0)}</td>
                <td className="px-4 py-3">{product.stock.reduce((sum, item) => sum + item.reserved, 0)}</td>
                <td className="px-4 py-3">{product.stock.reduce((sum, item) => sum + item.sold, 0)}</td>
                <td className="px-4 py-3">{product.stock.reduce((sum, item) => sum + item.returned, 0)}</td>
                <td className="px-4 py-3">
                  {product.stock
                    .map((item) => `${locationLabels[item.location]}: ${item.available}`)
                    .join("، ")}
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>
    </div>
  );
}

const monthNames = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function isEgyptMonth(value: unknown, month: number, year: number) {
  const date = normalizeReportDate(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  return (
    Number(parts.find((part) => part.type === "month")?.value) === month &&
    Number(parts.find((part) => part.type === "year")?.value) === year
  );
}

function normalizeReportDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  if (value && typeof value === "object") {
    const candidate = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof candidate.toDate === "function") return candidate.toDate();
    if (typeof candidate.seconds === "number") return new Date(candidate.seconds * 1000);
    if (typeof candidate._seconds === "number") return new Date(candidate._seconds * 1000);
  }
  return new Date(0);
}

function MetricCard({
  label,
  value,
  hint,
  tone = "blue",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "blue" | "green" | "yellow" | "gray";
}) {
  const accents = {
    blue: "border-r-blue-600",
    green: "border-r-emerald-600",
    yellow: "border-r-amber-500",
    gray: "border-r-slate-400",
  };

  return (
    <div className={`min-w-0 overflow-hidden rounded-lg border border-slate-200 border-r-4 bg-white p-4 shadow-sm ${accents[tone]}`}>
      <p className="truncate text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 break-words text-2xl font-black leading-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function BarList({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) {
    return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">لا توجد بيانات كافية للرسم في هذا الشهر.</p>;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const width = Math.max(4, Math.round((row.value / max) * 100));
        return (
          <div key={row.label} className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-sm font-bold">
              <span className="truncate text-slate-700">{row.label}</span>
              <span className="shrink-0 text-slate-950">{formatCurrency(row.value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-l from-blue-700 to-emerald-500" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const colors = ["#2563eb", "#10b981", "#f59e0b", "#64748b", "#ef4444", "#8b5cf6", "#06b6d4"];
  let current = 0;
  const gradient = rows.length
    ? rows
        .map((row, index) => {
          const start = current;
          const size = total ? (row.value / total) * 100 : 0;
          current += size;
          return `${colors[index % colors.length]} ${start}% ${current}%`;
        })
        .join(", ")
    : "#e2e8f0 0% 100%";

  if (!rows.length) {
    return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">لا توجد طلبات في هذا الشهر.</p>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <div
        className="mx-auto grid size-44 place-items-center rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
        aria-label="توزيع حالات الطلبات"
      >
        <div className="grid size-24 place-items-center rounded-full bg-white text-center shadow-inner">
          <span className="text-2xl font-black text-slate-950">{total}</span>
          <span className="-mt-5 text-xs font-bold text-slate-500">طلب</span>
        </div>
      </div>
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="truncate text-slate-700">{row.label}</span>
            </span>
            <span className="shrink-0 text-slate-950">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceBars({
  rows,
}: {
  rows: Array<{ label: string; value: number; tone: "blue" | "green" | "yellow" | "gray" }>;
}) {
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  const colors = {
    blue: "bg-blue-600",
    green: "bg-emerald-600",
    yellow: "bg-amber-500",
    gray: "bg-slate-500",
  };

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const width = Math.max(4, Math.round((Math.abs(row.value) / max) * 100));
        return (
          <div key={row.label} className="rounded-lg border border-slate-100 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
              <span className="text-slate-600">{row.label}</span>
              <span className="text-slate-950">{formatCurrency(row.value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${colors[row.tone]}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
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
  redirect("/admin/users");
}

export function UsersView({ users, currentUserId }: { users: UserProfile[]; currentUserId?: string }) {
  return (
    <DataTable headers={["الاسم", "البريد", "الهاتف", "العنوان", "صورة البطاقة", "الدور", "الحالة", "الإجراء"]}>
      {users.map((user) => (
        <tr key={user.uid}>
          <td className="px-4 py-3 font-bold">{user.name}</td>
          <td className="px-4 py-3">{user.email}</td>
          <td className="px-4 py-3">{user.phone}</td>
          <td className="px-4 py-3">{user.address ?? "غير مسجل"}</td>
          <td className="px-4 py-3">
            {user.nationalIdImageUrl ? <a className="font-bold text-blue-700 hover:underline" href={user.nationalIdImageUrl} target="_blank" rel="noreferrer">فتح</a> : "غير مرفوع"}
          </td>
          <td className="px-4 py-3">{user.role}</td>
          <td className="px-4 py-3">{statusLabels[user.status] ?? user.status}</td>
          <td className="px-4 py-3">
            {user.uid === currentUserId ? (
              <span className="text-xs font-bold text-slate-400">حسابك الحالي</span>
            ) : (
              <div className="flex min-w-[430px] flex-wrap items-center gap-2">
                <form action={updateUserRoleFormAction} className="flex items-center gap-2">
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
                <DeleteUserButton uid={user.uid} name={user.name} />
              </div>
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
          <td className="px-4 py-3">{formatDateOnly(expense.createdAt)}</td>
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
