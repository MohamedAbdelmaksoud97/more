import type { NavSection, Role } from "./types";

export const COMPANY = {
  arName: "مور لأعمال الطاقة",
  enName: "MORE Energy",
  appName: "MORE Energy ERP",
};

export const roleLabels: Record<Role, string> = {
  admin: "المدير",
  coordinator: "المنسق",
  marketer: "المسوق",
};

export const orderStatusLabels: Record<string, string> = {
  DRAFT: "مسودة",
  PENDING_REVIEW: "بانتظار المراجعة",
  REJECTED: "مرفوض",
  APPROVED_RESERVED: "مقبول ومحجوز",
  PREPARING_SHIPPING: "تجهيز الشحن",
  SHIPPED: "تم الشحن",
  DELIVERED_PENDING_CONFIRMATION: "تم التسليم بانتظار التأكيد",
  PAYMENT_CONFIRMED: "تم تأكيد التحصيل",
  COMMISSION_PENDING: "العمولة قيد المراجعة",
  COMPLETED: "مكتمل",
  FAILED_DELIVERY: "فشل التسليم",
  RETURNED_PENDING_STOCK: "مرتجع بانتظار المخزن",
  RETURNED_TO_STOCK: "عاد للمخزون",
  CANCELLED: "ملغي",
};

export const commissionStatusLabels: Record<string, string> = {
  EXPECTED: "متوقعة",
  PENDING: "قيد الاعتماد",
  APPROVED: "معتمدة",
  PAID: "مدفوعة",
  CANCELLED: "ملغاة",
  DEDUCTED: "مخصومة",
};

export const locationLabels: Record<string, string> = {
  SHOWROOM: "المعرض",
  WAREHOUSE: "المخزن",
  SUPPLIER_DIRECT: "مخزن مورد للتسليم المباشر",
};

export const adminNav: NavSection[] = [
  {
    title: "الإدارة",
    links: [
      { href: "/admin/dashboard", label: "لوحة التحكم" },
      { href: "/admin/users", label: "المستخدمون" },
      { href: "/admin/products", label: "المنتجات" },
      { href: "/admin/inventory", label: "المخزون" },
      { href: "/admin/orders", label: "الطلبات" },
      { href: "/admin/orders/new", label: "طلب جديد" },
    ],
  },
  {
    title: "المالية",
    links: [
      { href: "/admin/commissions", label: "العمولات" },
      { href: "/admin/targets", label: "الأهداف" },
      { href: "/admin/expenses", label: "المصروفات" },
      { href: "/admin/reports", label: "التقارير" },
      { href: "/admin/scrap", label: "الكهنة" },
    ],
  },
  {
    title: "النظام",
    links: [
      { href: "/admin/notifications", label: "الإشعارات" },
      { href: "/admin/settings", label: "الإعدادات" },
    ],
  },
];

export const coordinatorNav: NavSection[] = [
  {
    title: "العمليات",
    links: [
      { href: "/coordinator/dashboard", label: "لوحة التحكم" },
      { href: "/coordinator/orders", label: "كل الطلبات" },
      { href: "/coordinator/orders/new", label: "طلب جديد" },
      { href: "/coordinator/orders/pending", label: "مراجعة الطلبات" },
      { href: "/coordinator/orders/shipping", label: "الشحن" },
      { href: "/coordinator/orders/returns", label: "المرتجعات" },
    ],
  },
  {
    title: "المخزون",
    links: [
      { href: "/coordinator/products", label: "المنتجات" },
      { href: "/coordinator/inventory", label: "المخزون" },
      { href: "/coordinator/scrap", label: "الكهنة" },
      { href: "/coordinator/notifications", label: "الإشعارات" },
    ],
  },
];

export const marketerNav: NavSection[] = [
  {
    title: "المبيعات",
    links: [
      { href: "/marketer/dashboard", label: "لوحة التحكم" },
      { href: "/marketer/products", label: "المنتجات" },
      { href: "/marketer/orders", label: "طلباتي" },
      { href: "/marketer/orders/new", label: "طلب جديد" },
    ],
  },
  {
    title: "الحساب",
    links: [
      { href: "/marketer/commissions", label: "العمولات" },
      { href: "/marketer/target", label: "الهدف الشهري" },
      { href: "/marketer/notifications", label: "الإشعارات" },
    ],
  },
];
