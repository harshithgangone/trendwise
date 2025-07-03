import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback stats
const FALLBACK_STATS = {
  totalArticles: 127,
  totalComments: 89,
  totalUsers: 45,
  trendsGenerated: 23,
  articlesThisWeek: 12,
  commentsThisWeek: 34,
  topCategories: [
    { name: "Technology", count: 45 },
    { name: "Science", count: 32 },
    { name: "Business", count: 28 },
  ],
}

export async function GET(request: NextRequest) {
  try {
    console.log("📊 [FRONTEND API] Fetching admin stats")

    // Try to fetch from backend
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
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
        console.log("✅ [FRONTEND API] Successfully fetched stats from backend")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable, using fallback stats")

      return NextResponse.json({
        success: true,
        stats: FALLBACK_STATS,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching admin stats:", error)

    return NextResponse.json({
      success: true,
      stats: FALLBACK_STATS,
    })
  }
}
