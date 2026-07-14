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

export const warrantyReturnTypeLabels: Record<string, string> = {
  INSPECTION_FIRST: "مسار الفحص أولا",
  DIRECT_REPLACEMENT: "مسار الاستبدال المباشر",
};

export const warrantyReturnStatusLabels: Record<string, string> = {
  RETURN_REQUESTED: "طلب مرتجع جديد",
  OLD_BATTERY_IN_TRANSIT: "البطارية القديمة في الطريق",
  OLD_BATTERY_RECEIVED: "تم استلام القديمة",
  RETURN_APPROVED: "تم قبول المرتجع",
  RETURN_REJECTED: "تم رفض المرتجع",
  REPLACEMENT_PENDING_REVIEW: "استبدال بانتظار المراجعة",
  REPLACEMENT_APPROVED_RESERVED: "استبدال مقبول ومحجوز",
  REPLACEMENT_SHIPPED: "تم شحن البديل",
  REPLACEMENT_DELIVERED: "تم تسليم البديل",
  USAGE_FEE_COLLECTED: "تم تحصيل الاستهلاك",
  REPLACEMENT_COMPLETED: "اكتمل الاستبدال",
  CANCELLED: "ملغي",
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
      { href: "/admin/returns", label: "مرتجعات الضمان" },
      { href: "/admin/notifications", label: "الإشعارات" },
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
      { href: "/coordinator/returns", label: "مرتجعات الضمان" },
      { href: "/coordinator/expenses", label: "المصروفات" },
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
      { href: "/marketer/returns", label: "مرتجعات الضمان" },
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
