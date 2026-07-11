# MORE Energy ERP

نظام ERP عربي لشركة مور لأعمال الطاقة / MORE Energy مبني بـ Next.js و Firebase و Cloudinary.

## التشغيل المحلي

```bash
npm install
npm run dev
```

افتح `http://localhost:3000`.

عند غياب مفاتيح Firebase Admin و Cloudinary يعمل النظام ببيانات عرض تجريبية بدون أسرار. لا تضع أي مفاتيح داخل الكود.

## متغيرات البيئة

انسخ `.env.example` إلى `.env.local` ثم أضف القيم:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

`FIREBASE_ADMIN_PRIVATE_KEY` يمكن كتابته مع `\n` وسيتم تحويله على الخادم.

## الأدوار

- المدير: اعتماد المستخدمين، المنتجات، المخزون، الطلبات، التقارير، المصروفات، الأهداف، العمولات.
- المنسق: مراجعة الطلبات، الشحن، التحصيل، إيصالات التسليم، الكهنة، المرتجعات، المخزون التشغيلي.
- المسوق: مشاهدة المنتجات، إنشاء الطلبات، متابعة العمولات والهدف، رفع إثباتات الطلبات الخاصة به.

## المسارات الرئيسية

- `/login`, `/register`, `/pending-approval`
- `/admin/dashboard`, `/admin/users`, `/admin/products`, `/admin/inventory`, `/admin/orders`, `/admin/commissions`, `/admin/targets`, `/admin/expenses`, `/admin/reports`, `/admin/scrap`, `/admin/notifications`, `/admin/settings`
- `/coordinator/dashboard`, `/coordinator/orders`, `/coordinator/orders/pending`, `/coordinator/orders/shipping`, `/coordinator/orders/returns`, `/coordinator/products`, `/coordinator/inventory`, `/coordinator/scrap`, `/coordinator/notifications`
- `/marketer/dashboard`, `/marketer/products`, `/marketer/products/[id]`, `/marketer/orders`, `/marketer/orders/new`, `/marketer/orders/[id]`, `/marketer/commissions`, `/marketer/target`, `/marketer/notifications`
- `/profile`, `/notifications`

## الأمان

- الأسرار server-only ولا يتم تعريض Firebase Admin أو Cloudinary للمتصفح.
- العمليات الحساسة تتحقق من المستخدم والدور على الخادم.
- قبول الطلب يحرك الكمية من `available` إلى `reserved`.
- إكمال الطلب يحرك الكمية من `reserved` إلى `sold`.
- فشل التسليم لا يرجع المخزون إلا بعد تأكيد الرجوع الفعلي.
- العمولة لا تعتمد إلا بعد اكتمال التسليم والتحصيل والإيصالات وعدم وجود مرتجع نشط.
- كل إشعار مهم يحفظ في Firestore قبل محاولة FCM.
- `audit_logs` يسجل العمليات المهمة من الخادم.

## Firebase

ملفات Firebase المضافة:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `public/firebase-messaging-sw.js`

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for default-deny access, approved-user checks, owner-scoped reads, admin-only finance controls, prevention of self role escalation, and strict validation on the main client-writable documents. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## ملاحظات الإنتاج

- فعّل Email/Password في Firebase Authentication.
- أنشئ أول مدير عبر Firebase Console أو سكربت Admin آمن، ثم استخدم صفحة المستخدمين لاعتماد الحسابات.
- اضبط `NEXT_PUBLIC_FIREBASE_VAPID_KEY` لتفعيل إشعارات المتصفح.
- اربط Cloudinary من خلال متغيرات البيئة فقط.
- راجع `firestore-rules-analysis.md` قبل نشر القواعد.
