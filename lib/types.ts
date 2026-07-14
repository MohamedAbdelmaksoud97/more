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

export type WarrantyReturnType = "INSPECTION_FIRST" | "DIRECT_REPLACEMENT";

export type WarrantyReturnStatus =
  | "RETURN_REQUESTED"
  | "OLD_BATTERY_IN_TRANSIT"
  | "OLD_BATTERY_RECEIVED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "REPLACEMENT_PENDING_REVIEW"
  | "REPLACEMENT_APPROVED_RESERVED"
  | "REPLACEMENT_SHIPPED"
  | "REPLACEMENT_DELIVERED"
  | "USAGE_FEE_COLLECTED"
  | "REPLACEMENT_COMPLETED"
  | "CANCELLED";

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
  | "ORDER_CREATED_NO_DEPOSIT"
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
  | "WARRANTY_RETURN_CREATED"
  | "WARRANTY_RETURN_RECEIVED"
  | "WARRANTY_RETURN_APPROVED"
  | "WARRANTY_RETURN_REJECTED"
  | "WARRANTY_REPLACEMENT_SHIPPED"
  | "WARRANTY_REPLACEMENT_COMPLETED"
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
  address?: string;
  nationalIdImageUrl?: string;
  addressProofImageUrl?: string;
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
  customerPhones?: string[];
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
  scrapWeightKg?: number;
  scrapKiloPrice?: number;
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
  warrantyMonths?: number;
  warrantyEndsAt?: string;
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

export interface WarrantyReturn {
  id: string;
  returnNumber: string;
  originalOrderId: string;
  originalOrderNumber?: string;
  originalProductId: string;
  originalProductName: string;
  replacementProductId?: string;
  replacementProductName?: string;
  replacementLocation?: InventoryLocation;
  customer: CustomerInfo;
  marketerId: string;
  marketerName: string;
  coordinatorId?: string;
  type: WarrantyReturnType;
  status: WarrantyReturnStatus;
  warrantyUntil?: string;
  reason: string;
  usageFee: number;
  collectedUsageFee: number;
  oldBatteryShippingBillUrl?: string;
  oldBatteryShippingTrackingNumber?: string;
  replacementShippingBillUrl?: string;
  oldBatteryReceived: boolean;
  oldBatteryReceivedAt?: string;
  rejectionReason?: string;
  notes?: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
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
  relatedEntityType?: "order" | "product" | "user" | "report" | "commission" | "warrantyReturn";
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
