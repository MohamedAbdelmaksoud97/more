import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { cloudinaryUploadSchema } from "@/lib/schemas";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

export async function POST(request: Request) {
  await requireRole(["admin", "coordinator", "marketer"]);
  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "orders");
  if (!(file instanceof File)) return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });

  const parsed = cloudinaryUploadSchema.safeParse({
    folder,
    fileType: file.type,
    fileSize: file.size,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ملف غير مسموح" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await uploadBufferToCloudinary(buffer, parsed.data.folder, file.type === "application/pdf" ? "raw" : "image");
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
