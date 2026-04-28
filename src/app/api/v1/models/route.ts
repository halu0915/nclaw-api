import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { getAvailableModels } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json(
      { error: { message: auth.error, type: "authentication_error" } },
      { status: 401 }
    );
  }

  const models = getAvailableModels();
  return NextResponse.json({
    object: "list",
    data: models.map((m) => ({
      id: m.id,
      object: "model",
      owned_by: m.id.split("/")[0],
      provider: m.provider,
      context_window: m.contextWindow,
      supports_cache: m.supportsCache,
      pricing: m.pricing,
    })),
  });
}
