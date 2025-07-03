export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback data source status
const FALLBACK_DATA_SOURCES = {
  gnews: {
    status: "unknown",
    lastCheck: new Date().toISOString(),
    responseTime: 0,
    error: "Backend connection unavailable",
  },
  groq: {
    status: "unknown",
    lastCheck: new Date().toISOString(),
    responseTime: 0,
    error: "Backend connection unavailable",
  },
  unsplash: {
    status: "unknown",
    lastCheck: new Date().toISOString(),
    responseTime: 0,
    error: "Backend connection unavailable",
  },
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [FRONTEND API] Fetching data source status...")

    // Try to fetch from backend first
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

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
        console.log("✅ [FRONTEND API] Successfully fetched data source status from backend")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable, using fallback data source status")

      return NextResponse.json({
        success: true,
        dataSources: FALLBACK_DATA_SOURCES,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching data source status:", error)

    return NextResponse.json({
      success: true,
      dataSources: FALLBACK_DATA_SOURCES,
    })
  }
}
