import { NextResponse } from "next/server";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { getAdminAuth, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { cloudinaryUploadSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  if (!hasFirebaseAdminConfig()) {
    return NextResponse.json({ error: "Firebase Admin غير مهيأ" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  const auth = getAdminAuth();
  if (!auth || !idToken) {
    return NextResponse.json({ error: "تعذر التحقق من المستخدم" }, { status: 401 });
  }

  try {
    await auth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "جلسة التسجيل غير صالحة" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
  }

  const parsed = cloudinaryUploadSchema.safeParse({
    folder: "users",
    fileType: file.type,
    fileSize: file.size,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ملف غير مسموح" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadBufferToCloudinary(buffer, "users", file.type === "application/pdf" ? "raw" : "image");
    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    });
  } catch {
    return NextResponse.json({ error: "Cloudinary غير مهيأ أو فشل الرفع" }, { status: 500 });
  }
}
