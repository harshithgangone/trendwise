import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://your-backend-url.onrender.com"

export async function GET(request: NextRequest) {
  try {
    console.log("🤖 [FRONTEND] Fetching bot status...")

    const response = await fetch(`${BACKEND_URL}/api/admin/bot-status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      console.error(`❌ [FRONTEND] Backend error: ${response.status}`)

      // Return fallback bot status
      return NextResponse.json({
        success: true,
        botStatus: {
          isRunning: false,
          lastRun: new Date(Date.now() - 300000).toISOString(),
          nextRun: new Date(Date.now() + 300000).toISOString(),
          articlesGenerated: 0,
          status: "Offline - Backend Connection Error",
        },
      })
    }

    const data = await response.json()
    console.log("✅ [FRONTEND] Got bot status")

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND] Error fetching bot status:", error)

    return NextResponse.json({
      success: true,
      botStatus: {
        isRunning: false,
        lastRun: null,
        nextRun: null,
        articlesGenerated: 0,
        status: "Connection Error",
      },
    })
  }
}
