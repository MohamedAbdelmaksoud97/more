import { z } from "zod";

export const roleSchema = z.enum(["admin", "coordinator", "marketer"]);
export const userStatusSchema = z.enum([
  "PENDING_EMAIL_VERIFICATION",
  "PENDING_ADMIN_APPROVAL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);

export const stockSchema = z.object({
  location: z.enum(["SHOWROOM", "WAREHOUSE", "SUPPLIER_DIRECT"]),
  available: z.coerce.number().int().min(0, "الكمية المتاحة غير صحيحة"),
  reserved: z.coerce.number().int().min(0, "الكمية المحجوزة غير صحيحة"),
  sold: z.coerce.number().int().min(0, "الكمية المباعة غير صحيحة"),
  returned: z.coerce.number().int().min(0, "كمية المرتجع غير صحيحة"),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "اسم المنتج مطلوب").max(120),
  description: z.string().trim().min(5, "الوصف التفصيلي مطلوب").max(2000),
  price: z.coerce.number().positive("السعر يجب أن يكون أكبر من صفر"),
  costPrice: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  category: z.string().trim().min(2, "التصنيف مطلوب").max(80),
  active: z.coerce.boolean().default(true),
  stock: z.array(stockSchema).min(3, "يجب إدخال كمية المخازن الثلاثة"),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        publicId: z.string(),
        format: z.string(),
        bytes: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        uploadedBy: z.string(),
        createdAt: z.string(),
      }),
    )
    .max(20, "الحد الأقصى 20 صورة")
    .default([]),
});

export const imageRequestSchema = z.object({
  productId: z.string().min(1, "اختر المنتج"),
  notes: z
    .string()
    .trim()
    .min(5, "اكتب نوع الصور المطلوبة")
    .max(700, "وصف الصور المطلوبة طويل جدًا"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(80),
  email: z.string().trim().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().trim().min(8, "رقم الهاتف مطلوب").max(20),
  password: z.string().min(8, "كلمة المرور لا تقل عن 8 أحرف"),
});

export const orderSchema = z.object({
  customerName: z.string().trim().min(2, "اسم العميل مطلوب").max(100),
  customerPhone: z.string().trim().min(8, "رقم العميل مطلوب").max(20),
  governorate: z.string().trim().min(2, "المحافظة مطلوبة").max(80),
  area: z.string().trim().min(2, "المنطقة مطلوبة").max(100),
  address: z.string().trim().min(5, "العنوان مطلوب").max(300),
  notes: z.string().trim().max(1000).optional(),
  productId: z.string().min(1, "اختر المنتج"),
  quantity: z.coerce.number().int().positive("الكمية غير صحيحة"),
  selectedLocation: z.enum(["SHOWROOM", "WAREHOUSE", "SUPPLIER_DIRECT"]),
  finalPrice: z.coerce.number().optional(),
  discount: z.coerce.number().min(0).default(0),
  hasDeposit: z.coerce.boolean().default(false),
  depositAmount: z.coerce.number().min(0).default(0),
  depositImageUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  paymentOnDelivery: z.coerce.boolean().default(true),
  hasScrap: z.coerce.boolean().default(false),
  scrapType: z.string().trim().max(80).optional(),
  scrapAmpere: z.coerce.number().min(0).optional(),
  scrapEstimatedValue: z.coerce.number().min(0).optional(),
  scrapImageUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  scrapNotes: z.string().trim().max(1000).optional(),
});

export const orderDecisionSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(3, "سبب الرفض مطلوب").max(500).optional(),
});

export const statusUpdateSchema = z.object({
  orderId: z.string().min(1),
  status: z.string().min(1),
  documentUrl: z.string().url().optional(),
  collectedAmount: z.coerce.number().min(0).optional(),
});

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("قيمة المصروف مطلوبة"),
  category: z.string().trim().min(2, "التصنيف مطلوب").max(80),
  note: z.string().trim().min(2, "الملاحظة مطلوبة").max(500),
  attachmentUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
});

export const targetSchema = z.object({
  marketerId: z.string().min(1, "اختر المسوق"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2024).max(2100),
  targetAmount: z.coerce.number().min(0),
});

export const cloudinaryUploadSchema = z.object({
  folder: z.enum(["products", "orders", "shipping", "receipts", "deposits", "scrap", "expenses"]),
  fileType: z.string().regex(/^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/),
  fileSize: z.number().max(20 * 1024 * 1024, "حجم الملف لا يتجاوز 20 ميجابايت"),
});
