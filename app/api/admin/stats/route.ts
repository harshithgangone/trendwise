import { NextResponse } from "next/server"

// Mock admin stats
const mockStats = {
  articles: {
    total: 156,
    published: 142,
    draft: 14,
    trending: 8,
    todayCount: 5,
  },
  engagement: {
    totalViews: 45230,
    totalLikes: 3420,
    totalShares: 890,
    totalComments: 567,
  },
  bot: {
    isActive: true,
    lastRun: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    totalRuns: 48,
    successfulRuns: 45,
    articlesGenerated: 142,
    successRate: 93.75,
  },
  performance: {
    avgResponseTime: 245,
    uptime: 99.8,
    memoryUsage: 78,
    cpuUsage: 34,
  },
}

export async function GET() {
  try {
    // Try to fetch from backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("📊 [FRONTEND API] Fetching admin stats...")
      const apiUrl = `${backendUrl}/api/admin/stats`
      console.log("🔗 [FRONTEND API] Admin Stats API URL:", apiUrl)

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
        console.log("✅ [FRONTEND API] Successfully fetched admin stats from backend")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status}, using mock stats`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available for admin stats, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      return NextResponse.json({
        success: true,
        stats: mockStats,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching admin stats:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch admin stats",
        stats: mockStats,
      },
      { status: 500 },
    )
  }
}
