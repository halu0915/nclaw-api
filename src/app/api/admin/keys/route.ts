import { NextRequest, NextResponse } from "next/server";
import { getAllKeys } from "@/lib/auth";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "nclaw-admin-2026";

function checkAdmin(req: NextRequest): boolean {
  const auth = req.headers.get("x-admin-secret");
  return auth === ADMIN_SECRET;
}

// List all API keys
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = getAllKeys();
  return NextResponse.json({
    keys: keys.map((k) => ({
      ...k,
      key: k.key.slice(0, 15) + "..." + k.key.slice(-4),
    })),
  });
}
