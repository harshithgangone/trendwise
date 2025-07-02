import { NextResponse } from "next/server"

// Mock bot status
const mockBotStatus = {
  isActive: true,
  isRunning: false,
  lastRun: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
  nextRun: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
  stats: {
    totalRuns: 48,
    successfulRuns: 45,
    failedRuns: 3,
    articlesGenerated: 142,
    averageRunTime: 45000,
    lastError: null,
  },
  config: {
    interval: "*/5 * * * *", // Every 5 minutes
    maxArticlesPerRun: 5,
    sources: ["gnews", "reddit", "trends"],
  },
  uptime: 86400,
  memory: {
    rss: 52428800,
    heapTotal: 29360128,
    heapUsed: 18874496,
  },
}

export async function GET() {
  try {
    // Try to fetch from backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🤖 [FRONTEND API] Fetching bot status...")
      const apiUrl = `${backendUrl}/api/admin/bot-status`
      console.log("🔗 [FRONTEND API] Bot Status API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FRONTEND API] Successfully fetched bot status from backend")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status}, using mock bot status`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available for bot status, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      return NextResponse.json({
        success: true,
        status: mockBotStatus,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching bot status:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bot status",
        status: mockBotStatus,
      },
      { status: 500 },
    )
  }
}
