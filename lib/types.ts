export type Role = "admin" | "coordinator" | "marketer";

export type UserStatus =
  | "PENDING_EMAIL_VERIFICATION"
  | "PENDING_ADMIN_APPROVAL"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";
export type CommissionType = "FIXED" | "PERCENTAGE";
export type InventoryLocation = "SHOWROOM" | "WAREHOUSE" | "SUPPLIER_DIRECT";

export type OrderStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "APPROVED_RESERVED"
  | "PREPARING_SHIPPING"
  | "SHIPPED"
  | "DELIVERED_PENDING_CONFIRMATION"
  | "PAYMENT_CONFIRMED"
  | "COMMISSION_PENDING"
  | "COMPLETED"
  | "FAILED_DELIVERY"
  | "RETURNED_PENDING_STOCK"
  | "RETURNED_TO_STOCK"
  | "CANCELLED";

export type ScrapStatus =
  | "EXPECTED"
  | "RECEIVED"
  | "REJECTED"
  | "VALUE_ADJUSTED"
  | "ADDED_TO_REPORT";

export type CommissionStatus =
  | "EXPECTED"
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "CANCELLED"
  | "DEDUCTED";

export type NotificationType =
  | "USER_REGISTERED"
  | "USER_APPROVED"
  | "USER_REJECTED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_PRICE_CHANGED"
  | "PRODUCT_STOCK_LOW"
  | "PRODUCT_IMAGES_REQUESTED"
  | "PRODUCT_IMAGES_ADDED"
  | "ORDER_CREATED"
  | "ORDER_APPROVED"
  | "ORDER_REJECTED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_PAYMENT_CONFIRMED"
  | "ORDER_FAILED_DELIVERY"
  | "ORDER_RETURNED_TO_STOCK"
  | "COMMISSION_PENDING"
  | "COMMISSION_APPROVED"
  | "COMMISSION_PAID"
  | "COMMISSION_DEDUCTED"
  | "SCRAP_ADDED"
  | "SCRAP_RECEIVED"
  | "SCRAP_REJECTED"
  | "SCRAP_VALUE_CHANGED"
  | "EXPENSE_CREATED"
  | "TARGET_UPDATED";

export interface NavSection {
  title: string;
  links: Array<{ href: string; label: string }>;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  fcmTokens?: string[];
  commissionType?: CommissionType;
  commissionValue?: number;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
}

export interface ProductImage {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  uploadedBy: string;
  createdAt: string;
}

export interface StockRecord {
  location: InventoryLocation;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice?: number;
  images: ProductImage[];
  category: string;
  active: boolean;
  stock: StockRecord[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageRequest {
  id: string;
  productId: string;
  productName: string;
  requesterId: string;
  requesterName: string;
  notes: string;
  status: "OPEN" | "FULFILLED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInfo {
  customerName: string;
  customerPhone: string;
  governorate: string;
  area: string;
  address: string;
  notes?: string;
}

export interface PaymentInfo {
  hasDeposit: boolean;
  depositAmount: number;
  depositImageUrl?: string;
  remainingAmount: number;
  paymentOnDelivery: boolean;
}

export interface ScrapInfo {
  hasScrap: boolean;
  scrapType?: string;
  scrapAmpere?: number;
  scrapEstimatedValue?: number;
  scrapImageUrl?: string;
  scrapNotes?: string;
  status?: ScrapStatus;
  confirmedValue?: number;
}

export interface OrderTimelineEvent {
  label: string;
  actorName: string;
  at: string;
  details?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customer: CustomerInfo;
  productId: string;
  productName: string;
  quantity: number;
  selectedLocation: InventoryLocation;
  finalPrice: number;
  discount?: number;
  payment: PaymentInfo;
  scrap: ScrapInfo;
  status: OrderStatus;
  marketerId: string;
  marketerName: string;
  coordinatorId?: string;
  rejectionReason?: string;
  shippingBillUrl?: string;
  deliveryReceiptByCoordinatorUrl?: string;
  deliveryReceiptByMarketerUrl?: string;
  collectedAmount?: number;
  isPaymentCollected: boolean;
  commissionStatus: CommissionStatus;
  commissionAmount: number;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Commission {
  id: string;
  orderId: string;
  marketerId: string;
  status: CommissionStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface Target {
  id: string;
  marketerId: string;
  marketerName: string;
  month: number;
  year: number;
  targetAmount: number;
  achievedAmount: number;
  remainingAmount: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  attachmentUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  recipientUserId?: string;
  recipientRole?: Role;
  actorUserId: string;
  actorName: string;
  relatedEntityType?: "order" | "product" | "user" | "report" | "commission";
  relatedEntityId?: string;
  isRead: boolean;
  requiresAction: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

export interface DashboardStats {
  totalSales: number;
  grossProfit: number;
  netCash: number;
  pendingCommissions: number;
  approvedCommissions: number;
  paidCommissions: number;
  expenses: number;
  returns: number;
  scrapValue: number;
}
