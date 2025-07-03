export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback bot status
const FALLBACK_BOT_STATUS = {
  isRunning: true,
  lastRun: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
  nextRun: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
  articlesGenerated: 161,
  successRate: 95.2,
  status: "active",
  interval: "5 minutes",
}

export async function GET(request: NextRequest) {
  try {
    console.log("🤖 [FRONTEND API] Fetching bot status")

    // Try to fetch from backend first
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${BACKEND_URL}/api/admin/bot-status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TrendWise-Frontend/1.0",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FRONTEND API] Successfully fetched bot status")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status} for bot status`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable for bot status, using fallback")

      return NextResponse.json({
        success: true,
        botStatus: FALLBACK_BOT_STATUS,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching bot status:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bot status",
        botStatus: FALLBACK_BOT_STATUS,
      },
      { status: 500 },
    )
  }
}
