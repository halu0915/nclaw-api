import { NextRequest, NextResponse } from "next/server";
import { revokeApiKey } from "@/lib/auth";

function checkAdmin(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error("[admin] ADMIN_SECRET env not set — admin endpoint disabled");
    return false;
  }
  const auth = req.headers.get("x-admin-secret");
  return auth === adminSecret;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId } = await params;
  await revokeApiKey(keyId);
  return NextResponse.json({ message: "Key revoked" });
}
