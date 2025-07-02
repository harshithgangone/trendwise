import { NextResponse } from "next/server"

// Mock admin stats
const mockStats = {
  totalArticles: 156,
  totalComments: 89,
  totalUsers: 23,
  trendsGenerated: 45,
}

export const dynamic = "force-dynamic"

export async function GET() {
  try {
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
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FRONTEND API] Successfully fetched admin stats")
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

      return NextResponse.json(mockStats)
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching admin stats:", error)
    return NextResponse.json(mockStats, { status: 500 })
  }
}
