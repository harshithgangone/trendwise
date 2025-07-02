import { NextResponse } from "next/server"

// Mock bot status
const mockBotStatus = {
  status: "running",
  isActive: true,
  lastRun: new Date().toISOString(),
  nextRun: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
  stats: {
    totalRuns: 24,
    successfulRuns: 22,
    failedRuns: 2,
    articlesGenerated: 66,
  },
}

export const dynamic = "force-dynamic"

export async function GET() {
  try {
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
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FRONTEND API] Successfully fetched bot status")
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

      return NextResponse.json(mockBotStatus)
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching bot status:", error)
    return NextResponse.json(mockBotStatus, { status: 500 })
  }
}
