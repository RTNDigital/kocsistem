import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateFile, generateFileKey, uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const validationError = validateFile({ type: file.type, size: file.size });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = generateFileKey(file.name);
    const url = await uploadToR2(buffer, key, file.type);

    return NextResponse.json({
      url,
      key,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
