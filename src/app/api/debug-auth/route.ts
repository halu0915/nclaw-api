export async function GET() {
  return Response.json({
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ? process.env.AUTH_GOOGLE_ID.slice(0, 10) + "..." : "MISSING",
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ? "SET (" + process.env.AUTH_GOOGLE_SECRET.length + " chars)" : "MISSING",
    AUTH_SECRET: process.env.AUTH_SECRET ? "SET" : "MISSING",
    AUTH_URL: process.env.AUTH_URL || "NOT SET",
  });
}
