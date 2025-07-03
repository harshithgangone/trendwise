import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://your-backend-url.onrender.com"

export async function GET(request: NextRequest) {
  try {
    console.log("📡 [FRONTEND] Fetching data source status...")

    const response = await fetch(`${BACKEND_URL}/api/admin/data-source-status`, {
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

      // Return fallback data source status
      return NextResponse.json({
        success: true,
        isUsingRealData: false,
        source: "Fallback Content",
        gnewsStatus: "Offline",
        groqStatus: "Offline",
        unsplashStatus: "Offline",
      })
    }

    const data = await response.json()
    console.log("✅ [FRONTEND] Got data source status")

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND] Error fetching data source status:", error)

    return NextResponse.json({
      success: true,
      isUsingRealData: false,
      source: "Error - Using Fallback",
      gnewsStatus: "Connection Error",
      groqStatus: "Connection Error",
      unsplashStatus: "Connection Error",
    })
  }
}
