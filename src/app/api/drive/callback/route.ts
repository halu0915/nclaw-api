import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;
const REDIRECT_URI = `${process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://api.nplusstar.ai"}/api/drive/callback`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return html("授權失敗", "請回到 Bot 重新輸入 /connect_drive");
  }

  // state format: "tg_USERID_RANDOM"
  const parts = state.split("_");
  if (parts.length < 3 || parts[0] !== "tg") {
    return html("連結已過期", "請重新輸入 /connect_drive");
  }

  try {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(code);
    const telegramUserId = parts[1];
    const BOT_TOKEN = process.env.NCLAW_BOT_TOKEN;

    if (BOT_TOKEN && tokens.refresh_token) {
      // Store token in Vercel KV-like temporary storage via a simple endpoint
      // For now: save to a Vercel Edge Config or just use the admin notification approach
      // Simplest: write a temp file that the bot can fetch, or use Telegram sendMessage with a parseable format

      // Notify user of success
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramUserId,
          text: `✅ Google Drive 授權成功！\n\n請複製以下指令貼回 Bot 完成連結：\n\n/save_token ${Buffer.from(JSON.stringify({
            rt: tokens.refresh_token,
            at: tokens.access_token,
            ex: tokens.expiry_date,
          })).toString("base64")}`,
        }),
      });
    }

    return html(
      "Google Drive 授權成功！",
      `你的 Google Drive 已連結到 N+Claw Bot。<br><br>可以關閉此頁面，回到 Telegram 繼續使用。`
    );
  } catch (err: any) {
    console.error("Drive callback error:", err);
    return html("授權失敗", `${err.message}<br>請重新輸入 /connect_drive`);
  }
}

function html(title: string, body: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>N+Claw - ${title}</title>
<style>
body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;color:white;}
.card{background:#16213e;border-radius:16px;padding:40px;max-width:400px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3);}
h1{color:#e94560;margin-bottom:16px;font-size:22px;}
p{color:#94a3b8;line-height:1.6;}
</style></head><body>
<div class="card"><h1>${title}</h1><p>${body}</p></div>
</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
