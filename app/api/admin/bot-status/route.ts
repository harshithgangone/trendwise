import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [FRONTEND API] Checking data source status")

    // Try to fetch from backend
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${BACKEND_URL}/api/admin/data-source-status`, {
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
        console.log("✅ [FRONTEND API] Successfully fetched data source status")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable for data source check")

      return NextResponse.json({
        success: true,
        isUsingRealData: false,
        source: "Fallback Data (Backend Offline)",
        backendStatus: "offline",
        lastChecked: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error checking data source:", error)

    return NextResponse.json({
      success: true,
      isUsingRealData: false,
      source: "Fallback Data (Error)",
      backendStatus: "error",
      lastChecked: new Date().toISOString(),
    })
  }
}
