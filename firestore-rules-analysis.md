# Firestore Rules Analysis - MORE Energy ERP

This untracked analysis summarizes the first-pass Firestore access model used to generate `firestore.rules`.

## Collections

- `users/{uid}`: PII profile, role, approval status, commission settings. Owner can read own document. Admin can read/update all. New authenticated users may create only their own pending marketer profile.
- `products/{productId}`: Product catalog with prices, Cloudinary image metadata, and stock array by location. Approved users can read. Admin/coordinator can create/update. Admin can delete.
- `orders/{orderId}`: Customer PII, selected product/location, payment, scrap, commission status, timeline. Admin/coordinator can read. Marketer can read/create own orders and limited receipt updates.
- `commissions/{commissionId}`: Order commission state. Admin can manage; marketer can read own commission.
- `targets/{targetId}`: Monthly marketer target. Admin can manage; marketer can read own target.
- `expenses/{expenseId}`: Admin-only finance data.
- `notifications/{notificationId}`: Recipient-scoped notification center. Recipient user, recipient role, and admin can read; user may mark own notifications read only.
- `fcmTokens/{tokenId}`: Token registry. Owner can create/delete own token; server routes normally write these through Admin SDK.
- `imageRequests/{requestId}`: Marketer requests for product images. Approved users can create scoped requests; admin/coordinator can manage.
- `scrapReports/{scrapId}`: Scrap/kahna reports. Admin/coordinator can manage; marketer can read/create own scoped reports.
- `audit_logs/{logId}`: Admin read only; client writes denied. Server Admin SDK writes audit logs.

## Query patterns in app code

- `products.orderBy(updatedAt desc).limit(200)`
- `orders.where(marketerId == uid).orderBy(updatedAt desc).limit(300)`
- `orders.where(status == value).orderBy(updatedAt desc).limit(300)`
- `notifications.where(recipientUserId == uid).orderBy(createdAt desc).limit(50)`
- `notifications.where(recipientRole == role).orderBy(createdAt desc).limit(50)`
- `targets.orderBy(updatedAt desc).limit(200)`
- `expenses.orderBy(createdAt desc).limit(200)`
- `users.orderBy(createdAt desc).limit(200)`

## Devil's Advocate Checks

- Public list exploit: blocked by default deny and `isApproved()`.
- Unauthorized user PII read: blocked because user docs require owner or admin.
- Ownership hijacking create/update: ownership fields must match `request.auth.uid`; immutable checks protect ownership on update.
- Privilege escalation: users cannot create approved/admin profiles; only admin can change role/status.
- Schema pollution: validators use `hasOnly` for core collections.
- Resource exhaustion: string/list/map fields have size checks where client writes are allowed.
- Invalid stock/commission transitions: sensitive stock and finance writes are restricted to admin/coordinator/admin as appropriate; final business invariants are also enforced server-side.
- Audit tampering: client writes to `audit_logs` are denied.

## Assumptions

- Server Actions and Route Handlers use Firebase Admin SDK and bypass Security Rules for privileged operations.
- Firebase Auth custom claims include `role` and `status`.
- Cloudinary URLs are HTTPS and file upload validation happens in `/api/upload/cloudinary`.
