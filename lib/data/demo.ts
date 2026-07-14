import type {
  Commission,
  DashboardStats,
  Expense,
  NotificationItem,
  Order,
  Product,
  Target,
  UserProfile,
} from "@/lib/types";

const now = new Date().toISOString();
const demoWarrantyEndsAt = (() => {
  const date = new Date();
  date.setMonth(date.getMonth() + 12);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
})();

export const demoCurrentUser: UserProfile = {
  uid: "demo-admin",
  name: "مدير تجريبي",
  email: "admin@more-energy.local",
  phone: "01000000000",
  role: "admin",
  status: "APPROVED",
  commissionType: "PERCENTAGE",
  commissionValue: 5,
  createdAt: now,
  updatedAt: now,
};

export const demoUsers: UserProfile[] = [
  demoCurrentUser,
  {
    uid: "demo-coordinator",
    name: "منسق العمليات",
    email: "ops@more-energy.local",
    phone: "01111111111",
    role: "coordinator",
    status: "APPROVED",
    createdAt: now,
    updatedAt: now,
    approvedBy: "demo-admin",
    approvedAt: now,
  },
  {
    uid: "demo-marketer",
    name: "مسوق القاهرة",
    email: "sales@more-energy.local",
    phone: "01222222222",
    role: "marketer",
    status: "APPROVED",
    commissionType: "PERCENTAGE",
    commissionValue: 4,
    createdAt: now,
    updatedAt: now,
    approvedBy: "demo-admin",
    approvedAt: now,
  },
];

export const demoProducts: Product[] = [
  {
    id: "battery-100ah",
    name: "بطارية طاقة 100 أمبير",
    description: "بطارية مناسبة لأنظمة الطاقة الشمسية والاستخدام المنزلي.",
    price: 8200,
    costPrice: 6900,
    category: "بطاريات",
    active: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?q=80&w=1200&auto=format&fit=crop",
        publicId: "demo/battery",
        format: "jpg",
        bytes: 120000,
        width: 1200,
        height: 800,
        uploadedBy: "demo-admin",
        createdAt: now,
      },
    ],
    stock: [
      { location: "SHOWROOM", available: 6, reserved: 1, sold: 10, returned: 0 },
      { location: "WAREHOUSE", available: 18, reserved: 3, sold: 27, returned: 1 },
      { location: "SUPPLIER_DIRECT", available: 11, reserved: 0, sold: 8, returned: 0 },
    ],
    createdBy: "demo-admin",
    updatedBy: "demo-admin",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "inverter-5kw",
    name: "انفرتر هجين 5 كيلو",
    description: "انفرتر هجين للشحن من الشبكة والطاقة الشمسية مع شاشة متابعة.",
    price: 24500,
    costPrice: 21000,
    category: "انفرترات",
    active: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=1200&auto=format&fit=crop",
        publicId: "demo/inverter",
        format: "jpg",
        bytes: 110000,
        width: 1200,
        height: 800,
        uploadedBy: "demo-admin",
        createdAt: now,
      },
    ],
    stock: [
      { location: "SHOWROOM", available: 2, reserved: 0, sold: 4, returned: 0 },
      { location: "WAREHOUSE", available: 7, reserved: 1, sold: 13, returned: 0 },
      { location: "SUPPLIER_DIRECT", available: 4, reserved: 0, sold: 6, returned: 0 },
    ],
    createdBy: "demo-admin",
    updatedBy: "demo-admin",
    createdAt: now,
    updatedAt: now,
  },
];

export const demoOrders: Order[] = [
  {
    id: "order-1001",
    customer: {
      customerName: "أحمد محمود",
      customerPhone: "01012345678",
      governorate: "القاهرة",
      area: "مدينة نصر",
      address: "شارع الطاقة، عمارة 12",
      notes: "يفضل التسليم مساء",
    },
    productId: "battery-100ah",
    productName: "بطارية طاقة 100 أمبير",
    quantity: 1,
    selectedLocation: "WAREHOUSE",
    finalPrice: 8200,
    discount: 0,
    warrantyMonths: 12,
    warrantyEndsAt: demoWarrantyEndsAt,
    payment: {
      hasDeposit: true,
      depositAmount: 1000,
      remainingAmount: 7200,
      paymentOnDelivery: true,
    },
    scrap: {
      hasScrap: true,
      scrapType: "بطارية قديمة",
      scrapAmpere: 70,
      scrapEstimatedValue: 900,
      status: "EXPECTED",
    },
    status: "APPROVED_RESERVED",
    marketerId: "demo-marketer",
    marketerName: "مسوق القاهرة",
    coordinatorId: "demo-coordinator",
    isPaymentCollected: false,
    commissionStatus: "EXPECTED",
    commissionAmount: 328,
    timeline: [
      { label: "تم إنشاء الطلب", actorName: "مسوق القاهرة", at: now },
      { label: "تم قبول الطلب وحجز المخزون", actorName: "منسق العمليات", at: now },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "order-1002",
    customer: {
      customerName: "منى السيد",
      customerPhone: "01198765432",
      governorate: "الجيزة",
      area: "الهرم",
      address: "شارع الملك فيصل",
    },
    productId: "inverter-5kw",
    productName: "انفرتر هجين 5 كيلو",
    quantity: 1,
    selectedLocation: "SHOWROOM",
    finalPrice: 24000,
    discount: 500,
    warrantyMonths: 6,
    warrantyEndsAt: demoWarrantyEndsAt,
    payment: {
      hasDeposit: false,
      depositAmount: 0,
      remainingAmount: 24000,
      paymentOnDelivery: true,
    },
    scrap: { hasScrap: false },
    status: "COMPLETED",
    marketerId: "demo-marketer",
    marketerName: "مسوق القاهرة",
    coordinatorId: "demo-coordinator",
    isPaymentCollected: true,
    collectedAmount: 24000,
    commissionStatus: "APPROVED",
    commissionAmount: 960,
    deliveryReceiptByCoordinatorUrl: "https://example.com/receipt.pdf",
    deliveryReceiptByMarketerUrl: "https://example.com/marketer-receipt.pdf",
    timeline: [
      { label: "تم إنشاء الطلب", actorName: "مسوق القاهرة", at: now },
      { label: "تم التحصيل", actorName: "منسق العمليات", at: now },
      { label: "تم اعتماد العمولة", actorName: "مدير تجريبي", at: now },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

export const demoCommissions: Commission[] = [
  {
    id: "commission-1002",
    orderId: "order-1002",
    marketerId: "demo-marketer",
    status: "APPROVED",
    amount: 960,
    createdAt: now,
    updatedAt: now,
  },
];

export const demoTargets: Target[] = [
  {
    id: "target-demo-marketer",
    marketerId: "demo-marketer",
    marketerName: "مسوق القاهرة",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    targetAmount: 250000,
    achievedAmount: 32200,
    remainingAmount: 217800,
    updatedBy: "demo-admin",
    createdAt: now,
    updatedAt: now,
  },
];

export const demoExpenses: Expense[] = [
  {
    id: "expense-delivery",
    amount: 650,
    category: "شحن",
    note: "تكلفة تسليم داخل القاهرة",
    createdBy: "demo-admin",
    createdAt: now,
  },
];

export const demoNotifications: NotificationItem[] = [
  {
    id: "notification-order",
    title: "طلب جديد بانتظار المتابعة",
    body: "تم إنشاء طلب بطارية 100 أمبير ويحتاج مراجعة العمليات.",
    type: "ORDER_CREATED",
    recipientRole: "coordinator",
    actorUserId: "demo-marketer",
    actorName: "مسوق القاهرة",
    relatedEntityType: "order",
    relatedEntityId: "order-1001",
    isRead: false,
    requiresAction: true,
    createdAt: now,
  },
  {
    id: "notification-commission",
    title: "عمولة معتمدة",
    body: "تم اعتماد عمولة الطلب order-1002.",
    type: "COMMISSION_APPROVED",
    recipientUserId: "demo-marketer",
    actorUserId: "demo-admin",
    actorName: "مدير تجريبي",
    relatedEntityType: "commission",
    relatedEntityId: "commission-1002",
    isRead: false,
    requiresAction: false,
    createdAt: now,
  },
];

export const demoStats: DashboardStats = {
  totalSales: 32200,
  grossProfit: 4300,
  netCash: 31550,
  pendingCommissions: 328,
  approvedCommissions: 960,
  paidCommissions: 0,
  expenses: 650,
  returns: 0,
  scrapValue: 900,
};
