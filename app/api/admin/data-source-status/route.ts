import { NextResponse } from "next/server"

// Mock data source status
const mockDataSourceStatus = {
  isUsingRealData: false,
  source: "Mock Data",
  lastUpdate: new Date().toISOString(),
  health: "healthy",
}

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔍 [FRONTEND API] Fetching data source status...")
      const apiUrl = `${backendUrl}/api/admin/data-source-status`
      console.log("🔗 [FRONTEND API] Data Source Status API URL:", apiUrl)

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
        console.log("✅ [FRONTEND API] Successfully fetched data source status")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status}, using mock data source status`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available for data source status, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      return NextResponse.json(mockDataSourceStatus)
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching data source status:", error)
    return NextResponse.json(mockDataSourceStatus, { status: 500 })
  }
}
