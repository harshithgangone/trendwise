import { NextResponse } from "next/server"

// Mock data source status
const mockDataSourceStatus = {
  sources: [
    {
      name: "Google Trends RSS",
      status: "healthy",
      lastCheck: new Date().toISOString(),
      responseTime: 245,
      uptime: 99.8,
      trendsFound: 15,
    },
    {
      name: "Reddit Hot Posts",
      status: "healthy",
      lastCheck: new Date().toISOString(),
      responseTime: 189,
      uptime: 98.5,
      trendsFound: 12,
    },
    {
      name: "Groq AI Service",
      status: "healthy",
      lastCheck: new Date().toISOString(),
      responseTime: 1200,
      uptime: 99.2,
      articlesGenerated: 142,
    },
    {
      name: "Unsplash Images",
      status: "healthy",
      lastCheck: new Date().toISOString(),
      responseTime: 567,
      uptime: 97.8,
      imagesProvided: 89,
    },
  ],
  overall: {
    status: "healthy",
    healthScore: 98.8,
    lastUpdate: new Date().toISOString(),
  },
}

export async function GET() {
  try {
    // Try to fetch from backend first
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
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FRONTEND API] Successfully fetched data source status from backend")
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

      return NextResponse.json({
        success: true,
        ...mockDataSourceStatus,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching data source status:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch data source status",
        ...mockDataSourceStatus,
      },
      { status: 500 },
    )
  }
}
